import requests
import sys
import json

class FocusedBackendTester:
    def __init__(self):
        # Use the REACT_APP_BACKEND_URL from frontend/.env
        self.base_url = "https://agent-dashboard-81.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
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

    def validate_agent_fields(self, agent, agent_context=""):
        """Validate that agent has required fields"""
        required_fields = ['name', 'description', 'features', 'segment', 'price']
        missing_fields = []
        
        for field in required_fields:
            if field not in agent or agent[field] is None:
                missing_fields.append(field)
        
        if missing_fields:
            return False, f"Missing required fields in {agent_context}: {', '.join(missing_fields)}"
        
        # Additional validation
        if not isinstance(agent['features'], list):
            return False, f"Features should be a list in {agent_context}"
        
        if not isinstance(agent['price'], (int, float)):
            return False, f"Price should be a number in {agent_context}"
            
        return True, "All required fields present"

    def test_get_agents(self):
        """Test GET /api/agents - Verify if it lists the agents"""
        try:
            url = f"{self.api_url}/agents"
            response = requests.get(url)
            
            if response.status_code != 200:
                self.log_test("GET /api/agents", False, f"Status: {response.status_code}, Expected: 200")
                return False
            
            try:
                agents = response.json()
            except json.JSONDecodeError:
                self.log_test("GET /api/agents", False, "Invalid JSON response")
                return False
            
            if not isinstance(agents, list):
                self.log_test("GET /api/agents", False, "Response should be a list")
                return False
            
            if len(agents) == 0:
                self.log_test("GET /api/agents", False, "No agents returned")
                return False
            
            # Validate first agent has required fields
            valid, validation_msg = self.validate_agent_fields(agents[0], "first agent")
            if not valid:
                self.log_test("GET /api/agents", False, validation_msg)
                return False
            
            # Store first agent ID for next test
            self.test_agent_id = agents[0]['id']
            
            self.log_test("GET /api/agents", True, f"Returned {len(agents)} agents with required fields")
            return True
            
        except Exception as e:
            self.log_test("GET /api/agents", False, f"Exception: {str(e)}")
            return False

    def test_get_single_agent(self):
        """Test GET /api/agents/{id} - Verify if it returns details of a specific agent"""
        if not hasattr(self, 'test_agent_id'):
            self.log_test("GET /api/agents/{id}", False, "No agent ID available from previous test")
            return False
        
        try:
            url = f"{self.api_url}/agents/{self.test_agent_id}"
            response = requests.get(url)
            
            if response.status_code != 200:
                self.log_test("GET /api/agents/{id}", False, f"Status: {response.status_code}, Expected: 200")
                return False
            
            try:
                agent = response.json()
            except json.JSONDecodeError:
                self.log_test("GET /api/agents/{id}", False, "Invalid JSON response")
                return False
            
            if not isinstance(agent, dict):
                self.log_test("GET /api/agents/{id}", False, "Response should be an object")
                return False
            
            # Validate agent has required fields
            valid, validation_msg = self.validate_agent_fields(agent, f"agent {self.test_agent_id}")
            if not valid:
                self.log_test("GET /api/agents/{id}", False, validation_msg)
                return False
            
            # Verify it's the correct agent
            if agent['id'] != self.test_agent_id:
                self.log_test("GET /api/agents/{id}", False, f"Returned wrong agent ID: {agent['id']} vs {self.test_agent_id}")
                return False
            
            self.log_test("GET /api/agents/{id}", True, f"Returned agent details with required fields")
            return True
            
        except Exception as e:
            self.log_test("GET /api/agents/{id}", False, f"Exception: {str(e)}")
            return False

    def run_focused_tests(self):
        """Run only the 2 requested endpoint tests"""
        print("🚀 Starting Focused Backend Tests")
        print("Testing only the 2 requested endpoints:")
        print("1. GET /api/agents")
        print("2. GET /api/agents/{id}")
        print("=" * 50)
        
        # Test the 2 specific endpoints
        self.test_get_agents()
        self.test_get_single_agent()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All requested tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = FocusedBackendTester()
    return tester.run_focused_tests()

if __name__ == "__main__":
    sys.exit(main())