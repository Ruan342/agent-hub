import requests
import sys
import json
from datetime import datetime

class AdminUpdateAgentTester:
    def __init__(self, base_url="https://voicechatai-1.preview.emergentagent.com"):
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
        try:
            url = f"{self.api_url}/auth/login"
            response = requests.post(url, json={
                "email": "admin@voiceai.com",
                "password": "admin123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data['token']
                self.log_test("Admin Login", True, "Successfully logged in as admin")
                return True
            else:
                self.log_test("Admin Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False

    def get_agents_list(self):
        """Get list of agents"""
        try:
            url = f"{self.api_url}/agents"
            response = requests.get(url)
            
            if response.status_code == 200:
                agents = response.json()
                if agents:
                    self.agents = agents
                    self.log_test("GET /api/agents", True, f"Retrieved {len(agents)} agents")
                    return True
                else:
                    self.log_test("GET /api/agents", False, "No agents found")
                    return False
            else:
                self.log_test("GET /api/agents", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("GET /api/agents", False, f"Exception: {str(e)}")
            return False

    def get_agent_details(self, agent_id):
        """Get agent details including base_prompt"""
        try:
            url = f"{self.api_url}/agents/{agent_id}"
            response = requests.get(url)
            
            if response.status_code == 200:
                agent = response.json()
                self.log_test(f"GET /api/agents/{agent_id}", True, "Retrieved agent details")
                return agent
            else:
                self.log_test(f"GET /api/agents/{agent_id}", False, f"Status: {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test(f"GET /api/agents/{agent_id}", False, f"Exception: {str(e)}")
            return None

    def update_agent_price_only(self, agent_id, new_price):
        """Update only the agent price (without base_prompt in payload)"""
        try:
            url = f"{self.api_url}/admin/agents/{agent_id}"
            headers = {'Authorization': f'Bearer {self.admin_token}', 'Content-Type': 'application/json'}
            
            # CRITICAL: Only send price, do NOT include base_prompt
            payload = {"price": new_price}
            
            response = requests.put(url, json=payload, headers=headers)
            
            if response.status_code == 200:
                updated_agent = response.json()
                self.log_test(f"PUT /api/admin/agents/{agent_id} (price only)", True, f"Updated price to {new_price}")
                return updated_agent
            else:
                self.log_test(f"PUT /api/admin/agents/{agent_id} (price only)", False, f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_test(f"PUT /api/admin/agents/{agent_id} (price only)", False, f"Exception: {str(e)}")
            return None

    def update_agent_multiple_fields(self, agent_id, new_price, new_description):
        """Update multiple fields (without base_prompt in payload)"""
        try:
            url = f"{self.api_url}/admin/agents/{agent_id}"
            headers = {'Authorization': f'Bearer {self.admin_token}', 'Content-Type': 'application/json'}
            
            # CRITICAL: Only send price and description, do NOT include base_prompt
            payload = {
                "price": new_price,
                "description": new_description
            }
            
            response = requests.put(url, json=payload, headers=headers)
            
            if response.status_code == 200:
                updated_agent = response.json()
                self.log_test(f"PUT /api/admin/agents/{agent_id} (multiple fields)", True, f"Updated price to {new_price} and description")
                return updated_agent
            else:
                self.log_test(f"PUT /api/admin/agents/{agent_id} (multiple fields)", False, f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_test(f"PUT /api/admin/agents/{agent_id} (multiple fields)", False, f"Exception: {str(e)}")
            return None

    def test_base_prompt_preservation_bug_fix(self):
        """Test the specific bug fix for base_prompt preservation"""
        print("🔍 Testing Admin Update Agent - base_prompt Preservation Bug Fix")
        print("=" * 70)
        
        # Step 1: Login as admin
        if not self.admin_login():
            return False
        
        # Step 2: Get list of agents
        if not self.get_agents_list():
            return False
        
        # Step 3: Choose an agent to test (first one with base_prompt)
        test_agent = None
        for agent in self.agents:
            if agent.get('base_prompt'):
                test_agent = agent
                break
        
        if not test_agent:
            self.log_test("Find Agent with base_prompt", False, "No agent found with base_prompt")
            return False
        
        agent_id = test_agent['id']
        original_base_prompt = test_agent['base_prompt']
        original_price = test_agent['price']
        original_description = test_agent['description']
        
        print(f"\n📋 Selected Agent: {test_agent['name']} (ID: {agent_id})")
        print(f"📝 Original base_prompt: {original_base_prompt[:100]}..." if len(original_base_prompt) > 100 else f"📝 Original base_prompt: {original_base_prompt}")
        print(f"💰 Original price: ${original_price}")
        print(f"📄 Original description: {original_description[:50]}..." if len(original_description) > 50 else f"📄 Original description: {original_description}")
        
        # Step 4: Get full agent details to confirm base_prompt
        agent_details = self.get_agent_details(agent_id)
        if not agent_details:
            return False
        
        if agent_details.get('base_prompt') != original_base_prompt:
            self.log_test("Verify Original base_prompt", False, "base_prompt mismatch in detailed view")
            return False
        else:
            self.log_test("Verify Original base_prompt", True, "base_prompt confirmed in detailed view")
        
        # Step 5: Update ONLY the price (critical test)
        print(f"\n🔧 TEST 1: Updating ONLY price from ${original_price} to $150.00")
        updated_agent = self.update_agent_price_only(agent_id, 150.00)
        if not updated_agent:
            return False
        
        # Step 6: Verify base_prompt is preserved after price update
        agent_after_price_update = self.get_agent_details(agent_id)
        if not agent_after_price_update:
            return False
        
        if agent_after_price_update.get('base_prompt') != original_base_prompt:
            self.log_test("🚨 CRITICAL: base_prompt Preserved After Price Update", False, 
                         f"base_prompt was overwritten! Original: '{original_base_prompt[:50]}...', Now: '{agent_after_price_update.get('base_prompt', 'None')}'")
            return False
        else:
            self.log_test("✅ base_prompt Preserved After Price Update", True, "base_prompt remains intact")
        
        # Verify price was actually updated
        if agent_after_price_update.get('price') != 150.00:
            self.log_test("Price Update Verification", False, f"Price not updated correctly. Expected: 150.00, Got: {agent_after_price_update.get('price')}")
            return False
        else:
            self.log_test("Price Update Verification", True, "Price updated correctly to $150.00")
        
        # Step 7: Update multiple fields (price + description)
        print(f"\n🔧 TEST 2: Updating price to $97.00 AND description")
        new_description = "Nova descrição teste"
        updated_agent_multi = self.update_agent_multiple_fields(agent_id, 97.00, new_description)
        if not updated_agent_multi:
            return False
        
        # Step 8: Verify base_prompt is still preserved after multiple field update
        agent_after_multi_update = self.get_agent_details(agent_id)
        if not agent_after_multi_update:
            return False
        
        if agent_after_multi_update.get('base_prompt') != original_base_prompt:
            self.log_test("🚨 CRITICAL: base_prompt Preserved After Multi-Field Update", False, 
                         f"base_prompt was overwritten! Original: '{original_base_prompt[:50]}...', Now: '{agent_after_multi_update.get('base_prompt', 'None')}'")
            return False
        else:
            self.log_test("✅ base_prompt Preserved After Multi-Field Update", True, "base_prompt remains intact")
        
        # Verify both fields were updated
        if agent_after_multi_update.get('price') != 97.00:
            self.log_test("Multi-Field Price Update Verification", False, f"Price not updated correctly. Expected: 97.00, Got: {agent_after_multi_update.get('price')}")
            return False
        else:
            self.log_test("Multi-Field Price Update Verification", True, "Price updated correctly to $97.00")
        
        if agent_after_multi_update.get('description') != new_description:
            self.log_test("Multi-Field Description Update Verification", False, f"Description not updated correctly. Expected: '{new_description}', Got: '{agent_after_multi_update.get('description')}'")
            return False
        else:
            self.log_test("Multi-Field Description Update Verification", True, "Description updated correctly")
        
        # Step 9: Restore original values (cleanup)
        print(f"\n🧹 CLEANUP: Restoring original values")
        restore_payload = {
            "price": original_price,
            "description": original_description
        }
        
        try:
            url = f"{self.api_url}/admin/agents/{agent_id}"
            headers = {'Authorization': f'Bearer {self.admin_token}', 'Content-Type': 'application/json'}
            response = requests.put(url, json=restore_payload, headers=headers)
            
            if response.status_code == 200:
                self.log_test("Cleanup - Restore Original Values", True, "Original values restored")
            else:
                self.log_test("Cleanup - Restore Original Values", False, f"Failed to restore: {response.status_code}")
        except Exception as e:
            self.log_test("Cleanup - Restore Original Values", False, f"Exception: {str(e)}")
        
        return True

    def run_test(self):
        """Run the focused test"""
        success = self.test_base_prompt_preservation_bug_fix()
        
        # Print results
        print("\n" + "=" * 70)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run}")
        
        if success and self.tests_passed == self.tests_run:
            print("🎉 BUG FIX VERIFIED: base_prompt preservation is working correctly!")
            return 0
        else:
            print(f"❌ BUG STILL EXISTS: {self.tests_run - self.tests_passed} tests failed")
            print("🚨 The base_prompt overwrite bug has NOT been fixed!")
            return 1

def main():
    tester = AdminUpdateAgentTester()
    return tester.run_test()

if __name__ == "__main__":
    sys.exit(main())