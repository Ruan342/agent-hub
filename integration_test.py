#!/usr/bin/env python3
"""
Integration System Test - Email SendGrid
Tests the new multicanal integration system focusing on Email (SendGrid) Phase 1
"""

import requests
import json
import sys
from datetime import datetime

class IntegrationTester:
    def __init__(self, base_url="https://voicechatai-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.subscription_id = None
        self.integration_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", response_data=None):
        """Log test result with detailed information"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            if response_data:
                print(f"   Response: {json.dumps(response_data, indent=2)}")
        else:
            print(f"❌ {name} - {details}")
            if response_data:
                print(f"   Response: {json.dumps(response_data, indent=2)}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response": response_data
        })

    def test_admin_login(self):
        """Test 1: Admin Login"""
        print("\n🔐 Testing Admin Login...")
        
        login_data = {
            "email": "admin@voiceai.com",
            "password": "admin123"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'token' in data and 'user' in data:
                    self.admin_token = data['token']
                    user_role = data['user'].get('role', '')
                    
                    if user_role == 'admin':
                        self.log_test("Admin Login", True, f"Successfully logged in as admin", {
                            "user_id": data['user'].get('id'),
                            "email": data['user'].get('email'),
                            "role": user_role
                        })
                        return True
                    else:
                        self.log_test("Admin Login", False, f"User role is '{user_role}', expected 'admin'")
                        return False
                else:
                    self.log_test("Admin Login", False, "Missing token or user in response", data)
                    return False
            else:
                self.log_test("Admin Login", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False

    def test_list_subscriptions(self):
        """Test 2: List User Subscriptions"""
        print("\n📋 Testing List Subscriptions...")
        
        if not self.admin_token:
            self.log_test("List Subscriptions", False, "No admin token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = requests.get(f"{self.api_url}/subscriptions/my", headers=headers)
            
            if response.status_code == 200:
                subscriptions = response.json()
                
                if isinstance(subscriptions, list) and len(subscriptions) > 0:
                    # Get the first active subscription
                    active_subs = [sub for sub in subscriptions if sub.get('status') == 'active']
                    
                    if active_subs:
                        self.subscription_id = active_subs[0]['id']
                        self.log_test("List Subscriptions", True, f"Found {len(subscriptions)} subscriptions, using subscription_id: {self.subscription_id}", {
                            "total_subscriptions": len(subscriptions),
                            "active_subscriptions": len(active_subs),
                            "selected_subscription": {
                                "id": self.subscription_id,
                                "agent_id": active_subs[0].get('agent_id'),
                                "status": active_subs[0].get('status')
                            }
                        })
                        return True
                    else:
                        self.log_test("List Subscriptions", False, "No active subscriptions found", subscriptions)
                        return False
                else:
                    self.log_test("List Subscriptions", False, "No subscriptions found or invalid response format", subscriptions)
                    return False
            else:
                self.log_test("List Subscriptions", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("List Subscriptions", False, f"Exception: {str(e)}")
            return False

    def test_create_email_integration(self):
        """Test 3: Create Email Integration"""
        print("\n📧 Testing Create Email Integration...")
        
        if not self.admin_token or not self.subscription_id:
            self.log_test("Create Email Integration", False, "Missing admin token or subscription_id")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        integration_data = {
            "subscription_id": self.subscription_id,
            "type": "email",
            "name": "Email de Teste",
            "config": {
                "sendgrid_api_key": "SG.test_key_12345",
                "from_email": "test@voiceaihub.com",
                "from_name": "VoiceAI Test",
                "reply_to": "reply@voiceaihub.com"
            }
        }
        
        try:
            response = requests.post(f"{self.api_url}/integrations", json=integration_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'id' in data:
                    self.integration_id = data['id']
                    
                    # Verify all fields are correct
                    expected_fields = ['id', 'user_id', 'subscription_id', 'type', 'name', 'config', 'status', 'created_at', 'updated_at']
                    missing_fields = [field for field in expected_fields if field not in data]
                    
                    if not missing_fields:
                        # Verify specific values
                        checks = [
                            (data.get('subscription_id') == self.subscription_id, f"subscription_id mismatch: {data.get('subscription_id')} != {self.subscription_id}"),
                            (data.get('type') == 'email', f"type mismatch: {data.get('type')} != email"),
                            (data.get('name') == 'Email de Teste', f"name mismatch: {data.get('name')} != Email de Teste"),
                            (data.get('status') == 'active', f"status mismatch: {data.get('status')} != active"),
                            ('sendgrid_api_key' in data.get('config', {}), "sendgrid_api_key missing from config"),
                            (data.get('config', {}).get('from_email') == 'test@voiceaihub.com', f"from_email mismatch in config")
                        ]
                        
                        failed_checks = [msg for passed, msg in checks if not passed]
                        
                        if not failed_checks:
                            self.log_test("Create Email Integration", True, f"Integration created with ID: {self.integration_id}", {
                                "integration_id": self.integration_id,
                                "type": data.get('type'),
                                "name": data.get('name'),
                                "status": data.get('status'),
                                "config_keys": list(data.get('config', {}).keys())
                            })
                            return True
                        else:
                            self.log_test("Create Email Integration", False, f"Validation failed: {'; '.join(failed_checks)}", data)
                            return False
                    else:
                        self.log_test("Create Email Integration", False, f"Missing fields: {missing_fields}", data)
                        return False
                else:
                    self.log_test("Create Email Integration", False, "No integration ID in response", data)
                    return False
            else:
                self.log_test("Create Email Integration", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Email Integration", False, f"Exception: {str(e)}")
            return False

    def test_list_integrations(self):
        """Test 4: List Integrations"""
        print("\n📋 Testing List Integrations...")
        
        if not self.admin_token:
            self.log_test("List Integrations", False, "No admin token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = requests.get(f"{self.api_url}/integrations", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'integrations' in data and isinstance(data['integrations'], list):
                    integrations = data['integrations']
                    
                    # Check if our created integration is in the list
                    if self.integration_id:
                        found_integration = None
                        for integration in integrations:
                            if integration.get('id') == self.integration_id:
                                found_integration = integration
                                break
                        
                        if found_integration:
                            self.log_test("List Integrations", True, f"Found {len(integrations)} integrations, including our created integration", {
                                "total_integrations": len(integrations),
                                "found_our_integration": True,
                                "our_integration": {
                                    "id": found_integration.get('id'),
                                    "name": found_integration.get('name'),
                                    "type": found_integration.get('type'),
                                    "status": found_integration.get('status')
                                }
                            })
                            return True
                        else:
                            self.log_test("List Integrations", False, f"Created integration {self.integration_id} not found in list", {
                                "total_integrations": len(integrations),
                                "integration_ids": [i.get('id') for i in integrations]
                            })
                            return False
                    else:
                        self.log_test("List Integrations", True, f"Found {len(integrations)} integrations", {
                            "total_integrations": len(integrations)
                        })
                        return True
                else:
                    self.log_test("List Integrations", False, "Invalid response format - missing 'integrations' array", data)
                    return False
            else:
                self.log_test("List Integrations", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("List Integrations", False, f"Exception: {str(e)}")
            return False

    def test_get_specific_integration(self):
        """Test 5: Get Specific Integration"""
        print("\n🔍 Testing Get Specific Integration...")
        
        if not self.admin_token or not self.integration_id:
            self.log_test("Get Specific Integration", False, "Missing admin token or integration_id")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = requests.get(f"{self.api_url}/integrations/{self.integration_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify it's the correct integration
                checks = [
                    (data.get('id') == self.integration_id, f"ID mismatch: {data.get('id')} != {self.integration_id}"),
                    (data.get('type') == 'email', f"Type mismatch: {data.get('type')} != email"),
                    (data.get('name') == 'Email de Teste', f"Name mismatch: {data.get('name')} != Email de Teste"),
                    ('config' in data, "Config missing"),
                    ('sendgrid_api_key' in data.get('config', {}), "sendgrid_api_key missing from config")
                ]
                
                failed_checks = [msg for passed, msg in checks if not passed]
                
                if not failed_checks:
                    self.log_test("Get Specific Integration", True, f"Successfully retrieved integration details", {
                        "id": data.get('id'),
                        "name": data.get('name'),
                        "type": data.get('type'),
                        "status": data.get('status'),
                        "config_keys": list(data.get('config', {}).keys())
                    })
                    return True
                else:
                    self.log_test("Get Specific Integration", False, f"Validation failed: {'; '.join(failed_checks)}", data)
                    return False
            else:
                self.log_test("Get Specific Integration", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Specific Integration", False, f"Exception: {str(e)}")
            return False

    def test_update_integration(self):
        """Test 6: Update Integration"""
        print("\n✏️ Testing Update Integration...")
        
        if not self.admin_token or not self.integration_id:
            self.log_test("Update Integration", False, "Missing admin token or integration_id")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        update_data = {
            "name": "Email de Teste - Atualizado"
        }
        
        try:
            response = requests.put(f"{self.api_url}/integrations/{self.integration_id}", json=update_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify the update was applied
                if data.get('name') == 'Email de Teste - Atualizado':
                    # Verify other fields remain unchanged
                    checks = [
                        (data.get('id') == self.integration_id, f"ID changed: {data.get('id')} != {self.integration_id}"),
                        (data.get('type') == 'email', f"Type changed: {data.get('type')} != email"),
                        ('config' in data, "Config missing after update"),
                        ('sendgrid_api_key' in data.get('config', {}), "sendgrid_api_key missing from config after update")
                    ]
                    
                    failed_checks = [msg for passed, msg in checks if not passed]
                    
                    if not failed_checks:
                        self.log_test("Update Integration", True, f"Successfully updated integration name", {
                            "id": data.get('id'),
                            "old_name": "Email de Teste",
                            "new_name": data.get('name'),
                            "type": data.get('type'),
                            "config_preserved": 'sendgrid_api_key' in data.get('config', {})
                        })
                        return True
                    else:
                        self.log_test("Update Integration", False, f"Update validation failed: {'; '.join(failed_checks)}", data)
                        return False
                else:
                    self.log_test("Update Integration", False, f"Name not updated: {data.get('name')} != Email de Teste - Atualizado", data)
                    return False
            else:
                self.log_test("Update Integration", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Update Integration", False, f"Exception: {str(e)}")
            return False

    def test_delete_integration(self):
        """Test 7: Delete Integration"""
        print("\n🗑️ Testing Delete Integration...")
        
        if not self.admin_token or not self.integration_id:
            self.log_test("Delete Integration", False, "Missing admin token or integration_id")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = requests.delete(f"{self.api_url}/integrations/{self.integration_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success') == True:
                    self.log_test("Delete Integration", True, f"Successfully deleted integration {self.integration_id}", {
                        "deleted_integration_id": self.integration_id,
                        "response": data
                    })
                    return True
                else:
                    self.log_test("Delete Integration", False, f"Delete response indicates failure", data)
                    return False
            else:
                self.log_test("Delete Integration", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Delete Integration", False, f"Exception: {str(e)}")
            return False

    def test_verify_deletion(self):
        """Test 8: Verify Integration Deletion"""
        print("\n🔍 Testing Verify Integration Deletion...")
        
        if not self.admin_token or not self.integration_id:
            self.log_test("Verify Integration Deletion", False, "Missing admin token or integration_id")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            # Try to get the deleted integration - should return 404
            response = requests.get(f"{self.api_url}/integrations/{self.integration_id}", headers=headers)
            
            if response.status_code == 404:
                self.log_test("Verify Integration Deletion", True, f"Integration {self.integration_id} correctly not found after deletion", {
                    "status_code": response.status_code,
                    "expected": 404
                })
                
                # Also verify it's not in the list
                list_response = requests.get(f"{self.api_url}/integrations", headers=headers)
                if list_response.status_code == 200:
                    list_data = list_response.json()
                    integrations = list_data.get('integrations', [])
                    
                    found_deleted = any(i.get('id') == self.integration_id for i in integrations)
                    
                    if not found_deleted:
                        print(f"   ✅ Integration also removed from list")
                        return True
                    else:
                        self.log_test("Verify Integration Deletion", False, f"Integration still appears in list after deletion")
                        return False
                else:
                    print(f"   ⚠️ Could not verify list removal (HTTP {list_response.status_code})")
                    return True  # Still consider test passed if individual get returns 404
            else:
                self.log_test("Verify Integration Deletion", False, f"Integration still accessible after deletion - HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Verify Integration Deletion", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all integration tests in sequence"""
        print("🚀 Starting Integration System Tests - Email SendGrid")
        print("=" * 60)
        
        test_sequence = [
            self.test_admin_login,
            self.test_list_subscriptions,
            self.test_create_email_integration,
            self.test_list_integrations,
            self.test_get_specific_integration,
            self.test_update_integration,
            self.test_delete_integration,
            self.test_verify_deletion
        ]
        
        for test_func in test_sequence:
            try:
                success = test_func()
                if not success:
                    print(f"\n⚠️ Test failed: {test_func.__name__}")
                    print("Continuing with remaining tests...")
            except Exception as e:
                print(f"\n💥 Unexpected error in {test_func.__name__}: {str(e)}")
                self.log_test(test_func.__name__, False, f"Unexpected error: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Print failed tests
        failed_tests = [result for result in self.test_results if not result['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        print("\n" + "=" * 60)
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = IntegrationTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)