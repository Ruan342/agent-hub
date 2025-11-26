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
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
import asyncio
from fastapi import BackgroundTasks

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
    mascot_image_hero_url: Optional[str] = None  # Imagem grande do hero (topo)
    mascot_image_feature_url: Optional[str] = None  # Imagem da seção de recursos
    mascot_image_cta_url: Optional[str] = None  # Imagem do CTA final
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
    mascot_image_hero_url: Optional[str] = None
    mascot_image_feature_url: Optional[str] = None
    mascot_image_cta_url: Optional[str] = None
    elevenlabs_voice_id: str
    base_prompt: Optional[str] = None
    voice_sample_url: Optional[str] = None
    llm_provider: str = "openai"
    llm_model: str = "gpt-5"

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    segment: Optional[str] = None
    price: Optional[float] = None
    features: Optional[List[str]] = None
    mascot_image_url: Optional[str] = None
    mascot_image_hero_url: Optional[str] = None
    mascot_image_feature_url: Optional[str] = None
    mascot_image_cta_url: Optional[str] = None
    elevenlabs_voice_id: Optional[str] = None
    base_prompt: Optional[str] = None
    voice_sample_url: Optional[str] = None
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None

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

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    audio_base64: Optional[str] = None

# Integration Models
class Integration(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    subscription_id: str  # qual agente usar
    type: str  # "email", "whatsapp", "crm", "webhook", "widget"
    name: str
    config: Dict
    status: str = "active"  # active, inactive, error
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IntegrationCreate(BaseModel):
    subscription_id: str
    type: str
    name: str
    config: Dict

class IntegrationUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[Dict] = None
    status: Optional[str] = None

# Email Integration
class EmailConfig(BaseModel):
    sendgrid_api_key: str
    from_email: str
    from_name: str
    reply_to: Optional[str] = None
    # Para ler emails (IMAP) - Fase 2
    imap_enabled: bool = False
    imap_server: Optional[str] = None
    imap_email: Optional[str] = None
    imap_password: Optional[str] = None

class SendEmailRequest(BaseModel):
    integration_id: str
    to_email: str
    subject: str
    template: Optional[str] = "default"
    variables: Optional[Dict] = None

# WhatsApp Integration
class WhatsAppConfig(BaseModel):
    business_account_id: str
    phone_number_id: str
    access_token: str
    webhook_verify_token: str

class SendWhatsAppRequest(BaseModel):
    integration_id: str
    to_phone: str
    message: str
    message_type: str = "text"  # text, template, media

# CRM Integration
class CRMConfig(BaseModel):
    crm_type: str  # salesforce, hubspot, pipedrive, custom
    api_key: Optional[str] = None
    api_url: Optional[str] = None
    webhook_url: Optional[str] = None
    custom_fields_mapping: Optional[Dict] = None

class CRMSyncRequest(BaseModel):
    integration_id: str
    action: str  # create, update, upsert
    contact_data: Dict

# Webhook Integration
class WebhookConfig(BaseModel):
    webhook_url: str
    secret: Optional[str] = None
    events: List[str] = ["message_received", "message_sent"]
    headers: Optional[Dict] = None

# Widget Integration
class WidgetConfig(BaseModel):
    domain_whitelist: List[str]
    theme_color: str = "#7C3AED"
    position: str = "bottom-right"  # bottom-right, bottom-left
    greeting_message: str = "Olá! Como posso ajudar?"
    voice_enabled: bool = True
    text_enabled: bool = True

class ChatSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subscription_id: str
    user_id: str
    agent_id: str
    title: Optional[str] = None  # Auto-generated from first message
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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


class AgentExecuteRequest(BaseModel):
    input_text: Optional[str] = None
    input_audio_base64: Optional[str] = None
    session_id: Optional[str] = None

class AgentExecuteResponse(BaseModel):
    output_text: str
    output_audio_base64: Optional[str] = None
    session_id: str

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

async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify API Key and return subscription"""
    api_key = credentials.credentials
    
    if not api_key.startswith("vapi_"):
        raise HTTPException(status_code=401, detail="Invalid API key format")
    
    subscription = await db.subscriptions.find_one({"api_key": api_key, "status": "active"})
    if not subscription:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    
    return subscription


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
        if agent.get('mascot_image_hero_url'):
            agent['mascot_image_hero_url'] = convert_relative_to_absolute_url(agent['mascot_image_hero_url'], request)
        if agent.get('mascot_image_feature_url'):
            agent['mascot_image_feature_url'] = convert_relative_to_absolute_url(agent['mascot_image_feature_url'], request)
        if agent.get('mascot_image_cta_url'):
            agent['mascot_image_cta_url'] = convert_relative_to_absolute_url(agent['mascot_image_cta_url'], request)
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
    if agent.get('mascot_image_hero_url'):
        agent['mascot_image_hero_url'] = convert_relative_to_absolute_url(agent['mascot_image_hero_url'], request)
    if agent.get('mascot_image_feature_url'):
        agent['mascot_image_feature_url'] = convert_relative_to_absolute_url(agent['mascot_image_feature_url'], request)
    if agent.get('mascot_image_cta_url'):
        agent['mascot_image_cta_url'] = convert_relative_to_absolute_url(agent['mascot_image_cta_url'], request)
    if agent.get('voice_sample_url'):
        agent['voice_sample_url'] = convert_relative_to_absolute_url(agent['voice_sample_url'], request)
    return Agent(**agent)

# Audio upload endpoint
@api_router.post("/admin/upload-audio")
async def upload_audio(file: UploadFile = File(...), current_user: dict = Depends(require_admin), request: Request = None):
    """Upload audio sample for agent"""
    # Validate audio type
    allowed_types = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File must be an audio file (MP3, WAV, OGG, or WebM)")
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1]
    if file_ext.lower() not in ['mp3', 'wav', 'ogg', 'webm', 'mpeg']:
        file_ext = 'mp3'  # default
    filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = UPLOAD_DIR / "audio" / filename
    
    # Create audio directory if doesn't exist
    (UPLOAD_DIR / "audio").mkdir(exist_ok=True)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Build full URL via /api/uploads to ensure proper CORS
    if request:
        base_url = str(request.base_url).rstrip('/')
        # Force HTTPS in production
        if 'emergentagent.com' in base_url or 'preview' in base_url:
            base_url = base_url.replace('http://', 'https://')
        # Use /api/uploads path to go through FastAPI with CORS
        audio_url = f"{base_url}/api/uploads/audio/{filename}"
    else:
        # Fallback to relative URL
        audio_url = f"/api/uploads/audio/{filename}"
    
    return {"url": audio_url}

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
    
    # Optimize image without aggressive resizing
    try:
        img = Image.open(file_path)
        
        # Convert RGBA to RGB for JPEG
        if img.mode == 'RGBA':
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            rgb_img.paste(img, mask=img.split()[3])
            img = rgb_img
        
        # Only resize if image is extremely large (> 2048px)
        # This preserves quality for hero images (1920x709)
        max_dimension = max(img.width, img.height)
        if max_dimension > 2048:
            # Calculate new dimensions maintaining aspect ratio
            ratio = 2048 / max_dimension
            new_width = int(img.width * ratio)
            new_height = int(img.height * ratio)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Save with high quality
        if file_ext.lower() in ['jpg', 'jpeg']:
            img.save(file_path, 'JPEG', quality=95, optimize=True)
        elif file_ext.lower() == 'png':
            img.save(file_path, 'PNG', optimize=True)
        else:
            img.save(file_path, quality=95)
            
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")
    
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

# Chat Sessions endpoints
@api_router.post("/chat-sessions")
async def create_chat_session(subscription_id: str, current_user: dict = Depends(get_current_user)):
    """Create a new chat session"""
    # Verify subscription belongs to user
    sub = await db.subscriptions.find_one({"id": subscription_id, "user_id": current_user['user_id']})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    session = {
        "id": str(uuid.uuid4()),
        "subscription_id": subscription_id,
        "user_id": current_user['user_id'],
        "agent_id": sub['agent_id'],
        "title": None,
        "messages": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_sessions.insert_one(session)
    return {"id": session['id'], "title": session['title'], "created_at": session['created_at']}

@api_router.get("/chat-sessions/subscription/{subscription_id}")
async def get_chat_sessions(subscription_id: str, current_user: dict = Depends(get_current_user)):
    """Get all chat sessions for a subscription"""
    # Verify subscription belongs to user
    sub = await db.subscriptions.find_one({"id": subscription_id, "user_id": current_user['user_id']})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    sessions = await db.chat_sessions.find(
        {"subscription_id": subscription_id, "user_id": current_user['user_id']},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    return sessions

@api_router.get("/chat-sessions/{session_id}")
async def get_chat_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific chat session with all messages"""
    session = await db.chat_sessions.find_one(
        {"id": session_id, "user_id": current_user['user_id']},
        {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session

@api_router.post("/chat-sessions/{session_id}/messages")
async def add_message_to_session(session_id: str, message: ChatMessage, current_user: dict = Depends(get_current_user)):
    """Add a message to a chat session"""
    session = await db.chat_sessions.find_one({"id": session_id, "user_id": current_user['user_id']})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Auto-generate title from first user message
    update_data = {
        "$push": {"messages": message.dict()},
        "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
    }
    
    if not session.get('messages') and message.role == "user":
        # Generate title from first 50 chars of first message
        title = message.content[:50] + ("..." if len(message.content) > 50 else "")
        update_data["$set"]["title"] = title
    
    await db.chat_sessions.update_one(
        {"id": session_id},
        update_data
    )
    
    return {"success": True}

@api_router.delete("/chat-sessions/{session_id}")
async def delete_chat_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a chat session"""
    result = await db.chat_sessions.delete_one({"id": session_id, "user_id": current_user['user_id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
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
async def update_agent(agent_id: str, agent_data: AgentUpdate, current_user: dict = Depends(require_admin)):
    # Only update fields that are explicitly provided (not None or empty)
    update_dict = agent_data.model_dump(exclude_unset=True, exclude_none=True)
    
    # Remove fields that shouldn't be updated or are empty strings
    update_dict = {k: v for k, v in update_dict.items() if v != ""}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.agents.update_one({"id": agent_id}, {"$set": update_dict})
    if result.modified_count == 0:
        # Check if agent exists
        existing = await db.agents.find_one({"id": agent_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Agent not found")
        # Agent exists but no changes were made
    
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

@api_router.post("/admin/duplicate-agent/{agent_id}", response_model=Agent)
async def duplicate_agent(agent_id: str, current_user: dict = Depends(require_admin)):
    """Duplicate an existing agent with all its configurations"""
    # Find the original agent
    original_agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not original_agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Create a new agent with duplicated data
    duplicated_agent = Agent(**original_agent)
    duplicated_agent.id = str(uuid.uuid4())  # Generate new ID
    duplicated_agent.name = f"(Cópia) {original_agent['name']}"  # Add prefix to name
    duplicated_agent.created_at = datetime.now(timezone.utc)  # Set new creation date
    
    # Save to database
    agent_dict = duplicated_agent.model_dump()
    agent_dict['created_at'] = agent_dict['created_at'].isoformat()
    await db.agents.insert_one(agent_dict)
    
    return duplicated_agent


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
        
        # Add multilingual support instruction
        system_message += "\n\n[IMPORTANTE - SUPORTE MULTILÍNGUE]\nVocê deve detectar automaticamente o idioma do usuário e responder no mesmo idioma. Suporte completo para: Português (pt-BR), Espanhol (es) e Inglês (en). Se o usuário escrever em espanhol, responda em espanhol. Se escrever em inglês, responda em inglês. Se escrever em português, responda em português. Mantenha naturalidade e fluidez no idioma escolhido."
        
        # Generate session_id if not provided
        session_id = request.session_id or str(uuid.uuid4())
        
        # Process with LLM - Try with custom OpenAI key first, fallback to Emergent LLM
        response_text = None
        openai_api_key = os.environ.get('OPENAI_API_KEY')
        
        # Try with direct OpenAI if key is provided
        if openai_api_key and openai_api_key.strip():
            try:
                from openai import OpenAI
                openai_client = OpenAI(api_key=openai_api_key)
                
                # Map model names to correct OpenAI models
                model_name = agent.get('llm_model', 'gpt-4o')
                if model_name == 'gpt-5':
                    model_name = 'gpt-4o'  # Use gpt-4o as gpt-5 doesn't exist yet
                
                completion = openai_client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": input_text}
                    ]
                )
                
                response_text = completion.choices[0].message.content
                logging.info("Used direct OpenAI API successfully")
                
            except Exception as e:
                logging.warning(f"OpenAI direct API failed: {str(e)}, trying Emergent LLM...")
        
        # Fallback to Emergent LLM if OpenAI didn't work
        if not response_text:
            try:
                from emergentintegrations.llm.chat import LlmChat, UserMessage
                import litellm
                
                # Disable budget limits entirely
                litellm.max_budget = float('inf')  # Infinite budget
                litellm._current_cost = 0
                
                chat = LlmChat(
                    api_key=emergent_llm_key,
                    session_id=session_id,
                    system_message=system_message
                )
                
                # Set the model based on agent configuration
                chat.with_model(agent.get('llm_provider', 'openai'), agent.get('llm_model', 'gpt-5'))
                
                user_message = UserMessage(text=input_text)
                response_text = await chat.send_message(user_message)
                logging.info("Used Emergent LLM successfully")
                
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
        
        # Save messages to chat session if session_id provided
        logging.info(f"Session ID received: {session_id}")
        if session_id and session_id.startswith("chat_"):
            # Extract actual session ID (remove "chat_" or "web_" prefix)
            actual_session_id = session_id.split("_", 1)[1] if "_" in session_id else session_id
            logging.info(f"Saving to session: {actual_session_id}")
            
            # Check if session exists, create if not
            session = await db.chat_sessions.find_one({"id": actual_session_id})
            if not session:
                # Create new session
                session = {
                    "id": actual_session_id,
                    "subscription_id": subscription['id'],
                    "user_id": subscription['user_id'],
                    "agent_id": agent['id'],
                    "title": input_text[:50] + ("..." if len(input_text) > 50 else ""),
                    "messages": [],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.chat_sessions.insert_one(session)
            
            # Add messages to session
            user_message = {
                "role": "user",
                "content": input_text,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "audio_base64": None
            }
            
            assistant_message = {
                "role": "assistant",
                "content": response_text,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "audio_base64": output_audio_base64
            }
            
            # Update data to push messages
            update_data = {
                "$push": {"messages": {"$each": [user_message, assistant_message]}},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
            
            # If this is the first message (title is None or empty), set the title
            if not session.get('messages') and (session.get('title') is None or session.get('title') == ''):
                update_data["$set"]["title"] = input_text[:50] + ("..." if len(input_text) > 50 else "")
            
            await db.chat_sessions.update_one(
                {"id": actual_session_id},
                update_data
            )
        
        return AgentExecuteResponse(
            output_text=response_text,
            output_audio_base64=output_audio_base64,
            session_id=session_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Unexpected error in execute_agent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== INTEGRATION ENDPOINTS ====================

@api_router.post("/integrations", response_model=Integration)
async def create_integration(
    integration: IntegrationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new integration"""
    try:
        # Verify subscription belongs to user
        subscription = await db.subscriptions.find_one({
            "id": integration.subscription_id,
            "user_id": current_user['user_id']
        })
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Validate config based on type
        if integration.type == "email":
            EmailConfig(**integration.config)
        elif integration.type == "whatsapp":
            WhatsAppConfig(**integration.config)
        elif integration.type == "crm":
            CRMConfig(**integration.config)
        elif integration.type == "webhook":
            WebhookConfig(**integration.config)
        elif integration.type == "widget":
            WidgetConfig(**integration.config)
        else:
            raise HTTPException(status_code=400, detail="Invalid integration type")
        
        new_integration = Integration(
            user_id=current_user['user_id'],
            subscription_id=integration.subscription_id,
            type=integration.type,
            name=integration.name,
            config=integration.config
        )
        
        await db.integrations.insert_one(new_integration.model_dump())
        
        logging.info(f"Integration created: {new_integration.id} for user {current_user['user_id']}")
        
        return new_integration
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating integration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/integrations")
async def list_integrations(
    current_user: dict = Depends(get_current_user)
):
    """List all integrations for current user"""
    try:
        integrations = await db.integrations.find(
            {"user_id": current_user['user_id']},
            {"_id": 0}
        ).to_list(1000)
        
        return {"integrations": integrations}
        
    except Exception as e:
        logging.error(f"Error listing integrations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/integrations/{integration_id}", response_model=Integration)
async def get_integration(
    integration_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific integration"""
    try:
        integration = await db.integrations.find_one({
            "id": integration_id,
            "user_id": current_user['user_id']
        }, {"_id": 0})
        
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        return Integration(**integration)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting integration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/integrations/{integration_id}", response_model=Integration)
async def update_integration(
    integration_id: str,
    update: IntegrationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update integration"""
    try:
        integration = await db.integrations.find_one({
            "id": integration_id,
            "user_id": current_user['user_id']
        })
        
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.integrations.update_one(
            {"id": integration_id},
            {"$set": update_data}
        )
        
        updated_integration = await db.integrations.find_one(
            {"id": integration_id},
            {"_id": 0}
        )
        
        return Integration(**updated_integration)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating integration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/integrations/{integration_id}")
async def delete_integration(
    integration_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete integration"""
    try:
        result = await db.integrations.delete_one({
            "id": integration_id,
            "user_id": current_user['user_id']
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        return {"message": "Integration deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting integration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Email Integration Endpoints
async def send_email_via_sendgrid(
    from_email: str,
    from_name: str,
    to_email: str,
    subject: str,
    html_content: str,
    api_key: str,
    reply_to: Optional[str] = None
):
    """Send email using SendGrid"""
    try:
        message = Mail(
            from_email=Email(from_email, from_name),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_content)
        )
        
        if reply_to:
            message.reply_to = Email(reply_to)
        
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        
        logging.info(f"Email sent to {to_email}, status: {response.status_code}")
        
        return {
            "success": True,
            "status_code": response.status_code,
            "message_id": response.headers.get('X-Message-Id')
        }
        
    except Exception as e:
        logging.error(f"SendGrid error: {str(e)}")
        raise

@api_router.post("/integrations/email/send")
async def send_email(
    request: SendEmailRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Send email via integration"""
    try:
        # Get integration
        integration = await db.integrations.find_one({
            "id": request.integration_id,
            "user_id": current_user['user_id'],
            "type": "email"
        })
        
        if not integration:
            raise HTTPException(status_code=404, detail="Email integration not found")
        
        if integration.get('status') != 'active':
            raise HTTPException(status_code=400, detail="Integration is not active")
        
        config = EmailConfig(**integration['config'])
        
        # Build email content
        if request.template and request.variables:
            # Simple template replacement
            html_content = f"""
            <html>
                <body>
                    <h1>{request.variables.get('title', 'Mensagem')}</h1>
                    <p>{request.variables.get('message', '')}</p>
                </body>
            </html>
            """
        else:
            html_content = f"""
            <html>
                <body>
                    <p>{request.subject}</p>
                </body>
            </html>
            """
        
        # Send email in background
        async def send_email_task():
            try:
                await send_email_via_sendgrid(
                    from_email=config.from_email,
                    from_name=config.from_name,
                    to_email=request.to_email,
                    subject=request.subject,
                    html_content=html_content,
                    api_key=config.sendgrid_api_key,
                    reply_to=config.reply_to
                )
            except Exception as e:
                logging.error(f"Background email task failed: {str(e)}")
        
        background_tasks.add_task(send_email_task)
        
        return {
            "status": "queued",
            "message": "Email queued for sending",
            "to_email": request.to_email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error sending email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/integrations/email/test")
async def test_email_integration(
    integration_id: str,
    test_email: str,
    current_user: dict = Depends(get_current_user)
):
    """Test email integration"""
    try:
        integration = await db.integrations.find_one({
            "id": integration_id,
            "user_id": current_user['user_id'],
            "type": "email"
        })
        
        if not integration:
            raise HTTPException(status_code=404, detail="Email integration not found")
        
        config = EmailConfig(**integration['config'])
        
        result = await send_email_via_sendgrid(
            from_email=config.from_email,
            from_name=config.from_name,
            to_email=test_email,
            subject="Teste de Integração - VoiceAI Hub",
            html_content="<html><body><h1>Sucesso!</h1><p>Sua integração de email está funcionando corretamente.</p></body></html>",
            api_key=config.sendgrid_api_key,
            reply_to=config.reply_to
        )
        
        return {
            "success": True,
            "message": "Email de teste enviado com sucesso",
            "details": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error testing email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao testar email: {str(e)}")

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

@app.get("/api/uploads/audio/{filename}")
async def serve_agent_audio(filename: str):
    """Serve agent audio samples with proper CORS headers"""
    file_path = UPLOAD_DIR / "audio" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio not found")
    
    # Detect mime type
    mime_type, _ = mimetypes.guess_type(str(file_path))
    if not mime_type:
        # Default to audio/mpeg for mp3 files
        if filename.endswith('.mp3'):
            mime_type = "audio/mpeg"
        elif filename.endswith('.wav'):
            mime_type = "audio/wav"
        elif filename.endswith('.ogg'):
            mime_type = "audio/ogg"
        else:
            mime_type = "application/octet-stream"
    
    return FileResponse(
        file_path,
        media_type=mime_type,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Cache-Control": "public, max-age=31536000",
            "Accept-Ranges": "bytes"
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

async def shutdown_db_client():
    client.close()
