import requests
import sys
import json
from datetime import datetime

class DatabaseMigrationTester:
    def __init__(self, base_url="https://voice-chat-ai-13.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.agents = []

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

    def test_agents_count(self):
        """Test that exactly 23 agents exist"""
        success, response = self.run_test(
            "Get All Agents",
            "GET",
            "agents",
            200
        )
        
        if success:
            self.agents = response
            agent_count = len(response)
            
            if agent_count == 23:
                self.log_test("Agent Count Validation", True, f"Found exactly 23 agents")
                return True
            else:
                self.log_test("Agent Count Validation", False, f"Expected 23 agents, found {agent_count}")
                return False
        return False

    def test_agents_required_fields(self):
        """Test that all agents have required fields"""
        if not self.agents:
            self.log_test("Agent Required Fields", False, "No agents data available")
            return False

        required_fields = ['name', 'description', 'segment', 'price', 'base_prompt']
        all_valid = True
        missing_fields_count = 0

        for i, agent in enumerate(self.agents):
            agent_missing_fields = []
            for field in required_fields:
                if field not in agent or agent[field] is None or agent[field] == "":
                    agent_missing_fields.append(field)
            
            if agent_missing_fields:
                all_valid = False
                missing_fields_count += 1
                print(f"   ⚠️ Agent '{agent.get('name', 'Unknown')}' missing: {', '.join(agent_missing_fields)}")

        if all_valid:
            self.log_test("Agent Required Fields", True, "All agents have required fields")
            return True
        else:
            self.log_test("Agent Required Fields", False, f"{missing_fields_count} agents missing required fields")
            return False

    def test_agents_segments(self):
        """Test that agents are organized in expected segments"""
        if not self.agents:
            self.log_test("Agent Segments", False, "No agents data available")
            return False

        # Expected segments and their counts based on the review request
        expected_segments = {
            "Vendas & Receita": 5,
            "Atendimento, Agenda & Operações": 5,
            "Produtividade Executiva & E-mail": 3,
            "Finanças": 3,
            "Marketing & Inteligência": 3,
            "Pessoas, RH & Jurídico": 2,
            "Saúde, Bem-estar, Fitness & Lifestyle": 2
        }

        # Count agents by segment
        segment_counts = {}
        for agent in self.agents:
            segment = agent.get('segment', 'Unknown')
            segment_counts[segment] = segment_counts.get(segment, 0) + 1

        print(f"   📊 Found segments: {segment_counts}")

        all_segments_correct = True
        for expected_segment, expected_count in expected_segments.items():
            actual_count = segment_counts.get(expected_segment, 0)
            if actual_count != expected_count:
                all_segments_correct = False
                print(f"   ❌ Segment '{expected_segment}': expected {expected_count}, found {actual_count}")
            else:
                print(f"   ✅ Segment '{expected_segment}': {actual_count} agents")

        # Check for unexpected segments
        for segment, count in segment_counts.items():
            if segment not in expected_segments:
                all_segments_correct = False
                print(f"   ⚠️ Unexpected segment '{segment}': {count} agents")

        if all_segments_correct:
            self.log_test("Agent Segments", True, "All segments have correct agent counts")
            return True
        else:
            self.log_test("Agent Segments", False, "Segment counts don't match expected values")
            return False

    def test_segment_filtering(self):
        """Test filtering agents by specific segments"""
        test_segments = [
            ("Vendas & Receita", 5),
            ("Finanças", 3),
            ("Marketing & Inteligência", 3)
        ]

        all_filters_work = True
        for segment, expected_count in test_segments:
            success, response = self.run_test(
                f"Filter by '{segment}'",
                "GET",
                f"agents?segment={requests.utils.quote(segment)}",
                200
            )
            
            if success:
                actual_count = len(response)
                if actual_count == expected_count:
                    print(f"   ✅ Segment '{segment}': {actual_count} agents")
                else:
                    all_filters_work = False
                    print(f"   ❌ Segment '{segment}': expected {expected_count}, got {actual_count}")
            else:
                all_filters_work = False

        return all_filters_work

    def test_agent_details(self):
        """Test getting details for individual agents"""
        if not self.agents:
            self.log_test("Agent Details", False, "No agents data available")
            return False

        # Test first 3 agents
        test_agents = self.agents[:3]
        all_details_work = True

        for agent in test_agents:
            agent_id = agent['id']
            success, response = self.run_test(
                f"Get Agent Details ({agent['name'][:20]}...)",
                "GET",
                f"agents/{agent_id}",
                200
            )
            
            if success:
                # Verify the response has the same required fields
                required_fields = ['name', 'description', 'segment', 'price', 'base_prompt']
                missing_fields = []
                for field in required_fields:
                    if field not in response or response[field] is None:
                        missing_fields.append(field)
                
                if missing_fields:
                    all_details_work = False
                    print(f"   ❌ Agent {agent_id} missing fields: {', '.join(missing_fields)}")
            else:
                all_details_work = False

        if all_details_work:
            self.log_test("Agent Details", True, "All agent details endpoints working")
            return True
        else:
            self.log_test("Agent Details", False, "Some agent details endpoints failed")
            return False

    def test_admin_update_agent(self):
        """Test that admin can still update agents after migration"""
        if not self.admin_token or not self.agents:
            self.log_test("Admin Update Agent", False, "Missing admin token or agents data")
            return False

        # Use the first agent for testing
        test_agent = self.agents[0]
        agent_id = test_agent['id']
        original_price = test_agent['price']
        new_price = original_price + 1.00  # Increase price by $1

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Update the agent
        update_data = {
            "name": test_agent['name'],
            "description": test_agent['description'],
            "segment": test_agent['segment'],
            "price": new_price,
            "features": test_agent['features'],
            "mascot_image_url": test_agent['mascot_image_url'],
            "elevenlabs_voice_id": test_agent['elevenlabs_voice_id']
        }

        success, response = self.run_test(
            "Admin Update Agent Price",
            "PUT",
            f"admin/agents/{agent_id}",
            200,
            data=update_data,
            headers=headers
        )

        if success:
            # Verify the update persisted
            verify_success, verify_response = self.run_test(
                "Verify Agent Update",
                "GET",
                f"agents/{agent_id}",
                200
            )
            
            if verify_success and verify_response.get('price') == new_price:
                # Verify base_prompt was NOT overwritten
                if verify_response.get('base_prompt') == test_agent.get('base_prompt'):
                    self.log_test("Admin Update Preserves base_prompt", True, "base_prompt preserved during update")
                    
                    # Restore original price
                    update_data['price'] = original_price
                    self.run_test(
                        "Restore Original Price",
                        "PUT",
                        f"admin/agents/{agent_id}",
                        200,
                        data=update_data,
                        headers=headers
                    )
                    return True
                else:
                    self.log_test("Admin Update Preserves base_prompt", False, "base_prompt was overwritten")
                    return False
            else:
                self.log_test("Admin Update Agent", False, "Price update did not persist")
                return False
        
        return False

    def test_admin_duplicate_agent(self):
        """Test duplicating one of the new agents"""
        if not self.admin_token or not self.agents:
            self.log_test("Admin Duplicate Agent", False, "Missing admin token or agents data")
            return False

        # Use the first agent for duplication
        original_agent = self.agents[0]
        original_agent_id = original_agent['id']
        original_name = original_agent['name']

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        success, response = self.run_test(
            "Admin Duplicate New Agent",
            "POST",
            f"admin/duplicate-agent/{original_agent_id}",
            200,
            headers=headers
        )

        if success:
            duplicated_agent = response
            
            # Verify duplication properties
            checks_passed = 0
            total_checks = 4

            # Check 1: Different ID
            if duplicated_agent['id'] != original_agent_id:
                print(f"   ✅ New unique ID generated")
                checks_passed += 1
            else:
                print(f"   ❌ Same ID as original")

            # Check 2: Name has "(Cópia)" prefix
            expected_name = f"(Cópia) {original_name}"
            if duplicated_agent['name'] == expected_name:
                print(f"   ✅ Name has correct '(Cópia)' prefix")
                checks_passed += 1
            else:
                print(f"   ❌ Expected '{expected_name}', got '{duplicated_agent['name']}'")

            # Check 3: base_prompt copied correctly
            if duplicated_agent.get('base_prompt') == original_agent.get('base_prompt'):
                print(f"   ✅ base_prompt copied correctly")
                checks_passed += 1
            else:
                print(f"   ❌ base_prompt not copied correctly")

            # Check 4: Other properties copied
            properties_to_check = ['description', 'segment', 'price', 'features']
            properties_match = all(
                duplicated_agent.get(prop) == original_agent.get(prop) 
                for prop in properties_to_check
            )
            if properties_match:
                print(f"   ✅ All properties copied correctly")
                checks_passed += 1
            else:
                print(f"   ❌ Some properties not copied correctly")

            # Clean up the duplicated agent
            self.run_test(
                "Cleanup Duplicated Agent",
                "DELETE",
                f"admin/agents/{duplicated_agent['id']}",
                200,
                headers=headers
            )

            if checks_passed == total_checks:
                self.log_test("Admin Duplicate Agent", True, "All duplication checks passed")
                return True
            else:
                self.log_test("Admin Duplicate Agent", False, f"Only {checks_passed}/{total_checks} checks passed")
                return False

        return False

    def run_migration_tests(self):
        """Run all database migration validation tests"""
        print("🔄 Starting Database Migration Validation Tests")
        print("=" * 60)
        
        # Admin login
        print("\n🔐 Admin Authentication")
        if not self.test_admin_login():
            print("❌ Cannot proceed without admin access")
            return 1

        # Core migration validation tests
        print("\n📊 Agent Count & Structure Validation")
        self.test_agents_count()
        self.test_agents_required_fields()
        self.test_agents_segments()

        print("\n🔍 API Functionality Tests")
        self.test_segment_filtering()
        self.test_agent_details()

        print("\n🔧 Admin Operations Tests")
        self.test_admin_update_agent()
        self.test_admin_duplicate_agent()

        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Migration Tests completed: {self.tests_passed}/{self.tests_run}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All migration validation tests passed!")
            print("✅ Database migration successful - all 23 agents properly configured")
            return 0
        else:
            failed_tests = self.tests_run - self.tests_passed
            print(f"⚠️  {failed_tests} tests failed")
            print("❌ Database migration validation failed")
            
            # Print failed tests
            print("\n📋 Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['test']}: {result['details']}")
            
            return 1

def main():
    tester = DatabaseMigrationTester()
    return tester.run_migration_tests()

if __name__ == "__main__":
    sys.exit(main())