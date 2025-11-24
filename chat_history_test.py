import requests
import sys
import json
from datetime import datetime

class ChatHistoryTester:
    def __init__(self, base_url="https://voicechatai-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.subscription_id = None
        self.session_id = None
        self.api_key = None
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
        """Test admin login with provided credentials"""
        success, response = self.run_test(
            "1. Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@voiceai.com", "password": "123456"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   🔑 Admin token obtained")
            return True
        return False

    def test_get_subscriptions(self):
        """Test getting user subscriptions to get a valid subscription_id"""
        if not self.admin_token:
            self.log_test("2. Get Subscriptions", False, "No admin token")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "2. Get My Subscriptions",
            "GET",
            "subscriptions/my",
            200,
            headers=headers
        )
        
        if success and response:
            if len(response) > 0:
                self.subscription_id = response[0]['id']
                self.api_key = response[0]['api_key']
                print(f"   📋 Subscription ID: {self.subscription_id}")
                print(f"   🔐 API Key: {self.api_key}")
                return True
            else:
                self.log_test("2. Get Subscriptions", False, "No subscriptions found")
                return False
        return False

    def test_create_chat_session(self):
        """Test creating a new chat session"""
        if not self.admin_token or not self.subscription_id:
            self.log_test("3. Create Chat Session", False, "Missing admin token or subscription_id")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "3. Create New Chat Session",
            "POST",
            f"chat-sessions?subscription_id={self.subscription_id}",
            200,
            headers=headers
        )
        
        if success and response:
            self.session_id = response['id']
            session_title = response.get('title')
            print(f"   💬 Session ID: {self.session_id}")
            print(f"   📝 Initial Title: {session_title}")
            
            # Verify title is None or empty (not "Nova Conversa")
            if session_title is None or session_title == "":
                self.log_test("3a. Initial Title Check", True, "Title is None/empty as expected")
                return True
            else:
                self.log_test("3a. Initial Title Check", False, f"Expected None/empty title, got: {session_title}")
                return False
        return False

    def test_send_first_message(self):
        """Test sending first message via agent/execute API"""
        if not self.api_key or not self.session_id:
            self.log_test("4. Send First Message", False, "Missing API key or session_id")
            return False
            
        headers = {'Authorization': f'Bearer {self.api_key}'}
        first_message = "Olá, preciso de ajuda com vendas"
        
        success, response = self.run_test(
            "4. Send First Message via Agent Execute",
            "POST",
            "agent/execute",
            200,
            data={
                "input_text": first_message,
                "session_id": f"chat_{self.session_id}"
            },
            headers=headers
        )
        
        if success and response:
            output_text = response.get('output_text')
            returned_session_id = response.get('session_id')
            print(f"   💭 Response: {output_text[:100]}..." if output_text else "   💭 No response text")
            print(f"   🆔 Returned Session ID: {returned_session_id}")
            
            # Verify we got a response and session_id
            if output_text and returned_session_id:
                self.log_test("4a. Response Content Check", True, "Got output_text and session_id")
                return True
            else:
                self.log_test("4a. Response Content Check", False, "Missing output_text or session_id")
                return False
        return False

    def test_verify_title_updated(self):
        """Test that the session title was updated to the first message"""
        if not self.admin_token or not self.session_id:
            self.log_test("5. Verify Title Updated", False, "Missing admin token or session_id")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "5. Get Chat Session Details",
            "GET",
            f"chat-sessions/{self.session_id}",
            200,
            headers=headers
        )
        
        if success and response:
            session_title = response.get('title')
            messages = response.get('messages', [])
            message_count = len(messages)
            
            print(f"   📝 Updated Title: {session_title}")
            print(f"   📊 Message Count: {message_count}")
            
            expected_title = "Olá, preciso de ajuda com vendas"
            
            # Check if title matches first message (or truncated version)
            if session_title and (session_title == expected_title or session_title.startswith("Olá, preciso de ajuda")):
                self.log_test("5a. Title Update Check", True, f"Title correctly updated to: {session_title}")
            else:
                self.log_test("5a. Title Update Check", False, f"Expected title to be '{expected_title}' or truncated, got: {session_title}")
                return False
            
            # Check that we have 2 messages (user + assistant)
            if message_count == 2:
                self.log_test("5b. Message Count Check", True, "Found 2 messages (user + assistant)")
                return True
            else:
                self.log_test("5b. Message Count Check", False, f"Expected 2 messages, found {message_count}")
                return False
        return False

    def test_list_sessions(self):
        """Test listing all sessions for the subscription"""
        if not self.admin_token or not self.subscription_id:
            self.log_test("6. List Chat Sessions", False, "Missing admin token or subscription_id")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "6. List All Chat Sessions",
            "GET",
            f"chat-sessions/subscription/{self.subscription_id}",
            200,
            headers=headers
        )
        
        if success and response:
            session_count = len(response)
            print(f"   📋 Total Sessions: {session_count}")
            
            # Find our created session in the list
            our_session = None
            for session in response:
                if session['id'] == self.session_id:
                    our_session = session
                    break
            
            if our_session:
                session_title = our_session.get('title')
                print(f"   📝 Session Title in List: {session_title}")
                
                # Verify the title appears correctly in the list
                if session_title and session_title.startswith("Olá, preciso de ajuda"):
                    self.log_test("6a. Session in List Check", True, f"Session found with correct title: {session_title}")
                    return True
                else:
                    self.log_test("6a. Session in List Check", False, f"Session found but title incorrect: {session_title}")
                    return False
            else:
                self.log_test("6a. Session in List Check", False, "Created session not found in list")
                return False
        return False

    def run_chat_history_test(self):
        """Run the complete chat history test flow"""
        print("🚀 Starting Chat History Test")
        print("Testing recent chat history implementation fixes")
        print("=" * 60)
        
        # Step 1: Login
        print("\n📝 Step 1: Authentication")
        if not self.test_admin_login():
            print("❌ Cannot proceed without admin login")
            return 1
        
        # Step 2: Get subscriptions
        print("\n📋 Step 2: Get Subscriptions")
        if not self.test_get_subscriptions():
            print("❌ Cannot proceed without valid subscription")
            return 1
        
        # Step 3: Create new session
        print("\n💬 Step 3: Create Chat Session")
        if not self.test_create_chat_session():
            print("❌ Cannot proceed without chat session")
            return 1
        
        # Step 4: Send first message
        print("\n💭 Step 4: Send First Message")
        if not self.test_send_first_message():
            print("❌ Cannot proceed without sending message")
            return 1
        
        # Step 5: Verify title updated
        print("\n📝 Step 5: Verify Title Update")
        if not self.test_verify_title_updated():
            print("❌ Title update verification failed")
            return 1
        
        # Step 6: List sessions
        print("\n📋 Step 6: List Sessions")
        if not self.test_list_sessions():
            print("❌ Session listing verification failed")
            return 1
        
        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All chat history tests passed!")
            print("✅ Chat history functionality is working correctly:")
            print("   • New sessions start with empty/null title")
            print("   • First user message becomes the session title")
            print("   • Messages are properly saved to database")
            print("   • Sessions appear correctly in listings")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            print("❌ Chat history functionality has issues that need attention")
            return 1

def main():
    tester = ChatHistoryTester()
    return tester.run_chat_history_test()

if __name__ == "__main__":
    sys.exit(main())