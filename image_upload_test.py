import requests
import sys
import json
import io
from PIL import Image
from datetime import datetime

class ImageUploadFlowTester:
    def __init__(self, base_url="https://voice-chat-ai-13.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def admin_login(self):
        """Login as admin"""
        print("🔐 Step 1: Admin Login")
        try:
            url = f"{self.api_url}/auth/login"
            data = {"email": "admin@voiceai.com", "password": "admin123"}
            response = requests.post(url, json=data)
            
            if response.status_code == 200:
                result = response.json()
                if 'token' in result:
                    self.admin_token = result['token']
                    self.log_test("Admin Login", True, f"Token received: {self.admin_token[:20]}...")
                    return True
                else:
                    self.log_test("Admin Login", False, "No token in response")
                    return False
            else:
                self.log_test("Admin Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False

    def get_first_agent(self):
        """Get the first agent and save the ID"""
        print("📋 Step 2: Get First Agent")
        try:
            url = f"{self.api_url}/agents"
            response = requests.get(url)
            
            if response.status_code == 200:
                agents = response.json()
                if agents and len(agents) > 0:
                    self.agent_id = agents[0]['id']
                    self.original_agent = agents[0]
                    print(f"   Agent ID: {self.agent_id}")
                    print(f"   Agent Name: {agents[0]['name']}")
                    print(f"   Current mascot_image_url: {agents[0].get('mascot_image_url', 'None')}")
                    self.log_test("Get First Agent", True, f"Agent ID: {self.agent_id}")
                    return True
                else:
                    self.log_test("Get First Agent", False, "No agents found")
                    return False
            else:
                self.log_test("Get First Agent", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Get First Agent", False, f"Exception: {str(e)}")
            return False

    def upload_test_image(self):
        """Upload a small test image"""
        print("📤 Step 3: Upload Test Image")
        try:
            # Create a small 1x1 pixel PNG image
            img = Image.new('RGB', (1, 1), color='blue')
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')
            img_bytes.seek(0)
            
            url = f"{self.api_url}/admin/upload-image"
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            files = {'file': ('test_1x1.png', img_bytes, 'image/png')}
            
            response = requests.post(url, files=files, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if 'url' in result:
                    self.uploaded_image_url = result['url']
                    print(f"   Uploaded Image URL: {self.uploaded_image_url}")
                    self.log_test("Upload Test Image", True, f"URL: {self.uploaded_image_url}")
                    return True
                else:
                    self.log_test("Upload Test Image", False, "No URL in response")
                    return False
            else:
                self.log_test("Upload Test Image", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Upload Test Image", False, f"Exception: {str(e)}")
            return False

    def update_agent_with_image(self):
        """Update the agent with the uploaded image URL"""
        print("🔄 Step 4: Update Agent with Image URL")
        try:
            url = f"{self.api_url}/admin/agents/{self.agent_id}"
            headers = {
                'Authorization': f'Bearer {self.admin_token}',
                'Content-Type': 'application/json'
            }
            
            # Prepare update data with the new image URL
            update_data = {
                "name": self.original_agent['name'],
                "description": self.original_agent['description'],
                "segment": self.original_agent['segment'],
                "price": self.original_agent['price'],
                "features": self.original_agent['features'],
                "mascot_image_url": self.uploaded_image_url,  # This is the key field we're testing
                "elevenlabs_voice_id": self.original_agent['elevenlabs_voice_id'],
                "base_prompt": self.original_agent.get('base_prompt'),
                "voice_sample_url": self.original_agent.get('voice_sample_url'),
                "llm_provider": self.original_agent.get('llm_provider', 'openai'),
                "llm_model": self.original_agent.get('llm_model', 'gpt-5')
            }
            
            print(f"   Sending mascot_image_url: {self.uploaded_image_url}")
            
            response = requests.put(url, json=update_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                updated_image_url = result.get('mascot_image_url')
                print(f"   Response mascot_image_url: {updated_image_url}")
                
                if updated_image_url == self.uploaded_image_url:
                    self.log_test("Update Agent with Image", True, f"Image URL updated successfully")
                    return True
                else:
                    self.log_test("Update Agent with Image", False, f"Image URL mismatch. Expected: {self.uploaded_image_url}, Got: {updated_image_url}")
                    return False
            else:
                self.log_test("Update Agent with Image", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Update Agent with Image", False, f"Exception: {str(e)}")
            return False

    def verify_agent_image_persisted(self):
        """Verify the image URL was saved correctly in the database"""
        print("✅ Step 5: Verify Image URL Persisted in Database")
        try:
            url = f"{self.api_url}/agents/{self.agent_id}"
            response = requests.get(url)
            
            if response.status_code == 200:
                agent = response.json()
                saved_image_url = agent.get('mascot_image_url')
                
                print(f"   Database mascot_image_url: {saved_image_url}")
                print(f"   Expected mascot_image_url: {self.uploaded_image_url}")
                
                if saved_image_url == self.uploaded_image_url:
                    self.log_test("Verify Image URL Persisted", True, "Image URL correctly saved in database")
                    return True
                else:
                    self.log_test("Verify Image URL Persisted", False, f"Image URL not persisted. Expected: {self.uploaded_image_url}, Got: {saved_image_url}")
                    return False
            else:
                self.log_test("Verify Image URL Persisted", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Verify Image URL Persisted", False, f"Exception: {str(e)}")
            return False

    def show_before_after_comparison(self):
        """Show before and after comparison"""
        print("\n📊 BEFORE vs AFTER Comparison:")
        print("=" * 50)
        print(f"BEFORE - Original mascot_image_url: {self.original_agent.get('mascot_image_url', 'None')}")
        print(f"AFTER  - Updated mascot_image_url:  {getattr(self, 'uploaded_image_url', 'Failed to upload')}")
        print("=" * 50)

    def run_complete_flow_test(self):
        """Run the complete image upload and agent update flow test"""
        print("🚀 Starting Complete Image Upload Flow Test")
        print("=" * 60)
        print("Testing: Upload image → Update agent → Verify persistence")
        print("=" * 60)
        
        # Step 1: Admin login
        if not self.admin_login():
            print("❌ Cannot proceed without admin login")
            return False
        
        # Step 2: Get first agent
        if not self.get_first_agent():
            print("❌ Cannot proceed without agent to test")
            return False
        
        # Step 3: Upload test image
        if not self.upload_test_image():
            print("❌ Cannot proceed without uploaded image")
            return False
        
        # Step 4: Update agent with image URL
        if not self.update_agent_with_image():
            print("❌ Agent update failed")
            return False
        
        # Step 5: Verify persistence
        if not self.verify_agent_image_persisted():
            print("❌ Image URL not persisted in database")
            return False
        
        # Show comparison
        self.show_before_after_comparison()
        
        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 Flow Test Results: {self.tests_passed}/{self.tests_run} steps passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 Complete Image Upload Flow Test PASSED!")
            print("✅ Image upload, agent update, and persistence all working correctly")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} steps failed")
            print("❌ Image upload flow has issues that need to be addressed")
            return False

def main():
    tester = ImageUploadFlowTester()
    success = tester.run_complete_flow_test()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())