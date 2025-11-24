import requests
import sys
import json
from datetime import datetime

class FinalMigrationTester:
    def __init__(self, base_url="https://voice-chat-ai-13.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.critical_issues = []
        self.minor_issues = []

    def log_result(self, test_name, success, details="", is_critical=True):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")
            if is_critical:
                self.critical_issues.append(f"{test_name}: {details}")
            else:
                self.minor_issues.append(f"{test_name}: {details}")

    def get_admin_token(self):
        """Get admin authentication token"""
        try:
            response = requests.post(f"{self.api_url}/auth/login", 
                                   json={"email": "admin@voiceai.com", "password": "admin123"})
            if response.status_code == 200:
                self.admin_token = response.json()['token']
                return True
            else:
                self.log_result("Admin Login", False, f"Status {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception: {str(e)}")
            return False

    def test_database_migration_core(self):
        """Test core database migration requirements"""
        print("🔍 Testing Core Migration Requirements")
        
        # Test 1: Exactly 23 agents
        try:
            response = requests.get(f"{self.api_url}/agents")
            if response.status_code == 200:
                agents = response.json()
                agent_count = len(agents)
                
                if agent_count == 23:
                    self.log_result("Agent Count (23 agents)", True)
                else:
                    self.log_result("Agent Count (23 agents)", False, f"Found {agent_count} agents instead of 23")
                
                # Test 2: All agents have required fields
                missing_fields_agents = []
                required_fields = ['name', 'description', 'segment', 'price']
                
                for agent in agents:
                    missing_fields = []
                    for field in required_fields:
                        if field not in agent or agent[field] is None or agent[field] == "":
                            missing_fields.append(field)
                    if missing_fields:
                        missing_fields_agents.append(f"{agent.get('name', 'Unknown')}: {', '.join(missing_fields)}")
                
                if not missing_fields_agents:
                    self.log_result("Required Fields Present", True)
                else:
                    self.log_result("Required Fields Present", False, f"{len(missing_fields_agents)} agents missing fields")
                
                # Test 3: base_prompt analysis
                agents_with_base_prompt = sum(1 for agent in agents if agent.get('base_prompt') is not None and agent.get('base_prompt') != "")
                agents_without_base_prompt = 23 - agents_with_base_prompt
                
                if agents_without_base_prompt == 0:
                    self.log_result("All Agents Have base_prompt", True)
                elif agents_without_base_prompt <= 2:  # Allow up to 2 agents without base_prompt
                    self.log_result("Most Agents Have base_prompt", True, f"{agents_without_base_prompt} agents without base_prompt", is_critical=False)
                else:
                    self.log_result("base_prompt Coverage", False, f"{agents_without_base_prompt} agents missing base_prompt")
                
                # Test 4: Segment distribution
                expected_segments = {
                    "Vendas & Receita": 5,
                    "Atendimento, Agenda & Operações": 5,
                    "Produtividade Executiva & E-mail": 3,
                    "Finanças": 3,
                    "Marketing & Inteligência": 3,
                    "Pessoas, RH & Jurídico": 2,
                    "Saúde, Bem-estar, Fitness & Lifestyle": 2
                }
                
                segment_counts = {}
                for agent in agents:
                    segment = agent.get('segment', 'Unknown')
                    segment_counts[segment] = segment_counts.get(segment, 0) + 1
                
                segment_errors = []
                for expected_segment, expected_count in expected_segments.items():
                    actual_count = segment_counts.get(expected_segment, 0)
                    if actual_count != expected_count:
                        segment_errors.append(f"{expected_segment}: expected {expected_count}, got {actual_count}")
                
                if not segment_errors:
                    self.log_result("Segment Distribution", True)
                else:
                    self.log_result("Segment Distribution", False, "; ".join(segment_errors))
                
                return agents
            else:
                self.log_result("Get Agents API", False, f"Status {response.status_code}")
                return []
        except Exception as e:
            self.log_result("Database Migration Core Test", False, f"Exception: {str(e)}")
            return []

    def test_api_functionality(self, agents):
        """Test API functionality with new agents"""
        print("\n🔧 Testing API Functionality")
        
        # Test segment filtering
        test_segments = [("Vendas & Receita", 5), ("Finanças", 3)]
        
        for segment, expected_count in test_segments:
            try:
                response = requests.get(f"{self.api_url}/agents?segment={requests.utils.quote(segment)}")
                if response.status_code == 200:
                    filtered_agents = response.json()
                    actual_count = len(filtered_agents)
                    if actual_count == expected_count:
                        self.log_result(f"Filter '{segment}'", True)
                    else:
                        self.log_result(f"Filter '{segment}'", False, f"Expected {expected_count}, got {actual_count}")
                else:
                    self.log_result(f"Filter '{segment}'", False, f"Status {response.status_code}")
            except Exception as e:
                self.log_result(f"Filter '{segment}'", False, f"Exception: {str(e)}")
        
        # Test individual agent details
        if agents:
            test_agent = agents[0]
            try:
                response = requests.get(f"{self.api_url}/agents/{test_agent['id']}")
                if response.status_code == 200:
                    agent_details = response.json()
                    required_fields = ['name', 'description', 'segment', 'price']
                    missing_fields = [field for field in required_fields if field not in agent_details or agent_details[field] is None]
                    
                    if not missing_fields:
                        self.log_result("Agent Details API", True)
                    else:
                        self.log_result("Agent Details API", False, f"Missing fields: {', '.join(missing_fields)}")
                else:
                    self.log_result("Agent Details API", False, f"Status {response.status_code}")
            except Exception as e:
                self.log_result("Agent Details API", False, f"Exception: {str(e)}")

    def test_admin_operations(self, agents):
        """Test admin operations with new agents"""
        print("\n🔐 Testing Admin Operations")
        
        if not self.admin_token or not agents:
            self.log_result("Admin Operations", False, "Missing admin token or agents data")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Find an agent with base_prompt for testing
        test_agent = None
        for agent in agents:
            if agent.get('base_prompt') is not None:
                test_agent = agent
                break
        
        if not test_agent:
            # Use first agent even if base_prompt is None
            test_agent = agents[0]
        
        # Test admin update (this will reveal the base_prompt overwrite bug)
        original_price = test_agent['price']
        original_base_prompt = test_agent.get('base_prompt')
        new_price = original_price + 1.00
        
        update_data = {
            "name": test_agent['name'],
            "description": test_agent['description'],
            "segment": test_agent['segment'],
            "price": new_price,
            "features": test_agent['features'],
            "mascot_image_url": test_agent['mascot_image_url'],
            "elevenlabs_voice_id": test_agent['elevenlabs_voice_id']
            # Note: base_prompt is intentionally NOT included to test the bug
        }
        
        try:
            response = requests.put(f"{self.api_url}/admin/agents/{test_agent['id']}", 
                                  json=update_data, headers=headers)
            if response.status_code == 200:
                # Verify the update
                verify_response = requests.get(f"{self.api_url}/agents/{test_agent['id']}")
                if verify_response.status_code == 200:
                    updated_agent = verify_response.json()
                    
                    # Check if price was updated
                    if updated_agent.get('price') == new_price:
                        self.log_result("Admin Update Price", True)
                        
                        # Check if base_prompt was preserved (this will likely fail)
                        if updated_agent.get('base_prompt') == original_base_prompt:
                            self.log_result("Admin Update Preserves base_prompt", True)
                        else:
                            self.log_result("Admin Update Preserves base_prompt", False, 
                                          "base_prompt was overwritten when not included in update request")
                        
                        # Restore original price
                        update_data['price'] = original_price
                        if original_base_prompt is not None:
                            update_data['base_prompt'] = original_base_prompt
                        requests.put(f"{self.api_url}/admin/agents/{test_agent['id']}", 
                                   json=update_data, headers=headers)
                    else:
                        self.log_result("Admin Update Price", False, "Price update did not persist")
                else:
                    self.log_result("Admin Update Verification", False, f"Status {verify_response.status_code}")
            else:
                self.log_result("Admin Update", False, f"Status {response.status_code}")
        except Exception as e:
            self.log_result("Admin Update", False, f"Exception: {str(e)}")
        
        # Test duplication
        try:
            response = requests.post(f"{self.api_url}/admin/duplicate-agent/{test_agent['id']}", 
                                   headers=headers)
            if response.status_code == 200:
                duplicated_agent = response.json()
                
                # Verify duplication properties
                checks = []
                
                # Check ID is different
                if duplicated_agent['id'] != test_agent['id']:
                    checks.append("unique_id")
                
                # Check name has prefix
                expected_name = f"(Cópia) {test_agent['name']}"
                if duplicated_agent['name'] == expected_name:
                    checks.append("name_prefix")
                
                # Check base_prompt copied correctly
                if duplicated_agent.get('base_prompt') == test_agent.get('base_prompt'):
                    checks.append("base_prompt")
                
                # Check other properties
                if (duplicated_agent.get('segment') == test_agent.get('segment') and
                    duplicated_agent.get('price') == test_agent.get('price')):
                    checks.append("properties")
                
                if len(checks) == 4:
                    self.log_result("Admin Duplicate Agent", True)
                else:
                    missing_checks = set(['unique_id', 'name_prefix', 'base_prompt', 'properties']) - set(checks)
                    self.log_result("Admin Duplicate Agent", False, f"Failed checks: {', '.join(missing_checks)}")
                
                # Cleanup
                requests.delete(f"{self.api_url}/admin/agents/{duplicated_agent['id']}", headers=headers)
            else:
                self.log_result("Admin Duplicate Agent", False, f"Status {response.status_code}")
        except Exception as e:
            self.log_result("Admin Duplicate Agent", False, f"Exception: {str(e)}")

    def run_final_validation(self):
        """Run final validation of database migration"""
        print("🔄 Final Database Migration Validation")
        print("=" * 60)
        
        # Get admin token
        if not self.get_admin_token():
            return 1
        
        # Run core migration tests
        agents = self.test_database_migration_core()
        
        # Run API functionality tests
        self.test_api_functionality(agents)
        
        # Run admin operations tests
        self.test_admin_operations(agents)
        
        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Final Validation: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.critical_issues:
            print(f"\n🚨 CRITICAL ISSUES ({len(self.critical_issues)}):")
            for issue in self.critical_issues:
                print(f"   • {issue}")
        
        if self.minor_issues:
            print(f"\n⚠️  MINOR ISSUES ({len(self.minor_issues)}):")
            for issue in self.minor_issues:
                print(f"   • {issue}")
        
        if not self.critical_issues and not self.minor_issues:
            print("\n🎉 DATABASE MIGRATION VALIDATION SUCCESSFUL!")
            print("✅ All 23 agents properly configured and functional")
            return 0
        elif not self.critical_issues:
            print(f"\n✅ DATABASE MIGRATION MOSTLY SUCCESSFUL!")
            print(f"⚠️  {len(self.minor_issues)} minor issues found but core functionality works")
            return 0
        else:
            print(f"\n❌ DATABASE MIGRATION VALIDATION FAILED!")
            print(f"🚨 {len(self.critical_issues)} critical issues need attention")
            return 1

def main():
    tester = FinalMigrationTester()
    return tester.run_final_validation()

if __name__ == "__main__":
    sys.exit(main())