from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import shutil
from PIL import Image
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
from elevenlabs import ElevenLabs, VoiceSettings
import base64
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_DAYS = 30

# Stripe
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# ElevenLabs
ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')
eleven_client = ElevenLabs(api_key=ELEVENLABS_API_KEY) if ELEVENLABS_API_KEY else None

# Upload directory
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / "agents").mkdir(exist_ok=True)

security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str = "customer"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Agent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    segment: str
    price: float
    features: List[str]
    mascot_image_url: str
    elevenlabs_voice_id: str
    base_prompt: Optional[str] = None
    voice_sample_url: Optional[str] = None
    llm_provider: str = "openai"  # openai, anthropic, gemini
    llm_model: str = "gpt-5"  # gpt-5, claude-4-sonnet, gemini-2.5-pro, etc
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AgentCreate(BaseModel):
    name: str
    description: str
    segment: str
    price: float
    features: List[str]
    mascot_image_url: str
    elevenlabs_voice_id: str
    base_prompt: Optional[str] = None
    voice_sample_url: Optional[str] = None
    llm_provider: str = "openai"
    llm_model: str = "gpt-5"

class Subscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    agent_id: str
    stripe_subscription_id: Optional[str] = None
    status: str = "pending"
    api_key: str = Field(default_factory=lambda: f"vapi_{uuid.uuid4().hex}")
    webhook_url: Optional[str] = None
    custom_prompt: Optional[str] = None
    config: Optional[Dict] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubscriptionUpdate(BaseModel):
    webhook_url: str

class SubscriptionConfigUpdate(BaseModel):
    custom_prompt: Optional[str] = None
    config: Optional[Dict] = None

class AgentRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    segment: str
    description: str
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AgentRequestCreate(BaseModel):
    segment: str
    description: str

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: Optional[str] = None
    agent_id: str
    amount: float
    currency: str
    payment_status: str = "pending"
    metadata: Dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    subscription_id: str
    amount: float
    currency: str = "usd"
    status: str = "paid"
    invoice_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    due_date: datetime
    paid_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WebhookLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subscription_id: str
    event_type: str
    payload: Dict
    response_status: Optional[int] = None
    response_body: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CheckoutRequest(BaseModel):
    agent_id: str
    origin_url: str

class TTSRequest(BaseModel):
    text: str
    voice_id: str
    stability: float = 0.5
    similarity_boost: float = 0.75
    style: float = 0.0
    use_speaker_boost: bool = True

class TTSResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    audio_url: str
    text: str
    voice_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VoiceCallRequest(BaseModel):
    phone: str
    message: str
    agent_id: str

class VoiceCallResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    status: str
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        role = payload.get('role')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {'user_id': user_id, 'role': role}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Auth endpoints
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        name=user_data.name
    )
    
    user_dict = user.model_dump()
    user_dict['password_hash'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    token = create_token(user.id, user.role)
    return {"token": token, "user": user}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user_doc['id'], user_doc['role'])
    user = User(**{k: v for k, v in user_doc.items() if k != 'password_hash'})
    return {"token": token, "user": user}

# Public agent endpoints
def convert_relative_to_absolute_url(url: str, request: Request) -> str:
    """Convert relative URLs to absolute URLs via /api/uploads"""
    if not url:
        return url
    
    # If URL is already absolute, check if it needs to be updated to use /api/uploads
    if url.startswith('http://') or url.startswith('https://'):
        # Convert old /uploads/ URLs to /api/uploads/
        if '/uploads/agents/' in url and '/api/uploads/' not in url:
            url = url.replace('/uploads/agents/', '/api/uploads/agents/')
        # Force HTTPS
        if 'emergentagent.com' in url or 'preview' in url:
            url = url.replace('http://', 'https://')
        return url
    
    base_url = str(request.base_url).rstrip('/')
    
    # Force HTTPS in production
    if 'emergentagent.com' in base_url or 'preview' in base_url:
        base_url = base_url.replace('http://', 'https://')
    
    # Convert /uploads/* to /api/uploads/* to ensure it goes through FastAPI
    if url.startswith('/uploads/'):
        url = f"/api{url}"
    
    # Remove leading slash if present to avoid double slashes
    url = url.lstrip('/')
    return f"{base_url}/{url}"

@api_router.get("/agents", response_model=List[Agent])
async def get_agents(request: Request, segment: Optional[str] = None):
    query = {"status": "active"}
    if segment:
        query["segment"] = segment
    
    agents = await db.agents.find(query, {"_id": 0}).to_list(1000)
    for agent in agents:
        if isinstance(agent.get('created_at'), str):
            agent['created_at'] = datetime.fromisoformat(agent['created_at'])
        # Convert relative URLs to absolute
        if agent.get('mascot_image_url'):
            agent['mascot_image_url'] = convert_relative_to_absolute_url(agent['mascot_image_url'], request)
        if agent.get('voice_sample_url'):
            agent['voice_sample_url'] = convert_relative_to_absolute_url(agent['voice_sample_url'], request)
    return agents

@api_router.get("/agents/{agent_id}", response_model=Agent)
async def get_agent(agent_id: str, request: Request):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if isinstance(agent.get('created_at'), str):
        agent['created_at'] = datetime.fromisoformat(agent['created_at'])
    # Convert relative URLs to absolute
    if agent.get('mascot_image_url'):
        agent['mascot_image_url'] = convert_relative_to_absolute_url(agent['mascot_image_url'], request)
    if agent.get('voice_sample_url'):
        agent['voice_sample_url'] = convert_relative_to_absolute_url(agent['voice_sample_url'], request)
    return Agent(**agent)

# Image upload endpoint
@api_router.post("/admin/upload-image")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(require_admin), request: Request = None):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = UPLOAD_DIR / "agents" / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Resize image if needed
    try:
        img = Image.open(file_path)
        if img.width > 512 or img.height > 512:
            img.thumbnail((512, 512), Image.Resampling.LANCZOS)
            img.save(file_path)
    except Exception:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    # Build full URL via /api/uploads to ensure proper CORS
    if request:
        base_url = str(request.base_url).rstrip('/')
        # Force HTTPS in production
        if 'emergentagent.com' in base_url or 'preview' in base_url:
            base_url = base_url.replace('http://', 'https://')
        # Use /api/uploads path to go through FastAPI with CORS
        image_url = f"{base_url}/api/uploads/agents/{filename}"
    else:
        # Fallback to relative URL
        image_url = f"/api/uploads/agents/{filename}"
    
    return {"url": image_url}

# Customer endpoints
@api_router.get("/subscriptions/my", response_model=List[Subscription])
async def get_my_subscriptions(current_user: dict = Depends(get_current_user)):
    subs = await db.subscriptions.find({"user_id": current_user['user_id']}, {"_id": 0}).to_list(1000)
    for sub in subs:
        for field in ['created_at', 'start_date', 'end_date']:
            if isinstance(sub.get(field), str):
                sub[field] = datetime.fromisoformat(sub[field])
    return subs

@api_router.put("/subscriptions/{subscription_id}/config")
async def update_subscription_config(subscription_id: str, config: SubscriptionConfigUpdate, current_user: dict = Depends(get_current_user)):
    sub_doc = await db.subscriptions.find_one({"id": subscription_id})
    if not sub_doc:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if sub_doc.get("user_id") != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not allowed to update this subscription")

    update_data = {}
    if config.custom_prompt is not None:
        update_data["custom_prompt"] = config.custom_prompt
    if config.config is not None:
        update_data["config"] = config.config

    if update_data:
        await db.subscriptions.update_one({"id": subscription_id}, {"$set": update_data})

    updated = await db.subscriptions.find_one({"id": subscription_id}, {"_id": 0})
    # normalize datetime fields
    for field in ["created_at", "start_date", "end_date"]:
        if isinstance(updated.get(field), str):
            updated[field] = datetime.fromisoformat(updated[field])

    return Subscription(**updated)

    subs = await db.subscriptions.find({"user_id": current_user['user_id']}, {"_id": 0}).to_list(1000)
    for sub in subs:
        for field in ['created_at', 'start_date', 'end_date']:
            if isinstance(sub.get(field), str):
                sub[field] = datetime.fromisoformat(sub[field])
    return subs

@api_router.post("/subscriptions/checkout")
async def create_checkout(checkout_req: CheckoutRequest, current_user: dict = Depends(get_current_user)):
    agent = await db.agents.find_one({"id": checkout_req.agent_id})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    webhook_url = f"{checkout_req.origin_url}/api/webhooks/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{checkout_req.origin_url}/payment-success?session_id={{{{CHECKOUT_SESSION_ID}}}}"
    cancel_url = f"{checkout_req.origin_url}/marketplace"
    
    session_request = CheckoutSessionRequest(
        amount=agent['price'],
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": current_user['user_id'],
            "agent_id": checkout_req.agent_id,
            "type": "subscription"
        }
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(session_request)
    
    transaction = PaymentTransaction(
        session_id=session.session_id,
        user_id=current_user['user_id'],
        agent_id=checkout_req.agent_id,
        amount=agent['price'],
        currency="usd",
        payment_status="pending",
        metadata=session_request.metadata
    )
    
    trans_dict = transaction.model_dump()
    trans_dict['created_at'] = trans_dict['created_at'].isoformat()
    await db.payment_transactions.insert_one(trans_dict)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/subscriptions/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, current_user: dict = Depends(get_current_user)):
    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    
    if status.payment_status == "paid" and transaction['payment_status'] != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid"}}
        )
        
        subscription = Subscription(
            user_id=transaction['user_id'],
            agent_id=transaction['agent_id'],
            status="active",
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=30)
        )
        
        sub_dict = subscription.model_dump()
        for field in ['created_at', 'start_date', 'end_date']:
            sub_dict[field] = sub_dict[field].isoformat()
        
        await db.subscriptions.insert_one(sub_dict)
        
        # Create invoice
        agent = await db.agents.find_one({"id": transaction['agent_id']})
        invoice = Invoice(
            user_id=transaction['user_id'],
            subscription_id=subscription.id,
            amount=agent['price'],
            due_date=datetime.now(timezone.utc),
            paid_date=datetime.now(timezone.utc)
        )
        invoice_dict = invoice.model_dump()
        for field in ['invoice_date', 'due_date', 'paid_date', 'created_at']:
            if invoice_dict[field]:
                invoice_dict[field] = invoice_dict[field].isoformat()
        await db.invoices.insert_one(invoice_dict)
    
    return status

@api_router.get("/subscriptions/{subscription_id}")
async def get_subscription(subscription_id: str, current_user: dict = Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"id": subscription_id, "user_id": current_user['user_id']}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub

@api_router.put("/subscriptions/{subscription_id}/webhook")
async def update_webhook(subscription_id: str, update: SubscriptionUpdate, current_user: dict = Depends(get_current_user)):
    result = await db.subscriptions.update_one(
        {"id": subscription_id, "user_id": current_user['user_id']},
        {"$set": {"webhook_url": update.webhook_url}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"success": True}

# Billing endpoints
@api_router.get("/billing/invoices", response_model=List[Invoice])
async def get_invoices(current_user: dict = Depends(get_current_user)):
    invoices = await db.invoices.find({"user_id": current_user['user_id']}, {"_id": 0}).to_list(1000)
    for invoice in invoices:
        for field in ['invoice_date', 'due_date', 'paid_date', 'created_at']:
            if isinstance(invoice.get(field), str):
                invoice[field] = datetime.fromisoformat(invoice[field])
    return invoices

# Webhook logs
@api_router.get("/webhooks/logs/{subscription_id}", response_model=List[WebhookLog])
async def get_webhook_logs(subscription_id: str, current_user: dict = Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"id": subscription_id, "user_id": current_user['user_id']})
    if not sub:
        raise HTTPException(status_code=403, detail="Access denied")
    
    logs = await db.webhook_logs.find({"subscription_id": subscription_id}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    for log in logs:
        if isinstance(log.get('created_at'), str):
            log['created_at'] = datetime.fromisoformat(log['created_at'])
    return logs

@api_router.post("/agent-requests")
async def create_agent_request(request_data: AgentRequestCreate, current_user: dict = Depends(get_current_user)):
    agent_req = AgentRequest(
        user_id=current_user['user_id'],
        segment=request_data.segment,
        description=request_data.description
    )
    
    req_dict = agent_req.model_dump()
    req_dict['created_at'] = req_dict['created_at'].isoformat()
    
    await db.agent_requests.insert_one(req_dict)
    return agent_req

@api_router.get("/agent-requests/my", response_model=List[AgentRequest])
async def get_my_requests(current_user: dict = Depends(get_current_user)):
    reqs = await db.agent_requests.find({"user_id": current_user['user_id']}, {"_id": 0}).to_list(1000)
    for req in reqs:
        if isinstance(req.get('created_at'), str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
    return reqs

# Admin endpoints
@api_router.post("/admin/agents", response_model=Agent)
async def create_agent(agent_data: AgentCreate, current_user: dict = Depends(require_admin)):
    agent = Agent(**agent_data.model_dump())
    agent_dict = agent.model_dump()
    agent_dict['created_at'] = agent_dict['created_at'].isoformat()
    await db.agents.insert_one(agent_dict)
    return agent

@api_router.put("/admin/agents/{agent_id}", response_model=Agent)
async def update_agent(agent_id: str, agent_data: AgentCreate, current_user: dict = Depends(require_admin)):
    update_dict = agent_data.model_dump()
    result = await db.agents.update_one({"id": agent_id}, {"$set": update_dict})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if isinstance(agent.get('created_at'), str):
        agent['created_at'] = datetime.fromisoformat(agent['created_at'])
    return Agent(**agent)

@api_router.delete("/admin/agents/{agent_id}")
async def delete_agent(agent_id: str, current_user: dict = Depends(require_admin)):
    result = await db.agents.update_one({"id": agent_id}, {"$set": {"status": "deleted"}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"success": True}

@api_router.get("/admin/agent-requests", response_model=List[AgentRequest])
async def get_all_requests(current_user: dict = Depends(require_admin)):
    reqs = await db.agent_requests.find({}, {"_id": 0}).to_list(1000)
    for req in reqs:
        if isinstance(req.get('created_at'), str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
    return reqs

@api_router.put("/admin/agent-requests/{request_id}")
async def update_request_status(request_id: str, status: str, current_user: dict = Depends(require_admin)):
    result = await db.agent_requests.update_one(
        {"id": request_id},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"success": True}

# Public TTS test endpoint (no auth required, limited to 3 tests per IP)
@api_router.post("/tts/test", response_model=TTSResponse)
async def test_tts(request: TTSRequest, http_request: Request):
    """Public endpoint to test agent voice - limited to 3 tests per IP"""
    if not eleven_client:
        raise HTTPException(status_code=503, detail="Voice service not configured")
    
    # Limit text length for public testing
    if len(request.text) > 100:
        raise HTTPException(status_code=400, detail="Text too long for test. Max 100 characters.")
    
    # Get client IP
    client_ip = http_request.client.host
    
    # Check test limit (3 tests per IP + voice_id)
    test_key = f"{client_ip}_{request.voice_id}"
    test_count = await db.voice_test_limits.count_documents({"test_key": test_key})
    
    if test_count >= 3:
        raise HTTPException(
            status_code=429, 
            detail="Limite de testes atingido. Faça login e compre o agente para uso ilimitado."
        )
    
    try:
        voice_settings = VoiceSettings(
            stability=request.stability,
            similarity_boost=request.similarity_boost,
            style=request.style,
            use_speaker_boost=request.use_speaker_boost
        )
        
        audio_generator = eleven_client.text_to_speech.convert(
            text=request.text,
            voice_id=request.voice_id,
            model_id="eleven_multilingual_v2",
            voice_settings=voice_settings
        )
        
        audio_data = b""
        for chunk in audio_generator:
            audio_data += chunk
        
        audio_b64 = base64.b64encode(audio_data).decode()
        
        tts_response = TTSResponse(
            audio_url=f"data:audio/mpeg;base64,{audio_b64}",
            text=request.text,
            voice_id=request.voice_id
        )
        
        # Record test usage
        await db.voice_test_limits.insert_one({
            "test_key": test_key,
            "ip": client_ip,
            "voice_id": request.voice_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return tts_response
        
    except Exception as e:
        logging.error(f"Error generating TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating TTS: {str(e)}")

# Check remaining tests
@api_router.get("/tts/test/remaining/{voice_id}")
async def get_remaining_tests(voice_id: str, http_request: Request):
    """Check how many tests remaining for this IP"""
    client_ip = http_request.client.host
    test_key = f"{client_ip}_{voice_id}"
    
    test_count = await db.voice_test_limits.count_documents({"test_key": test_key})
    remaining = max(0, 3 - test_count)
    
    return {
        "remaining": remaining,
        "total": 3,
        "used": test_count
    }

# Text-to-Speech endpoint (authenticated)
@api_router.post("/tts/generate", response_model=TTSResponse)
async def generate_tts(request: TTSRequest, current_user: dict = Depends(get_current_user)):
    """Generate text-to-speech audio"""
    if not eleven_client:
        raise HTTPException(status_code=503, detail="Voice service not configured")
    
    try:
        voice_settings = VoiceSettings(
            stability=request.stability,
            similarity_boost=request.similarity_boost,
            style=request.style,
            use_speaker_boost=request.use_speaker_boost
        )
        
        audio_generator = eleven_client.text_to_speech.convert(
            text=request.text,
            voice_id=request.voice_id,
            model_id="eleven_multilingual_v2",
            voice_settings=voice_settings
        )
        
        # Collect audio data
        audio_data = b""
        for chunk in audio_generator:
            audio_data += chunk
        
        # Convert to base64
        audio_b64 = base64.b64encode(audio_data).decode()
        
        tts_response = TTSResponse(
            audio_url=f"data:audio/mpeg;base64,{audio_b64}",
            text=request.text,
            voice_id=request.voice_id
        )
        
        # Save to database
        tts_dict = tts_response.model_dump()
        tts_dict['created_at'] = tts_dict['created_at'].isoformat()
        tts_dict['user_id'] = current_user['user_id']
        await db.tts_generations.insert_one(tts_dict)
        
        return tts_response
        
    except Exception as e:
        logging.error(f"Error generating TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating TTS: {str(e)}")

# Voice call endpoint
@api_router.post("/voice/call", response_model=VoiceCallResponse)
async def make_voice_call(request: VoiceCallRequest, current_user: dict = Depends(get_current_user)):
    """Initiate a voice call using agent's voice"""
    
    # Verify subscription
    subscription = await db.subscriptions.find_one({
        "user_id": current_user['user_id'],
        "agent_id": request.agent_id,
        "status": "active"
    })
    
    if not subscription:
        raise HTTPException(status_code=403, detail="No active subscription for this agent")
    
    # Get agent details
    agent = await db.agents.find_one({"id": request.agent_id})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Generate audio with voice AI
    if not eleven_client:
        raise HTTPException(status_code=503, detail="Voice service not configured")
    
    try:
        voice_settings = VoiceSettings(
            stability=0.5,
            similarity_boost=0.75,
            style=0.0,
            use_speaker_boost=True
        )
        
        audio_generator = eleven_client.text_to_speech.convert(
            text=request.message,
            voice_id=agent['elevenlabs_voice_id'],
            model_id="eleven_multilingual_v2",
            voice_settings=voice_settings
        )
        
        # Collect audio
        audio_data = b""
        for chunk in audio_generator:
            audio_data += chunk
        
        # In production, this would integrate with a telephony service (Twilio, etc)
        # For now, we'll just store the call record
        
        call_response = VoiceCallResponse(
            phone=request.phone,
            status="queued",
            message=request.message
        )
        
        # Save call to database
        call_dict = call_response.model_dump()
        call_dict['created_at'] = call_dict['created_at'].isoformat()
        call_dict['user_id'] = current_user['user_id']
        call_dict['agent_id'] = request.agent_id
        call_dict['subscription_id'] = subscription['id']
        await db.voice_calls.insert_one(call_dict)
        
        # Log webhook event
        webhook_log = WebhookLog(
            subscription_id=subscription['id'],
            event_type="call.initiated",
            payload={
                "call_id": call_response.id,
                "phone": request.phone,
                "status": "queued",
                "agent": {
                    "id": agent.get("id"),
                    "name": agent.get("name"),
                    "segment": agent.get("segment"),
                },
                "subscription": {
                    "id": subscription["id"],
                    "config": subscription.get("config"),
                    "custom_prompt": subscription.get("custom_prompt"),
                },
            }
        )
        log_dict = webhook_log.model_dump()
        log_dict['created_at'] = log_dict['created_at'].isoformat()
        await db.webhook_logs.insert_one(log_dict)
        
        return call_response
        
    except Exception as e:
        logging.error(f"Error making voice call: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error making voice call: {str(e)}")

# Get voice calls history
@api_router.get("/voice/calls")
async def get_voice_calls(current_user: dict = Depends(get_current_user)):
    """Get user's voice call history"""
    calls = await db.voice_calls.find({"user_id": current_user['user_id']}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return calls

# Webhook
@api_router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    webhook_response = await stripe_checkout.handle_webhook(body, signature)
    
    if webhook_response.payment_status == "paid":
        session_id = webhook_response.session_id
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        
        if transaction and transaction['payment_status'] != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid"}}
            )
            
            subscription = Subscription(
                user_id=transaction['user_id'],
                agent_id=transaction['agent_id'],
                status="active",
                start_date=datetime.now(timezone.utc),
                end_date=datetime.now(timezone.utc) + timedelta(days=30)
            )
            
            sub_dict = subscription.model_dump()
            for field in ['created_at', 'start_date', 'end_date']:
                sub_dict[field] = sub_dict[field].isoformat()
            
            await db.subscriptions.insert_one(sub_dict)
            
            # Create invoice
            agent = await db.agents.find_one({"id": transaction['agent_id']})
            invoice = Invoice(
                user_id=transaction['user_id'],
                subscription_id=subscription.id,
                amount=agent['price'],
                due_date=datetime.now(timezone.utc),
                paid_date=datetime.now(timezone.utc)
            )
            invoice_dict = invoice.model_dump()
            for field in ['invoice_date', 'due_date', 'paid_date', 'created_at']:
                if invoice_dict[field]:
                    invoice_dict[field] = invoice_dict[field].isoformat()
            await db.invoices.insert_one(invoice_dict)
    
    return {"success": True}

app.include_router(api_router)

# Serve uploaded images via /api/uploads with proper CORS
from fastapi.responses import FileResponse
import mimetypes

@app.get("/api/uploads/agents/{filename}")
async def serve_agent_image(filename: str):
    """Serve agent images with proper CORS headers"""
    file_path = UPLOAD_DIR / "agents" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Detect mime type
    mime_type, _ = mimetypes.guess_type(str(file_path))
    if not mime_type:
        mime_type = "application/octet-stream"
    
    return FileResponse(
        file_path,
        media_type=mime_type,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Cache-Control": "public, max-age=31536000"
        }
    )

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Agent Execution Models
class AgentExecuteRequest(BaseModel):
    input_text: Optional[str] = None
    input_audio_base64: Optional[str] = None  # Base64 encoded audio
    session_id: Optional[str] = None

class AgentExecuteResponse(BaseModel):
    output_text: str
    output_audio_base64: Optional[str] = None
    session_id: str

# Agent Execution with API Key
async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify API Key and return subscription"""
    api_key = credentials.credentials
    
    if not api_key.startswith("vapi_"):
        raise HTTPException(status_code=401, detail="Invalid API key format")
    
    subscription = await db.subscriptions.find_one({"api_key": api_key, "status": "active"})
    if not subscription:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    
    return subscription

@api_router.post("/agent/execute", response_model=AgentExecuteResponse)
async def execute_agent(
    request: AgentExecuteRequest,
    subscription: dict = Depends(verify_api_key)
):
    """
    Execute agent with text or voice input
    Requires API Key in Authorization header: Bearer vapi_...
    """
    try:
        # Get agent details
        agent = await db.agents.find_one({"id": subscription['agent_id']})
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Get EMERGENT_LLM_KEY
        emergent_llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_llm_key:
            raise HTTPException(status_code=503, detail="LLM service not configured")
        
        input_text = request.input_text
        
        # If audio input, transcribe it first with Whisper
        if request.input_audio_base64 and not input_text:
            try:
                from openai import OpenAI
                openai_client = OpenAI(api_key=emergent_llm_key)
                
                # Decode base64 audio
                audio_bytes = base64.b64decode(request.input_audio_base64)
                
                # Save temporarily
                temp_audio_path = f"/tmp/{uuid.uuid4()}.wav"
                with open(temp_audio_path, "wb") as f:
                    f.write(audio_bytes)
                
                # Transcribe with Whisper
                with open(temp_audio_path, "rb") as audio_file:
                    transcription = openai_client.audio.transcriptions.create(
                        file=audio_file,
                        model="whisper-1",
                        response_format="text"
                    )
                
                input_text = transcription if isinstance(transcription, str) else transcription.text
                
                # Cleanup
                os.remove(temp_audio_path)
                
            except Exception as e:
                logging.error(f"Error transcribing audio: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error transcribing audio: {str(e)}")
        
        if not input_text:
            raise HTTPException(status_code=400, detail="Either input_text or input_audio_base64 is required")
        
        # Build system message combining base_prompt + custom_prompt
        system_message = ""
        if agent.get('base_prompt'):
            system_message += agent['base_prompt']
        
        if subscription.get('custom_prompt'):
            system_message += f"\n\n{subscription['custom_prompt']}"
        
        if subscription.get('config'):
            config = subscription['config']
            context_parts = []
            if config.get('company_name'):
                context_parts.append(f"Empresa: {config['company_name']}")
            if config.get('product_service'):
                context_parts.append(f"Produto/Serviço: {config['product_service']}")
            if config.get('target_audience'):
                context_parts.append(f"Público-alvo: {config['target_audience']}")
            if config.get('tone'):
                context_parts.append(f"Tom de voz: {config['tone']}")
            
            if context_parts:
                system_message += "\n\nContexto da empresa:\n" + "\n".join(context_parts)
        
        if not system_message:
            system_message = "Você é um assistente de voz inteligente e prestativo."
        
        # Generate session_id if not provided
        session_id = request.session_id or str(uuid.uuid4())
        
        # Process with LLM using emergentintegrations
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            chat = LlmChat(
                api_key=emergent_llm_key,
                session_id=session_id,
                system_message=system_message
            )
            
            # Set the model based on agent configuration
            chat.with_model(agent.get('llm_provider', 'openai'), agent.get('llm_model', 'gpt-5'))
            
            user_message = UserMessage(text=input_text)
            response_text = await chat.send_message(user_message)
            
        except Exception as e:
            logging.error(f"Error processing with LLM: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing with LLM: {str(e)}")
        
        # Generate audio response with ElevenLabs
        output_audio_base64 = None
        if eleven_client and agent.get('elevenlabs_voice_id'):
            try:
                voice_settings = VoiceSettings(
                    stability=0.5,
                    similarity_boost=0.75,
                    style=0.0,
                    use_speaker_boost=True
                )
                
                audio_generator = eleven_client.text_to_speech.convert(
                    text=response_text,
                    voice_id=agent['elevenlabs_voice_id'],
                    model_id="eleven_multilingual_v2",
                    voice_settings=voice_settings
                )
                
                # Collect audio
                audio_data = b""
                for chunk in audio_generator:
                    audio_data += chunk
                
                # Encode to base64
                output_audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                
            except Exception as e:
                logging.error(f"Error generating audio: {str(e)}")
                # Continue without audio if TTS fails
        
        # Log the execution
        execution_log = {
            "id": str(uuid.uuid4()),
            "subscription_id": subscription['id'],
            "agent_id": agent['id'],
            "session_id": session_id,
            "input_text": input_text,
            "output_text": response_text,
            "llm_provider": agent.get('llm_provider', 'openai'),
            "llm_model": agent.get('llm_model', 'gpt-5'),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.agent_executions.insert_one(execution_log)
        
        return AgentExecuteResponse(
            output_text=response_text,
            output_audio_base64=output_audio_base64,
            session_id=session_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error executing agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error executing agent: {str(e)}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
