import requests
import sys
import json
from datetime import datetime

class AdminAgentUpdateTester:
    def __init__(self, base_url="https://agent-dashboard-81.preview.emergentagent.com"):
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

    def create_admin_user_if_not_exists(self):
        """Create admin user if it doesn't exist"""
        print("🔍 Checking if admin user exists...")
        
        # Try to login first
        try:
            response = requests.post(f"{self.api_url}/auth/login", json={
                "email": "admin@voiceai.com",
                "password": "admin123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data['token']
                print("✅ Admin user already exists and logged in successfully")
                return True
                
        except Exception as e:
            print(f"Login attempt failed: {e}")
        
        # If login failed, try to create admin user
        print("🔧 Creating admin user...")
        try:
            response = requests.post(f"{self.api_url}/auth/register", json={
                "email": "admin@voiceai.com",
                "name": "Admin User",
                "password": "admin123"
            })
            
            if response.status_code == 200:
                data = response.json()
                user_id = data['user']['id']
                
                # Need to manually set role to admin in database
                # For now, let's assume the user was created and try to login
                print("⚠️  User created but role needs to be set to 'admin' in database")
                print("Attempting login anyway...")
                
                login_response = requests.post(f"{self.api_url}/auth/login", json={
                    "email": "admin@voiceai.com",
                    "password": "admin123"
                })
                
                if login_response.status_code == 200:
                    login_data = login_response.json()
                    self.admin_token = login_data['token']
                    print("✅ Admin user created and logged in")
                    return True
                    
        except Exception as e:
            print(f"Failed to create admin user: {e}")
            
        return False

    def test_admin_login(self):
        """Test admin login"""
        print("🔐 Testing admin login...")
        try:
            response = requests.post(f"{self.api_url}/auth/login", json={
                "email": "admin@voiceai.com",
                "password": "admin123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data['token']
                self.log_test("Admin Login", True, "Successfully logged in")
                return True
            else:
                error_msg = f"Status: {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    error_msg += f", Response: {response.text[:100]}"
                
                self.log_test("Admin Login", False, error_msg)
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False

    def test_get_agents(self):
        """Test GET /api/agents - List agents"""
        print("📋 Testing GET /api/agents...")
        try:
            response = requests.get(f"{self.api_url}/agents")
            
            if response.status_code == 200:
                agents = response.json()
                self.agents = agents
                self.log_test("GET /api/agents", True, f"Found {len(agents)} agents")
                
                # Print agent details for reference
                if agents:
                    print("Available agents:")
                    for i, agent in enumerate(agents[:3]):  # Show first 3 agents
                        print(f"  {i+1}. {agent['name']} (ID: {agent['id']}, Price: ${agent['price']})")
                
                return True
            else:
                error_msg = f"Status: {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    error_msg += f", Response: {response.text[:100]}"
                
                self.log_test("GET /api/agents", False, error_msg)
                return False
                
        except Exception as e:
            self.log_test("GET /api/agents", False, f"Exception: {str(e)}")
            return False

    def test_update_agent(self):
        """Test PUT /api/admin/agents/{id} - Update agent price"""
        if not self.admin_token:
            self.log_test("PUT /api/admin/agents/{id}", False, "No admin token available")
            return False
            
        if not hasattr(self, 'agents') or not self.agents:
            self.log_test("PUT /api/admin/agents/{id}", False, "No agents available to update")
            return False
        
        # Get the first agent to update
        agent_to_update = self.agents[0]
        agent_id = agent_to_update['id']
        original_price = agent_to_update['price']
        new_price = original_price + 0.01
        
        print(f"🔧 Testing PUT /api/admin/agents/{agent_id}...")
        print(f"   Updating price from ${original_price} to ${new_price}")
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Prepare update data with all required fields
        update_data = {
            "name": agent_to_update['name'],
            "description": agent_to_update['description'],
            "segment": agent_to_update['segment'],
            "price": new_price,
            "features": agent_to_update['features'],
            "mascot_image_url": agent_to_update['mascot_image_url'],
            "elevenlabs_voice_id": agent_to_update['elevenlabs_voice_id'],
            "base_prompt": agent_to_update.get('base_prompt'),
            "voice_sample_url": agent_to_update.get('voice_sample_url'),
            "llm_provider": agent_to_update.get('llm_provider', 'openai'),
            "llm_model": agent_to_update.get('llm_model', 'gpt-5')
        }
        
        try:
            response = requests.put(
                f"{self.api_url}/admin/agents/{agent_id}",
                json=update_data,
                headers=headers
            )
            
            if response.status_code == 200:
                updated_agent = response.json()
                updated_price = updated_agent['price']
                
                if abs(updated_price - new_price) < 0.001:  # Float comparison
                    self.log_test("PUT /api/admin/agents/{id}", True, 
                                f"Successfully updated price from ${original_price} to ${updated_price}")
                    self.updated_agent_id = agent_id
                    self.original_price = original_price
                    self.new_price = updated_price
                    return True
                else:
                    self.log_test("PUT /api/admin/agents/{id}", False, 
                                f"Price not updated correctly. Expected: ${new_price}, Got: ${updated_price}")
                    return False
            else:
                error_msg = f"Status: {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    error_msg += f", Response: {response.text[:100]}"
                
                self.log_test("PUT /api/admin/agents/{id}", False, error_msg)
                return False
                
        except Exception as e:
            self.log_test("PUT /api/admin/agents/{id}", False, f"Exception: {str(e)}")
            return False

    def verify_update(self):
        """Verify that the update worked by fetching the agent again"""
        if not hasattr(self, 'updated_agent_id'):
            self.log_test("Verify Update", False, "No agent was updated")
            return False
            
        print(f"✅ Verifying update for agent {self.updated_agent_id}...")
        
        try:
            response = requests.get(f"{self.api_url}/agents/{self.updated_agent_id}")
            
            if response.status_code == 200:
                agent = response.json()
                current_price = agent['price']
                
                if abs(current_price - self.new_price) < 0.001:  # Float comparison
                    self.log_test("Verify Update", True, 
                                f"Update verified! Agent price is now ${current_price}")
                    return True
                else:
                    self.log_test("Verify Update", False, 
                                f"Update verification failed. Expected: ${self.new_price}, Got: ${current_price}")
                    return False
            else:
                error_msg = f"Status: {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    error_msg += f", Response: {response.text[:100]}"
                
                self.log_test("Verify Update", False, error_msg)
                return False
                
        except Exception as e:
            self.log_test("Verify Update", False, f"Exception: {str(e)}")
            return False

    def run_focused_tests(self):
        """Run focused admin agent update tests"""
        print("🚀 Starting Admin Agent Update Tests")
        print("=" * 50)
        
        # Step 1: Ensure admin user exists and login
        if not self.create_admin_user_if_not_exists():
            if not self.test_admin_login():
                print("❌ Cannot proceed without admin access")
                return 1
        
        # Step 2: Get list of agents
        if not self.test_get_agents():
            print("❌ Cannot proceed without agent list")
            return 1
            
        # Step 3: Update an agent (if available)
        if hasattr(self, 'agents') and self.agents:
            if not self.test_update_agent():
                print("❌ Agent update failed")
                return 1
                
            # Step 4: Verify the update worked
            if not self.verify_update():
                print("❌ Update verification failed")
                return 1
        else:
            print("⚠️  No agents available to test update functionality")
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All admin agent update tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = AdminAgentUpdateTester()
    return tester.run_focused_tests()

if __name__ == "__main__":
    sys.exit(main())