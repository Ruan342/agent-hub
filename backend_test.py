import requests
import sys
import json
from datetime import datetime

class VoiceAIPlatformTester:
    def __init__(self, base_url="https://voice-chat-ai-13.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.user_token = None
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

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.text else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@voiceai.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            return True
        return False

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = {
            "name": f"Test User {timestamp}",
            "email": f"testuser{timestamp}@example.com",
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        if success and 'token' in response:
            self.user_token = response['token']
            self.test_user_email = test_user['email']
            return True
        return False

    def test_user_login(self):
        """Test user login with registered user"""
        if not hasattr(self, 'test_user_email'):
            self.log_test("User Login", False, "No test user registered")
            return False
            
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": self.test_user_email, "password": "testpass123"}
        )
        return success

    def test_get_agents(self):
        """Test getting all agents"""
        success, response = self.run_test(
            "Get All Agents",
            "GET",
            "agents",
            200
        )
        if success:
            self.agents = response
        return success

    def test_get_agents_by_segment(self):
        """Test filtering agents by segment"""
        success, response = self.run_test(
            "Get Agents by Segment",
            "GET",
            "agents?segment=vendas",
            200
        )
        return success

    def test_get_single_agent(self):
        """Test getting a single agent"""
        if not hasattr(self, 'agents') or not self.agents:
            self.log_test("Get Single Agent", False, "No agents available")
            return False
            
        agent_id = self.agents[0]['id']
        success, response = self.run_test(
            "Get Single Agent",
            "GET",
            f"agents/{agent_id}",
            200
        )
        if success:
            self.test_agent_id = agent_id
        return success

    def test_create_agent_request(self):
        """Test creating an agent request (requires auth)"""
        if not self.user_token:
            self.log_test("Create Agent Request", False, "No user token")
            return False
            
        headers = {'Authorization': f'Bearer {self.user_token}'}
        success, response = self.run_test(
            "Create Agent Request",
            "POST",
            "agent-requests",
            200,
            data={
                "segment": "test-segment",
                "description": "Test agent request description"
            },
            headers=headers
        )
        return success

    def test_get_my_requests(self):
        """Test getting user's agent requests"""
        if not self.user_token:
            self.log_test("Get My Requests", False, "No user token")
            return False
            
        headers = {'Authorization': f'Bearer {self.user_token}'}
        success, response = self.run_test(
            "Get My Agent Requests",
            "GET",
            "agent-requests/my",
            200,
            headers=headers
        )
        return success

    def test_get_my_subscriptions(self):
        """Test getting user's subscriptions"""
        if not self.user_token:
            self.log_test("Get My Subscriptions", False, "No user token")
            return False
            
        headers = {'Authorization': f'Bearer {self.user_token}'}
        success, response = self.run_test(
            "Get My Subscriptions",
            "GET",
            "subscriptions/my",
            200,
            headers=headers
        )
        return success

    def test_checkout_creation(self):
        """Test creating checkout session"""
        if not self.user_token or not hasattr(self, 'test_agent_id'):
            self.log_test("Create Checkout", False, "Missing user token or agent ID")
            return False
            
        headers = {'Authorization': f'Bearer {self.user_token}'}
        success, response = self.run_test(
            "Create Checkout Session",
            "POST",
            "subscriptions/checkout",
            200,
            data={
                "agent_id": self.test_agent_id,
                "origin_url": self.base_url
            },
            headers=headers
        )
        if success and 'session_id' in response:
            self.test_session_id = response['session_id']
        return success

    def test_checkout_status(self):
        """Test getting checkout status"""
        if not self.user_token or not hasattr(self, 'test_session_id'):
            self.log_test("Get Checkout Status", False, "Missing user token or session ID")
            return False
            
        headers = {'Authorization': f'Bearer {self.user_token}'}
        success, response = self.run_test(
            "Get Checkout Status",
            "GET",
            f"subscriptions/checkout/status/{self.test_session_id}",
            200,
            headers=headers
        )
        return success

    def test_admin_create_agent(self):
        """Test admin creating an agent"""
        if not self.admin_token:
            self.log_test("Admin Create Agent", False, "No admin token")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        timestamp = datetime.now().strftime('%H%M%S')
        success, response = self.run_test(
            "Admin Create Agent",
            "POST",
            "admin/agents",
            200,
            data={
                "name": f"Test Agent {timestamp}",
                "description": "Test agent description",
                "segment": "test",
                "price": 29.99,
                "features": ["Feature 1", "Feature 2"],
                "mascot_image_url": "https://via.placeholder.com/256",
                "elevenlabs_voice_id": "test_voice_id"
            },
            headers=headers
        )
        if success:
            self.created_agent_id = response.get('id')
        return success

    def test_admin_get_requests(self):
        """Test admin getting all agent requests"""
        if not self.admin_token:
            self.log_test("Admin Get Requests", False, "No admin token")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Admin Get All Requests",
            "GET",
            "admin/agent-requests",
            200,
            headers=headers
        )
        return success

    def test_admin_delete_agent(self):
        """Test admin deleting an agent"""
        if not self.admin_token or not hasattr(self, 'created_agent_id'):
            self.log_test("Admin Delete Agent", False, "Missing admin token or created agent ID")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Admin Delete Agent",
            "DELETE",
            f"admin/agents/{self.created_agent_id}",
            200,
            headers=headers
        )
        return success

    def test_admin_duplicate_agent(self):
        """Test admin duplicating an agent"""
        if not self.admin_token:
            self.log_test("Admin Duplicate Agent", False, "No admin token")
            return False
            
        # First, get list of agents to find one to duplicate
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        agents_success, agents_response = self.run_test(
            "Get Agents for Duplication",
            "GET",
            "agents",
            200
        )
        
        if not agents_success or not agents_response:
            self.log_test("Admin Duplicate Agent", False, "Could not get agents list")
            return False
            
        # Use the first available agent
        original_agent = agents_response[0]
        original_agent_id = original_agent['id']
        original_name = original_agent['name']
        
        # Test duplicating the agent
        success, response = self.run_test(
            "Admin Duplicate Agent",
            "POST",
            f"admin/duplicate-agent/{original_agent_id}",
            200,
            headers=headers
        )
        
        if success:
            # Verify the duplicated agent has correct properties
            duplicated_agent = response
            
            # Check that ID is different
            if duplicated_agent['id'] == original_agent_id:
                self.log_test("Duplicate Agent ID Check", False, "Duplicated agent has same ID as original")
                return False
            else:
                self.log_test("Duplicate Agent ID Check", True, "New unique ID generated")
            
            # Check that name has "(Cópia)" prefix
            expected_name = f"(Cópia) {original_name}"
            if duplicated_agent['name'] != expected_name:
                self.log_test("Duplicate Agent Name Check", False, f"Expected '{expected_name}', got '{duplicated_agent['name']}'")
                return False
            else:
                self.log_test("Duplicate Agent Name Check", True, "Name has correct '(Cópia)' prefix")
            
            # Check that other properties are copied correctly
            properties_to_check = ['description', 'segment', 'price', 'features', 'elevenlabs_voice_id', 'llm_provider', 'llm_model']
            all_properties_match = True
            
            for prop in properties_to_check:
                if duplicated_agent.get(prop) != original_agent.get(prop):
                    self.log_test(f"Duplicate Agent {prop} Check", False, f"Property {prop} not copied correctly")
                    all_properties_match = False
                    break
            
            if all_properties_match:
                self.log_test("Duplicate Agent Properties Check", True, "All properties copied correctly")
            
            # Check that created_at is different (newer)
            if duplicated_agent.get('created_at') == original_agent.get('created_at'):
                self.log_test("Duplicate Agent Created At Check", False, "Created at timestamp should be different")
            else:
                self.log_test("Duplicate Agent Created At Check", True, "New created_at timestamp generated")
            
            # Store duplicated agent ID for cleanup
            self.duplicated_agent_id = duplicated_agent['id']
            
            # Verify the duplicated agent appears in agents list
            verify_success, verify_response = self.run_test(
                "Verify Duplicated Agent in List",
                "GET",
                "agents",
                200
            )
            
            if verify_success:
                agent_found = any(agent['id'] == duplicated_agent['id'] for agent in verify_response)
                if agent_found:
                    self.log_test("Duplicated Agent in List Check", True, "Duplicated agent found in agents list")
                else:
                    self.log_test("Duplicated Agent in List Check", False, "Duplicated agent not found in agents list")
            
            return True
        
        return False

    def test_admin_duplicate_nonexistent_agent(self):
        """Test admin duplicating a non-existent agent (error handling)"""
        if not self.admin_token:
            self.log_test("Admin Duplicate Nonexistent Agent", False, "No admin token")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        fake_agent_id = "nonexistent-agent-id-12345"
        
        success, response = self.run_test(
            "Admin Duplicate Nonexistent Agent",
            "POST",
            f"admin/duplicate-agent/{fake_agent_id}",
            404,  # Expecting 404 error
            headers=headers
        )
        
        return success

    def cleanup_duplicated_agent(self):
        """Clean up the duplicated agent created during testing"""
        if hasattr(self, 'duplicated_agent_id') and self.admin_token:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            try:
                url = f"{self.api_url}/admin/agents/{self.duplicated_agent_id}"
                response = requests.delete(url, headers=headers)
                if response.status_code == 200:
                    print(f"🧹 Cleaned up duplicated agent: {self.duplicated_agent_id}")
            except Exception as e:
                print(f"⚠️ Could not clean up duplicated agent: {str(e)}")

    def test_tts_test_endpoint(self):
        """Test public TTS test endpoint"""
        # Use a real ElevenLabs voice ID
        voice_id = "2EiwWnXFnvU5JabPnv8n"  # Clyde voice from ElevenLabs
        success, response = self.run_test(
            "TTS Test Endpoint",
            "POST",
            "tts/test",
            200,
            data={
                "text": "Hello, this is a test message",
                "voice_id": voice_id,
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True
            }
        )
        if success:
            self.test_voice_id = voice_id
        return success

    def test_tts_remaining_tests(self):
        """Test TTS remaining tests endpoint"""
        voice_id = getattr(self, 'test_voice_id', '2EiwWnXFnvU5JabPnv8n')
        success, response = self.run_test(
            "TTS Remaining Tests",
            "GET",
            f"tts/test/remaining/{voice_id}",
            200
        )
        return success

    def test_billing_invoices(self):
        """Test getting billing invoices"""
        if not self.user_token:
            self.log_test("Get Billing Invoices", False, "No user token")
            return False
            
        headers = {'Authorization': f'Bearer {self.user_token}'}
        success, response = self.run_test(
            "Get Billing Invoices",
            "GET",
            "billing/invoices",
            200,
            headers=headers
        )
        return success

    def test_admin_upload_image(self):
        """Test admin image upload endpoint"""
        if not self.admin_token:
            self.log_test("Admin Upload Image", False, "No admin token")
            return False
            
        # Create a simple test image file in memory
        import io
        from PIL import Image
        
        # Create a small test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            url = f"{self.api_url}/admin/upload-image"
            files = {'file': ('test.png', img_bytes, 'image/png')}
            response = requests.post(url, files=files, headers=headers)
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: 200"
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"
            
            self.log_test("Admin Upload Image", success, details)
            return success
            
        except Exception as e:
            self.log_test("Admin Upload Image", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting VoiceAI Platform Backend Tests")
        print("=" * 50)
        
        # Authentication tests
        print("\n📝 Authentication Tests")
        self.test_admin_login()
        self.test_user_registration()
        self.test_user_login()
        
        # Public API tests
        print("\n🌐 Public API Tests")
        self.test_get_agents()
        self.test_get_agents_by_segment()
        self.test_get_single_agent()
        
        # User authenticated tests
        print("\n👤 User Authenticated Tests")
        self.test_create_agent_request()
        self.test_get_my_requests()
        self.test_get_my_subscriptions()
        self.test_checkout_creation()
        self.test_checkout_status()
        
        # Admin tests
        print("\n🔧 Admin Tests")
        self.test_admin_create_agent()
        self.test_admin_get_requests()
        self.test_admin_upload_image()
        self.test_admin_duplicate_agent()
        self.test_admin_duplicate_nonexistent_agent()
        self.test_admin_delete_agent()
        
        # TTS tests
        print("\n🎤 TTS Tests")
        self.test_tts_test_endpoint()
        self.test_tts_remaining_tests()
        
        # Billing tests
        print("\n💳 Billing Tests")
        self.test_billing_invoices()
        
        # Cleanup
        print("\n🧹 Cleanup")
        self.cleanup_duplicated_agent()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = VoiceAIPlatformTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())