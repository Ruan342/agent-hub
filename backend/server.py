from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, File, UploadFile, Body
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
import stripe
from elevenlabs import ElevenLabs, VoiceSettings
import base64
import io
import json
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
import asyncio

import sys
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
from fastapi import BackgroundTasks
import httpx
from pathlib import Path

from passlib.context import CryptContext
import jwt

# ================== ENV CONFIG ==================
ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")

# ================== DATABASE ==================
mongo_url = os.getenv("MONGO_URL")
db_name = os.getenv("DB_NAME", "agenthub")

if not mongo_url:
    raise Exception("❌ MONGO_URL não definido no .env")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# ================== UPLOAD CONFIG ==================
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR_PROJECT = BASE_DIR.parent
_env_upload = os.getenv("UPLOAD_DIR", "uploads")
if Path(_env_upload).is_absolute():
    UPLOAD_DIR = Path(_env_upload)
else:
    UPLOAD_DIR = ROOT_DIR_PROJECT / _env_upload

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "agents").mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "audio").mkdir(parents=True, exist_ok=True)

# ================== JWT ==================
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError(
        "❌ JWT_SECRET não definido no .env. "
        "Defina um secret forte (ex.: openssl rand -hex 32) antes de iniciar o servidor."
    )
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
try:
    JWT_EXPIRATION_DAYS = int(os.environ.get('JWT_EXPIRATION_DAYS', '30'))
except ValueError:
    JWT_EXPIRATION_DAYS = 30

# ================== STRIPE ==================
# Never ship a fallback test/live key — missing key must be a config error.
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY') or os.environ.get('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')
if not STRIPE_API_KEY:
    logging.warning("⚠️  STRIPE_API_KEY não definido no .env — endpoints de pagamento ficarão inoperantes.")

# ================== ELEVENLABS ==================
ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')
eleven_client = ElevenLabs(api_key=ELEVENLABS_API_KEY) if ELEVENLABS_API_KEY else None

# ================== N8N WEBHOOKS ==================
# Centralized map of outbound n8n webhook URLs keyed by agent segment.
# Every URL can be overridden by an env var so nothing is hardcoded in source.
N8N_WEBHOOK_BASE = os.environ.get(
    "N8N_WEBHOOK_BASE",
    "https://corefy.app.n8n.cloud/webhook"
).rstrip("/")

N8N_WEBHOOKS: Dict[str, str] = {
    "ecommerce":     os.environ.get("N8N_WEBHOOK_ECOMMERCE",     f"{N8N_WEBHOOK_BASE}/e_commerce_manager"),
    "sdr":           os.environ.get("N8N_WEBHOOK_SDR",           f"{N8N_WEBHOOK_BASE}/vendedor_outbound"),
    "suporte":       os.environ.get("N8N_WEBHOOK_SUPORTE",       f"{N8N_WEBHOOK_BASE}/suporte+knowledge"),
    "pos_vendas":    os.environ.get("N8N_WEBHOOK_POS_VENDAS",    f"{N8N_WEBHOOK_BASE}/pos_venda_retenção"),
    "lidia_prospec": os.environ.get("N8N_WEBHOOK_LIDIA_PROSPEC", f"{N8N_WEBHOOK_BASE}/lidia-prospec"),
}
N8N_TITLE_WEBHOOK = os.environ.get("N8N_WEBHOOK_TITLE", f"{N8N_WEBHOOK_BASE}/titulo_chat")

security = HTTPBearer(auto_error=False)

# Create the main app
app = FastAPI()
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
api_router = APIRouter(prefix="/api")

# ================== MODELS (inlined from models/schemas.py) ==================
import sys as _sys
import os as _os
_sys.path.insert(0, _os.path.dirname(__file__))

from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str = "customer"
    must_change_password: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ResetPasswordRequest(BaseModel):
    new_password: str

class Agent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    segment: str
    price: float
    features: List[str]
    mascot_image_url: str
    mascot_image_hero_url: Optional[str] = None
    mascot_image_feature_url: Optional[str] = None
    mascot_image_cta_url: Optional[str] = None
    voice_call_image_url: Optional[str] = None
    elevenlabs_voice_id: str
    base_prompt: Optional[str] = None
    voice_sample_url: Optional[str] = None
    llm_provider: str = "openai"
    llm_model: str = "gpt-5"
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
    voice_call_image_url: Optional[str] = None
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
    voice_call_image_url: Optional[str] = None
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
    status: str = "active"
    api_key: str = Field(default_factory=lambda: f"ag_{uuid.uuid4().hex}")
    webhook_url: Optional[str] = None
    config: Dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_date: Optional[datetime] = None

class SubscriptionUpdate(BaseModel):
    webhook_url: str

class SubscriptionConfigUpdate(BaseModel):
    custom_prompt: Optional[str] = None
    config: Optional[Dict] = None

class ChatLink(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    subscription_id: str
    agent_id: str
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    agent_id: str
    subscription_id: str
    status: str = "active"
    is_client_chat: bool = False
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    chat_link_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_interaction: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    audio_base64: Optional[str] = None

class Integration(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    subscription_id: str
    type: str
    name: str
    config: Dict
    status: str = "active"
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

class EmailConfig(BaseModel):
    sendgrid_api_key: str
    from_email: str
    from_name: str
    reply_to: Optional[str] = None
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

class WhatsAppConfig(BaseModel):
    business_account_id: str
    phone_number_id: str
    access_token: str
    webhook_verify_token: str
    process_images: bool = True
    process_audio: bool = True

class SendWhatsAppRequest(BaseModel):
    integration_id: str
    to_phone: str
    message: str
    message_type: str = "text"

class WhatsAppIncomingMessage(BaseModel):
    from_phone: str
    message_text: Optional[str] = None
    message_type: str
    media_url: Optional[str] = None
    media_id: Optional[str] = None
    timestamp: str

class CRMConfig(BaseModel):
    crm_type: str
    api_key: Optional[str] = None
    api_url: Optional[str] = None
    webhook_url: Optional[str] = None
    custom_fields_mapping: Optional[Dict] = None
    custom_headers: Optional[Dict] = None
    auto_sync: bool = True

class CRMSyncRequest(BaseModel):
    integration_id: str
    action: str
    contact_data: Dict

class CRMContactData(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    custom_fields: Optional[Dict] = None

class WebhookConfig(BaseModel):
    webhook_url: str
    secret: Optional[str] = None
    events: List[str] = ["message_received", "message_sent"]
    headers: Optional[Dict] = None

class WidgetConfig(BaseModel):
    domain_whitelist: List[str]
    theme_color: str = "#2563EB"
    position: str = "bottom-right"
    greeting_message: str = "Olá! Como posso ajudar?"
    voice_enabled: bool = True
    text_enabled: bool = True

class AnalyticsEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    subscription_id: str
    agent_id: str
    integration_type: str
    event_type: str
    metadata: Optional[Dict] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AnalyticsMetrics(BaseModel):
    total_messages: int
    messages_by_channel: Dict[str, int]
    messages_by_day: List[Dict]
    avg_response_time: float
    top_agents: List[Dict]
    error_rate: float
    active_integrations: int

class RateLimit(BaseModel):
    subscription_id: str
    limit_per_minute: int = 60
    limit_per_hour: int = 1000
    limit_per_day: int = 10000
    current_minute_count: int = 0
    current_hour_count: int = 0
    current_day_count: int = 0
    reset_minute: Optional[datetime] = None
    reset_hour: Optional[datetime] = None
    reset_day: Optional[datetime] = None

class MonitoringLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    level: str
    source: str
    message: str
    metadata: Optional[Dict] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved: bool = False

class EcommerceKnowledgeBase(BaseModel):
    duvidas: List[str] = []
    recomendacoes: List[Dict] = []
    combos: List[Dict] = []
    estoque: List[Dict] = []

class FinanceiroKnowledgeBase(BaseModel):
    vencimentos: List[Dict] = []

class PosVendasKnowledgeBase(BaseModel):
    processo_vendas: str = ""
    clientes: List[Dict] = []
    politicas: Dict = {}

class NutricaoTreinoKnowledgeBase(BaseModel):
    contexto: str = ""

class KnowledgeBaseConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    subscription_id: str
    agent_type: str
    ecommerce_data: Optional[EcommerceKnowledgeBase] = None
    financeiro_data: Optional[FinanceiroKnowledgeBase] = None
    posvendas_data: Optional[PosVendasKnowledgeBase] = None
    nutricao_data: Optional[NutricaoTreinoKnowledgeBase] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class KnowledgeBaseUpdateRequest(BaseModel):
    ecommerce_data: Optional[EcommerceKnowledgeBase] = None
    financeiro_data: Optional[FinanceiroKnowledgeBase] = None
    posvendas_data: Optional[PosVendasKnowledgeBase] = None
    nutricao_data: Optional[NutricaoTreinoKnowledgeBase] = None

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

# ================== END MODELS ==================

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
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization header required")
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ==================== AUTHENTICATION ====================

@api_router.post("/auth/register")
async def register_user(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    hashed_password = hash_password(user.password)
    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "name": user.name,
        "email": user.email,
        "password_hash": hashed_password,
        "role": "customer",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    token = jwt.encode(
        {
            "user_id": user_id, 
            "email": user.email, 
            "role": "customer", 
            "exp": datetime.now(timezone.utc) + timedelta(days=7)
        },
        JWT_SECRET,
        algorithm="HS256"
    )
    
    return {
        "token": token, 
        "user": {
            "id": user_id, 
            "name": user.name, 
            "email": user.email, 
            "role": "customer"
        }
    }

@api_router.post("/auth/login")
async def login_user(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
        
    # Compat: se a conta for da base antiga e não tiver password_hash configurado...
    pass_hash = db_user.get("password_hash")
    if not pass_hash or not verify_password(user.password, pass_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    token = jwt.encode(
        {
            "user_id": db_user.get("id"), 
            "email": db_user.get("email"), 
            "role": db_user.get("role", "customer"), 
            "exp": datetime.now(timezone.utc) + timedelta(days=7)
        },
        JWT_SECRET,
        algorithm="HS256"
    )
    
    return {
        "token": token, 
        "user": {
            "id": db_user.get("id"), 
            "name": db_user.get("name"), 
            "email": db_user.get("email"), 
            "role": db_user.get("role", "customer"),
            "must_change_password": db_user.get("must_change_password", False)
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ==================== PUBLIC / ADMIN AGENTS ====================

@api_router.get("/agents")
async def list_agents():
    agents = await db.agents.find().to_list(length=100)
    for a in agents:
        if "_id" in a:
            a["_id"] = str(a["_id"])
    return agents

@api_router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    agent = await db.agents.find_one({"id": agent_id})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if "_id" in agent:
        agent["_id"] = str(agent["_id"])
    return agent

# ==================== SUBSCRIPTIONS ====================

@api_router.post("/subscriptions")
async def create_subscription(sub_data: dict, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    agent_id = sub_data.get("agent_id")
    
    if not agent_id:
        raise HTTPException(status_code=400, detail="Missing agent_id")
        
    agent = await db.agents.find_one({"id": agent_id})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    existing_sub = await db.subscriptions.find_one({"user_id": user_id, "agent_id": agent_id, "status": "active"})
    if existing_sub:
        raise HTTPException(status_code=400, detail="Você já possui uma assinatura ativa para este agente.")
        
    quantity = sub_data.get("quantity", 1)
    
    subscription = Subscription(
        user_id=user_id,
        agent_id=agent_id,
        status="active",
        config={"quantity": quantity}
    )
    
    sub_dict = subscription.model_dump()
    await db.subscriptions.insert_one(sub_dict)
    
    if "_id" in sub_dict:
        sub_dict["_id"] = str(sub_dict["_id"])
        
    return sub_dict

@api_router.get("/subscriptions/me")
async def get_my_subscriptions(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    subs = await db.subscriptions.find({"user_id": user_id, "status": "active"}).to_list(length=100)
    
    for sub in subs:
        if "_id" in sub:
            sub["_id"] = str(sub["_id"])
        agent = await db.agents.find_one({"id": sub["agent_id"]})
        if agent:
            if "_id" in agent:
                agent["_id"] = str(agent["_id"])
            sub["agent"] = agent
            
    return subs

@api_router.put("/subscriptions/{sub_id}/config")
async def update_subscription_config(sub_id: str, config_data: dict, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    
    sub = await db.subscriptions.find_one({"id": sub_id, "user_id": user_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found or access denied")
        
    update_fields = {}
    if "config" in config_data:
        update_fields["config"] = config_data["config"]
    if "webhook_url" in config_data:
        update_fields["webhook_url"] = config_data["webhook_url"]
        
    if update_fields:
        await db.subscriptions.update_one(
            {"id": sub_id},
            {"$set": update_fields}
        )
    return {"status": "success"}

@api_router.get("/subscriptions/{sub_id}/session")
async def get_active_session(sub_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    session = await db.chat_sessions.find_one({"subscription_id": sub_id, "user_id": user_id, "status": "active"})
    if not session:
        return {"session": None, "messages": []}
    
    messages = await db.messages.find({"session_id": session["id"]}).sort("timestamp", 1).to_list(length=200)
    for msg in messages:
        if "_id" in msg: msg["_id"] = str(msg["_id"])
    
    if "_id" in session: session["_id"] = str(session["_id"])
    return {"session": session, "messages": messages}

@api_router.get("/admin/agent-requests")
async def get_agent_requests(current_user: dict = Depends(require_admin)):
    reqs = await db.agent_requests.find().to_list(length=100)
    for r in reqs:
        if "_id" in r:
            r["_id"] = str(r["_id"])
    return reqs

@api_router.post("/admin/agents")
async def create_agent(agent_data: dict, current_user: dict = Depends(require_admin)):
    agent_data["id"] = str(uuid.uuid4())
    await db.agents.insert_one(agent_data)
    if "_id" in agent_data:
        agent_data["_id"] = str(agent_data["_id"])
    return agent_data

@api_router.put("/admin/agents/{agent_id}")
async def update_agent(agent_id: str, agent_data: dict, current_user: dict = Depends(require_admin)):
    # Remove _id provided by frontend to prevent immutable field error
    agent_data.pop("_id", None)
    res = await db.agents.update_one({"id": agent_id}, {"$set": agent_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"status": "success"}

@api_router.delete("/admin/agents/{agent_id}")
async def delete_agent(agent_id: str, current_user: dict = Depends(require_admin)):
    res = await db.agents.delete_one({"id": agent_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"status": "success"}

@api_router.post("/admin/upload-image")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(require_admin)):
    file_location = UPLOAD_DIR / "agents" / file.filename
    with open(file_location, "wb+") as file_object:
        file_object.write(await file.read())
    b_url = os.getenv("BACKEND_URL", "http://localhost:8001")
    return {"url": f"{b_url}/uploads/agents/{file.filename}"}

@api_router.post("/admin/upload-audio")
async def upload_audio(file: UploadFile = File(...), current_user: dict = Depends(require_admin)):
    file_location = UPLOAD_DIR / "audio" / file.filename
    with open(file_location, "wb+") as file_object:
        file_object.write(await file.read())
    b_url = os.getenv("BACKEND_URL", "http://localhost:8001")
    return {"url": f"{b_url}/uploads/audio/{file.filename}"}

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
        if agent.get('voice_call_image_url'):
            agent['voice_call_image_url'] = convert_relative_to_absolute_url(agent['voice_call_image_url'], request)
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
    if agent.get('voice_call_image_url'):
        agent['voice_call_image_url'] = convert_relative_to_absolute_url(agent['voice_call_image_url'], request)
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
    
    stripe.api_key = STRIPE_API_KEY
    
    success_url = f"{checkout_req.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{checkout_req.origin_url}/marketplace"
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': agent['name'],
                        'description': 'Subscription',
                    },
                    'unit_amount': int(agent['price'] * 100),
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": current_user['user_id'],
                "agent_id": checkout_req.agent_id,
                "type": "subscription"
            }
        )
        
        transaction = PaymentTransaction(
            session_id=session.id,
            user_id=current_user['user_id'],
            agent_id=checkout_req.agent_id,
            amount=agent['price'],
            currency="usd",
            payment_status="pending",
            metadata=session.metadata
        )
        
        trans_dict = transaction.model_dump()
        trans_dict['created_at'] = trans_dict['created_at'].isoformat()
        await db.payment_transactions.insert_one(trans_dict)
        
        return {"url": session.url, "session_id": session.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/subscriptions/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, current_user: dict = Depends(get_current_user)):
    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    stripe.api_key = STRIPE_API_KEY
    
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        if session.payment_status == "paid" and transaction['payment_status'] != "paid":
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
            
        return {"status": session.payment_status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
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

# Knowledge Base Endpoints

# ==================== KNOWLEDGE BASE ====================

async def validate_api_token(request: Request) -> bool:
    """Validate request against API tokens stored in the DB only."""
    auth_header = request.headers.get("Authorization", "")
    api_key_header = request.headers.get("x-api-key", "")

    # Extract raw token from header
    raw_token = ""
    if auth_header.startswith("Bearer "):
        raw_token = auth_header.split(" ", 1)[1].strip()
    elif api_key_header:
        raw_token = api_key_header.strip()

    if not raw_token:
        return False

    # Check against DB api_tokens collection
    db_token = await db.api_tokens.find_one({"token": raw_token, "active": True})
    if db_token:
        import secrets
        # Verify using constant time comparison if token is passed securely to db
        return secrets.compare_digest(raw_token, db_token["token"])

    return False


@api_router.get("/knowledge-base/context")
async def get_kb_context_v2(user_id: str, agent: str, request: Request, field: Optional[str] = None):
    """Public endpoint for n8n/webhooks to query a user's knowledge base."""
    if not await validate_api_token(request):
        raise HTTPException(status_code=403, detail="Acesso negado. Token inválido.")

    doc = await db.knowledge_base.find_one({"user_id": user_id, "agent": agent})
    if not doc:
        return {"context": ""}
    doc.pop("_id", None)
    if field and field in doc:
        return {field: doc[field]}
    return doc


@api_router.get("/knowledge-base/{subscription_id}")
async def get_knowledge_base(subscription_id: str, current_user: dict = Depends(get_current_user)):
    kb = await db.knowledge_bases.find_one({"subscription_id": subscription_id, "user_id": current_user['user_id']}, {"_id": 0})
    if not kb:
        return {}
    return kb

@api_router.put("/knowledge-base/{subscription_id}")
async def update_knowledge_base(subscription_id: str, update: KnowledgeBaseUpdateRequest, current_user: dict = Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"id": subscription_id, "user_id": current_user['user_id']})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    agent = await db.agents.find_one({"id": sub['agent_id']})
    agent_type = "ecommerce"
    if agent and "finance" in agent['segment'].lower():
        agent_type = "financeiro"
    elif agent and "nutri" in agent['segment'].lower():
        agent_type = "nutricao"
    elif agent and "vendas" in agent['segment'].lower():
        agent_type = "posvendas"

    update_data = update.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    existing = await db.knowledge_bases.find_one({"subscription_id": subscription_id})
    if existing:
        await db.knowledge_bases.update_one(
            {"subscription_id": subscription_id},
            {"$set": update_data}
        )
    else:
        new_kb = KnowledgeBaseConfig(
            user_id=current_user['user_id'],
            subscription_id=subscription_id,
            agent_type=agent_type,
            ecommerce_data=update.ecommerce_data,
            financeiro_data=update.financeiro_data,
            posvendas_data=update.posvendas_data,
            nutricao_data=update.nutricao_data
        )
        kb_dict = new_kb.model_dump()
        kb_dict['updated_at'] = kb_dict['updated_at'].isoformat()
        await db.knowledge_bases.insert_one(kb_dict)

    updated = await db.knowledge_bases.find_one({"subscription_id": subscription_id}, {"_id": 0})
    return updated

@api_router.get("/agent-context/{user_id}")
async def get_agent_context(user_id: str, subscription_id: str, agent_id: str):
    """
    Called by the Agent to get full context: User's filled data and latest conversation history.
    """
    kb = await db.knowledge_bases.find_one({"user_id": user_id, "subscription_id": subscription_id}, {"_id": 0})
    
    # Get recent conversation history (last 10 messages)
    chat_session = await db.chat_sessions.find_one(
        {"user_id": user_id, "subscription_id": subscription_id},
        sort=[("updated_at", -1)]
    )
    
    recent_messages = []
    if chat_session and 'messages' in chat_session:
        recent_messages = chat_session['messages'][-10:]
        
    return {
        "knowledge_base": kb or {},
        "recent_conversation": recent_messages
    }

# Chat Sessions endpoints
@api_router.post("/chat-sessions")
async def create_chat_session(subscription_id: str, current_user: dict = Depends(get_current_user)):
    """Create a new chat session"""
    # Verify subscription belongs to user
    sub = await db.subscriptions.find_one({"id": subscription_id, "user_id": current_user['user_id']})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    session_id = str(uuid.uuid4())
    session = {
        "id": session_id,
        "subscription_id": subscription_id,
        "user_id": current_user['user_id'],
        "agent_id": sub['agent_id'],
        "title": f"Atendimento #{session_id[:5].upper()}",
        "messages": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_sessions.insert_one(session)
    return {"id": session['id'], "title": session['title'], "created_at": session['created_at']}

@api_router.get("/chat-sessions/subscription/{subscription_id}")
async def get_chat_sessions(subscription_id: str, current_user: dict = Depends(get_current_user)):
    """Get all chat sessions for a subscription, purging expired ones first"""
    sub = await db.subscriptions.find_one({"id": subscription_id, "user_id": current_user['user_id']})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    # Purge expired sessions for this subscription before returning.
    # Wrap in try/except so a purge failure never blocks the sidebar.
    try:
        await purge_expired_sessions(subscription_id=subscription_id)
    except Exception as e:
        logger.exception(f"Non-fatal: purge failed for sub {subscription_id}: {e}")

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
        title = message.content[:30] + "..."
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

@api_router.get("/admin/subscriptions")
async def get_admin_subscriptions(current_user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"id": 1, "email": 1, "_id": 0}).to_list(None)
    user_map = {u["id"]: u["email"] for u in users}

    agents = await db.agents.find({}, {"id": 1, "name": 1, "_id": 0}).to_list(None)
    agent_map = {a["id"]: a["name"] for a in agents}

    subs = await db.subscriptions.find({}, {"_id": 0}).to_list(None)
    result = []
    for s in subs:
        s["user_email"] = user_map.get(s.get("user_id"), "Desconhecido")
        s["agent_name"] = agent_map.get(s.get("agent_id"), "Desconhecido")
        result.append(s)
    return result

@api_router.get("/admin/users")
async def get_admin_users(current_user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"email": 1, "role": 1, "created_at": 1, "name": 1, "_id": 0, "id": 1}).to_list(1000)
    return users

@api_router.post("/admin/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, payload: ResetPasswordRequest, current_user: dict = Depends(require_admin)):
    hashed_password = hash_password(payload.new_password)
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "password_hash": hashed_password,
            "must_change_password": True
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {"message": "Senha redefinida com sucesso. Usuário deverá alterá-la no próximo login."}

@api_router.post("/auth/change-password")
async def user_change_password(payload: ResetPasswordRequest, current_user: dict = Depends(get_current_user)):
    hashed_password = hash_password(payload.new_password)
    result = await db.users.update_one(
        {"id": current_user["user_id"]},
        {"$set": {
            "password_hash": hashed_password,
            "must_change_password": False
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {"message": "Senha alterada com sucesso."}

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
        
        # Get LLM Keys
        openai_api_key = os.environ.get('OPENAI_API_KEY')
        if not openai_api_key and agent.get('llm_provider', 'openai') == 'openai':
            raise HTTPException(status_code=503, detail="OpenAI API key not configured")
        
        input_text = request.input_text
        
        # If audio input, transcribe it first with Whisper
        if request.input_audio_base64 and not input_text:
            try:
                from openai import OpenAI
                openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY', ''))
                
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
        
        # Process with LLM
        response_text = None
        llm_provider = agent.get('llm_provider', 'openai')
        llm_model = agent.get('llm_model', 'gpt-4o')
        if llm_model == 'gpt-5':
            llm_model = 'gpt-4o'
            
        try:
            if llm_provider == 'openai':
                openai_key = os.environ.get('OPENAI_API_KEY')
                if not openai_key:
                    raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")
                from openai import OpenAI
                openai_client = OpenAI(api_key=openai_key)
                
                completion = openai_client.chat.completions.create(
                    model=llm_model,
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": input_text}
                    ]
                )
                response_text = completion.choices[0].message.content
                
            elif llm_provider == 'anthropic':
                anthropic_key = os.environ.get('ANTHROPIC_API_KEY')
                if not anthropic_key:
                    raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")
                from anthropic import Anthropic
                client = Anthropic(api_key=anthropic_key)
                response = client.messages.create(
                    model=llm_model,
                    max_tokens=1024,
                    system=system_message,
                    messages=[{"role": "user", "content": input_text}]
                )
                response_text = response.content[0].text
                
            elif llm_provider == 'gemini':
                gemini_key = os.environ.get('GEMINI_API_KEY')
                if not gemini_key:
                    raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")
                from google import genai
                client = genai.Client(api_key=gemini_key)
                response = client.models.generate_content(
                    model=llm_model,
                    contents=[{"role": "user", "parts": [{"text": input_text}]}],
                    config=genai.types.GenerateContentConfig(system_instruction=system_message)
                )
                response_text = response.text
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported LLM provider: {llm_provider}")
                
            logging.info(f"Used {llm_provider} successfully")
            
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
            await log_monitoring_event("error", "email", "Email integration not found", {"integration_id": request.integration_id})
            raise HTTPException(status_code=404, detail="Email integration not found")
        
        if integration.get('status') != 'active':
            await log_monitoring_event("warning", "email", "Email integration is not active", {"integration_id": request.integration_id})
            raise HTTPException(status_code=400, detail="Integration is not active")
        
        # Check rate limit
        subscription_id = integration['subscription_id']
        if not await check_rate_limit(subscription_id):
            await log_monitoring_event("warning", "email", "Rate limit exceeded", {"subscription_id": subscription_id})
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        config = EmailConfig(**integration['config'])
        
        # Build email content
        if request.template and request.variables:
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
                # Log analytics success
                await log_analytics_event(
                    user_id=current_user['user_id'],
                    subscription_id=subscription_id,
                    agent_id=integration['subscription_id'],
                    integration_type="email",
                    event_type="message_sent",
                    metadata={"to": request.to_email, "subject": request.subject}
                )
                await log_monitoring_event("info", "email", f"Email sent to {request.to_email}", {"integration_id": request.integration_id})
            except Exception as e:
                logging.error(f"Background email task failed: {str(e)}")
                await log_analytics_event(
                    user_id=current_user['user_id'],
                    subscription_id=subscription_id,
                    agent_id=integration['subscription_id'],
                    integration_type="email",
                    event_type="error",
                    metadata={"error": str(e), "to": request.to_email}
                )
                await log_monitoring_event("error", "email", f"Failed to send email: {str(e)}", {"integration_id": request.integration_id})
        
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
        await log_monitoring_event("error", "email", f"Error in email endpoint: {str(e)}", {})
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

# ==================== WHATSAPP INTEGRATION ENDPOINTS ====================

async def send_whatsapp_message(
    phone_number_id: str,
    access_token: str,
    to_phone: str,
    message_text: str
):
    """Send WhatsApp message via Business Cloud API"""
    try:
        url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Remove caracteres especiais do número
        clean_phone = to_phone.replace("+", "").replace(" ", "").replace("-", "")
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {
                "body": message_text
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            response.raise_for_status()
            
        logging.info(f"WhatsApp message sent to {to_phone}")
        return response.json()
        
    except Exception as e:
        logging.error(f"WhatsApp send error: {str(e)}")
        raise

@api_router.post("/integrations/whatsapp/send")
async def send_whatsapp(
    request: SendWhatsAppRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Send WhatsApp message via integration"""
    try:
        # Get integration
        integration = await db.integrations.find_one({
            "id": request.integration_id,
            "user_id": current_user['user_id'],
            "type": "whatsapp"
        })
        
        if not integration:
            await log_monitoring_event("error", "whatsapp", "WhatsApp integration not found", {"integration_id": request.integration_id})
            raise HTTPException(status_code=404, detail="WhatsApp integration not found")
        
        if integration.get('status') != 'active':
            await log_monitoring_event("warning", "whatsapp", "WhatsApp integration not active", {"integration_id": request.integration_id})
            raise HTTPException(status_code=400, detail="Integration is not active")
        
        # Check rate limit
        subscription_id = integration['subscription_id']
        if not await check_rate_limit(subscription_id):
            await log_monitoring_event("warning", "whatsapp", "Rate limit exceeded", {"subscription_id": subscription_id})
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        config = WhatsAppConfig(**integration['config'])
        
        # Send message in background
        async def send_whatsapp_task():
            try:
                await send_whatsapp_message(
                    phone_number_id=config.phone_number_id,
                    access_token=config.access_token,
                    to_phone=request.to_phone,
                    message_text=request.message
                )
                # Log analytics success
                await log_analytics_event(
                    user_id=current_user['user_id'],
                    subscription_id=subscription_id,
                    agent_id=integration['subscription_id'],
                    integration_type="whatsapp",
                    event_type="message_sent",
                    metadata={"to": request.to_phone}
                )
                await log_monitoring_event("info", "whatsapp", f"WhatsApp sent to {request.to_phone}", {"integration_id": request.integration_id})
            except Exception as e:
                logging.error(f"Background WhatsApp task failed: {str(e)}")
                await log_analytics_event(
                    user_id=current_user['user_id'],
                    subscription_id=subscription_id,
                    agent_id=integration['subscription_id'],
                    integration_type="whatsapp",
                    event_type="error",
                    metadata={"error": str(e), "to": request.to_phone}
                )
                await log_monitoring_event("error", "whatsapp", f"Failed to send WhatsApp: {str(e)}", {"integration_id": request.integration_id})
        
        background_tasks.add_task(send_whatsapp_task)
        
        return {
            "status": "queued",
            "message": "WhatsApp message queued for sending",
            "to_phone": request.to_phone
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error sending WhatsApp: {str(e)}")
        await log_monitoring_event("error", "whatsapp", f"Error in WhatsApp endpoint: {str(e)}", {})
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/integrations/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    """
    Webhook receiver for WhatsApp messages
    Meta will send messages here when users reply
    """
    try:
        body = await request.json()
        
        logging.info(f"WhatsApp webhook received: {json.dumps(body)}")
        
        # Verificar se é uma mensagem
        if body.get("object") == "whatsapp_business_account":
            entries = body.get("entry", [])
            
            for entry in entries:
                changes = entry.get("changes", [])
                
                for change in changes:
                    if change.get("field") == "messages":
                        value = change.get("value", {})
                        messages = value.get("messages", [])
                        
                        for message in messages:
                            # Processar mensagem recebida
                            await process_incoming_whatsapp_message(message, value)
        
        return {"status": "received"}
        
    except Exception as e:
        logging.error(f"WhatsApp webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@api_router.get("/integrations/whatsapp/webhook")
async def whatsapp_webhook_verify(
    hub_mode: str = None,
    hub_verify_token: str = None,
    hub_challenge: str = None
):
    """
    Webhook verification endpoint for Meta
    """
    # Meta envia uma verificação quando você configura o webhook
    if hub_mode == "subscribe" and hub_verify_token:
        # Verificar token com o token configurado na integração
        # Por simplicidade, vamos aceitar qualquer token por agora
        return int(hub_challenge) if hub_challenge else {"status": "ok"}
    
    return {"status": "error"}

async def process_incoming_whatsapp_message(message: dict, value: dict):
    """Process incoming WhatsApp message and trigger agent response"""
    try:
        message_type = message.get("type")
        from_phone = message.get("from")
        message_id = message.get("id")
        timestamp = message.get("timestamp")
        
        # Encontrar integração para obter access_token
        phone_number_id = value.get("metadata", {}).get("phone_number_id")
        
        integration = await db.integrations.find_one({
            "type": "whatsapp",
            "config.phone_number_id": phone_number_id,
            "status": "active"
        })
        
        if not integration:
            logging.warning(f"No active WhatsApp integration found for phone_number_id: {phone_number_id}")
            return
        
        config = WhatsAppConfig(**integration['config'])
        
        # Extrair texto da mensagem
        message_text = None
        if message_type == "text":
            message_text = message.get("text", {}).get("body")
        elif message_type == "audio":
            # Processar áudio via Whisper
            audio_id = message.get("audio", {}).get("id")
            if config.process_audio:
                message_text = await process_whatsapp_audio(audio_id, config.access_token)
            else:
                message_text = "[Áudio recebido - processamento desabilitado]"
        elif message_type == "image":
            # Processar imagem via Vision AI
            image_id = message.get("image", {}).get("id")
            image_caption = message.get("image", {}).get("caption", "")
            if config.process_images:
                message_text = await process_whatsapp_image(image_id, image_caption, config.access_token)
            else:
                message_text = f"[Imagem recebida{': ' + image_caption if image_caption else ''}]"
        
        if not message_text:
            logging.warning(f"Could not extract text from message type: {message_type}")
            return
        
        # Obter subscription (agente)
        subscription = await db.subscriptions.find_one({"id": integration['subscription_id']})
        
        if not subscription:
            logging.error(f"Subscription not found for integration: {integration['id']}")
            return
        
        # Obter agente
        agent = await db.agents.find_one({"id": subscription['agent_id']})
        
        if not agent:
            logging.error(f"Agent not found: {subscription['agent_id']}")
            await log_monitoring_event("error", "whatsapp", f"Agent not found: {subscription['agent_id']}", {})
            return
        
        # Log analytics - message received
        await log_analytics_event(
            user_id=integration['user_id'],
            subscription_id=subscription['id'],
            agent_id=agent['id'],
            integration_type="whatsapp",
            event_type="message_received",
            metadata={"from": from_phone, "type": message_type}
        )
        
        # Check rate limit
        if not await check_rate_limit(subscription['id']):
            logging.warning(f"Rate limit exceeded for subscription {subscription['id']}")
            await log_monitoring_event("warning", "whatsapp", "Rate limit exceeded in webhook", {"subscription_id": subscription['id']})
            config = WhatsAppConfig(**integration['config'])
            await send_whatsapp_message(
                phone_number_id=config.phone_number_id,
                access_token=config.access_token,
                to_phone=from_phone,
                message_text="Você atingiu o limite de mensagens. Por favor, aguarde alguns minutos."
            )
            return
        
        # Processar mensagem com o agente (via LLM)
        try:
            # Usar emergentintegrations ou OpenAI
            llm_response = await process_message_with_llm(
                message_text=message_text,
                agent=agent,
                subscription=subscription
            )
            
            # Enviar resposta de volta via WhatsApp
            config = WhatsAppConfig(**integration['config'])
            
            await send_whatsapp_message(
                phone_number_id=config.phone_number_id,
                access_token=config.access_token,
                to_phone=from_phone,
                message_text=llm_response
            )
            
            # Log analytics - message sent
            await log_analytics_event(
                user_id=integration['user_id'],
                subscription_id=subscription['id'],
                agent_id=agent['id'],
                integration_type="whatsapp",
                event_type="message_sent",
                metadata={"to": from_phone}
            )
            
            await log_monitoring_event("info", "whatsapp", f"Agent response sent to {from_phone}", {"agent_id": agent['id']})
            logging.info(f"Agent response sent to {from_phone}")
            
        except Exception as e:
            logging.error(f"Error processing message with agent: {str(e)}")
            await log_analytics_event(
                user_id=integration['user_id'],
                subscription_id=subscription['id'],
                agent_id=agent['id'],
                integration_type="whatsapp",
                event_type="error",
                metadata={"error": str(e), "from": from_phone}
            )
            await log_monitoring_event("error", "whatsapp", f"Agent processing failed: {str(e)}", {"agent_id": agent['id']})
            
            # Enviar mensagem de erro ao usuário
            config = WhatsAppConfig(**integration['config'])
            await send_whatsapp_message(
                phone_number_id=config.phone_number_id,
                access_token=config.access_token,
                to_phone=from_phone,
                message_text="Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente."
            )
        
    except Exception as e:
        logging.error(f"Error processing incoming WhatsApp message: {str(e)}")

async def download_whatsapp_media(media_id: str, access_token: str) -> bytes:
    """Download media from WhatsApp Media API"""
    try:
        # Get media URL
        url = f"https://graph.facebook.com/v18.0/{media_id}"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient() as client:
            # Get media URL
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            media_data = response.json()
            
            media_url = media_data.get('url')
            if not media_url:
                raise Exception("Media URL not found")
            
            # Download media content
            media_response = await client.get(media_url, headers=headers, timeout=60.0)
            media_response.raise_for_status()
            
            return media_response.content
            
    except Exception as e:
        logging.error(f"Error downloading WhatsApp media: {str(e)}")
        raise

async def process_whatsapp_audio(audio_id: str, access_token: str) -> str:
    """Process audio message using Whisper"""
    try:
        logging.info(f"Processing WhatsApp audio: {audio_id}")
        
        # Download audio
        audio_content = await download_whatsapp_media(audio_id, access_token)
        
        # Save temporarily
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.ogg') as temp_audio:
            temp_audio.write(audio_content)
            temp_audio_path = temp_audio.name
        
        try:
            # Transcribe with Whisper (OpenAI)
            openai_key = os.environ.get('OPENAI_API_KEY')
            
            if openai_key:
                import openai
                openai.api_key = openai_key
                
                with open(temp_audio_path, 'rb') as audio_file:
                    transcript = openai.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language="pt"
                    )
                
                transcribed_text = transcript.text
                logging.info(f"Audio transcribed: {transcribed_text}")
                
                return transcribed_text
            else:
                return "[Áudio recebido - configure OPENAI_API_KEY para transcrição]"
                
        finally:
            # Cleanup temp file
            import os as os_module
            try:
                os_module.unlink(temp_audio_path)
            except:
                pass
                
    except Exception as e:
        logging.error(f"Error processing WhatsApp audio: {str(e)}")
        return f"[Erro ao processar áudio: {str(e)}]"

async def process_whatsapp_image(image_id: str, caption: str, access_token: str) -> str:
    """Process image message using GPT-4 Vision"""
    try:
        logging.info(f"Processing WhatsApp image: {image_id}")
        
        # Download image
        image_content = await download_whatsapp_media(image_id, access_token)
        
        # Convert to base64
        image_base64 = base64.b64encode(image_content).decode('utf-8')
        
        # Analyze with GPT-4 Vision
        openai_key = os.environ.get('OPENAI_API_KEY')
        
        if openai_key:
            import openai
            openai.api_key = openai_key
            
            prompt = "Descreva esta imagem em detalhes."
            if caption:
                prompt = f"O usuário enviou esta imagem com a legenda: '{caption}'. Descreva a imagem e responda de acordo com a legenda."
            
            response = openai.chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=500
            )
            
            image_description = response.choices[0].message.content
            logging.info(f"Image analyzed: {image_description}")
            
            # Return description as user message for agent to respond to
            if caption:
                return f"[Usuário enviou imagem: {image_description}]\nLegenda: {caption}"
            else:
                return f"[Usuário enviou imagem: {image_description}]"
        else:
            if caption:
                return f"[Imagem recebida com legenda: {caption}]"
            else:
                return "[Imagem recebida - configure OPENAI_API_KEY para análise]"
                
    except Exception as e:
        logging.error(f"Error processing WhatsApp image: {str(e)}")
        return f"[Erro ao processar imagem: {str(e)}]"

async def process_message_with_llm(message_text: str, agent: dict, subscription: dict) -> str:
    """Process message with LLM"""
    try:
        system_prompt = agent.get('base_prompt', '')
        if subscription.get('custom_prompt'):
            system_prompt += f"\n\n{subscription['custom_prompt']}"
        
        # Processar com LLM
        llm_provider = agent.get('llm_provider', 'openai')
        llm_model = agent.get('llm_model', 'gpt-4o')
        if llm_model == 'gpt-5':
            llm_model = 'gpt-4o'
            
        if llm_provider == 'openai':
            openai_key = os.environ.get('OPENAI_API_KEY')
            if not openai_key:
                return "Configuração incorreta: OPENAI_API_KEY ausente."
            import openai
            client = openai.OpenAI(api_key=openai_key)
            response = client.chat.completions.create(
                model=llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message_text}
                ]
            )
            return response.choices[0].message.content
            
        elif llm_provider == 'anthropic':
            anthropic_key = os.environ.get('ANTHROPIC_API_KEY')
            if not anthropic_key:
                return "Configuração incorreta: ANTHROPIC_API_KEY ausente."
            from anthropic import Anthropic
            client = Anthropic(api_key=anthropic_key)
            response = client.messages.create(
                model=llm_model,
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": message_text}]
            )
            return response.content[0].text
            
        elif llm_provider == 'gemini':
            gemini_key = os.environ.get('GEMINI_API_KEY')
            if not gemini_key:
                return "Configuração incorreta: GEMINI_API_KEY ausente."
            from google import genai
            client = genai.Client(api_key=gemini_key)
            response = client.models.generate_content(
                model=llm_model,
                contents=[{"role": "user", "parts": [{"text": message_text}]}],
                config=genai.types.GenerateContentConfig(system_instruction=system_prompt)
            )
            return response.text
        
        return "Desculpe, não foi possível processar sua mensagem no momento."
        
    except Exception as e:
        logging.error(f"LLM processing error: {str(e)}")
        raise

@api_router.post("/integrations/whatsapp/test")
async def test_whatsapp_integration(
    integration_id: str,
    test_phone: str,
    current_user: dict = Depends(get_current_user)
):
    """Test WhatsApp integration"""
    try:
        integration = await db.integrations.find_one({
            "id": integration_id,
            "user_id": current_user['user_id'],
            "type": "whatsapp"
        })
        
        if not integration:
            raise HTTPException(status_code=404, detail="WhatsApp integration not found")
        
        config = WhatsAppConfig(**integration['config'])
        
        result = await send_whatsapp_message(
            phone_number_id=config.phone_number_id,
            access_token=config.access_token,
            to_phone=test_phone,
            message_text="🎉 Teste de Integração - VoiceAI Hub\n\nSua integração WhatsApp está funcionando corretamente!"
        )
        
        return {
            "success": True,
            "message": "Mensagem de teste enviada com sucesso",
            "details": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error testing WhatsApp: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao testar WhatsApp: {str(e)}")

# ==================== WIDGET ENDPOINTS ====================

# Widget API Key validation
async def verify_widget_api_key(api_key: str = None):
    """Verify API key for widget requests"""
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required")
    
    # Check if API key belongs to an active subscription
    subscription = await db.subscriptions.find_one({"api_key": api_key, "status": "active"})
    
    if not subscription:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    
    return subscription

class WidgetSessionRequest(BaseModel):
    pass

class WidgetMessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class WidgetMessageResponse(BaseModel):
    response: str
    audio_base64: Optional[str] = None
    session_id: str

@api_router.post("/integrations/widget/session")
async def create_widget_session(
    request: Request
):
    """Create a new widget session"""
    try:
        # Get API key from header
        api_key = request.headers.get('X-API-Key')
        subscription = await verify_widget_api_key(api_key)
        
        # Create new chat session
        session = {
            "id": str(uuid.uuid4()),
            "subscription_id": subscription['id'],
            "user_id": subscription['user_id'],
            "agent_id": subscription['agent_id'],
            "title": "Widget Chat",
            "messages": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.chat_sessions.insert_one(session)
        
        return {"session_id": session['id']}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating widget session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/integrations/widget/message", response_model=WidgetMessageResponse)
async def widget_message(
    request: WidgetMessageRequest,
    req: Request
):
    """Process widget message and return agent response"""
    try:
        # Get API key from header
        api_key = req.headers.get('X-API-Key')
        subscription = await verify_widget_api_key(api_key)
        
        # Check rate limit
        if not await check_rate_limit(subscription['id']):
            await log_monitoring_event("warning", "widget", "Rate limit exceeded", {"subscription_id": subscription['id']})
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        # Get agent
        agent = await db.agents.find_one({"id": subscription['agent_id']})
        
        if not agent:
            await log_monitoring_event("error", "widget", "Agent not found", {"agent_id": subscription['agent_id']})
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Log analytics - message received
        await log_analytics_event(
            user_id=subscription['user_id'],
            subscription_id=subscription['id'],
            agent_id=agent['id'],
            integration_type="widget",
            event_type="message_received",
            metadata={"message_length": len(request.message)}
        )
        
        # Get or create session
        session_id = request.session_id
        if not session_id:
            # Create new session
            session = {
                "id": str(uuid.uuid4()),
                "subscription_id": subscription['id'],
                "user_id": subscription['user_id'],
                "agent_id": subscription['agent_id'],
                "title": request.message[:50],
                "messages": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.chat_sessions.insert_one(session)
            session_id = session['id']
        
        # Process message with LLM (reuse existing logic)
        try:
            response_text = await process_message_with_llm(
                message_text=request.message,
                agent=agent,
                subscription=subscription
            )
        except Exception as e:
            logging.error(f"LLM processing error: {str(e)}")
            await log_analytics_event(
                user_id=subscription['user_id'],
                subscription_id=subscription['id'],
                agent_id=agent['id'],
                integration_type="widget",
                event_type="error",
                metadata={"error": str(e)}
            )
            await log_monitoring_event("error", "widget", f"LLM processing failed: {str(e)}", {"agent_id": agent['id']})
            raise HTTPException(status_code=500, detail="Error processing message")
        
        # Generate audio response if ElevenLabs is configured
        output_audio_base64 = None
        if agent.get('elevenlabs_voice_id') and eleven_client:
            try:
                audio_stream = eleven_client.text_to_speech.convert(
                    voice_id=agent['elevenlabs_voice_id'],
                    text=response_text,
                    model_id="eleven_multilingual_v2",
                    voice_settings=VoiceSettings(
                        stability=0.5,
                        similarity_boost=0.75,
                        style=0.0,
                        use_speaker_boost=True
                    )
                )
                
                audio_bytes = b"".join(audio_stream)
                output_audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            except Exception as e:
                logging.error(f"ElevenLabs error in widget: {str(e)}")
                await log_monitoring_event("warning", "widget", f"TTS failed: {str(e)}", {"agent_id": agent['id']})
        
        # Save messages to session
        user_message = {
            "role": "user",
            "content": request.message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "audio_base64": None
        }
        
        assistant_message = {
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "audio_base64": output_audio_base64
        }
        
        await db.chat_sessions.update_one(
            {"id": session_id},
            {
                "$push": {"messages": {"$each": [user_message, assistant_message]}},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        # Log analytics - message sent
        await log_analytics_event(
            user_id=subscription['user_id'],
            subscription_id=subscription['id'],
            agent_id=agent['id'],
            integration_type="widget",
            event_type="message_sent",
            metadata={"response_length": len(response_text), "has_audio": output_audio_base64 is not None}
        )
        
        await log_monitoring_event("info", "widget", "Widget message processed successfully", {"agent_id": agent['id'], "session_id": session_id})
        
        return WidgetMessageResponse(
            response=response_text,
            audio_base64=output_audio_base64,
            session_id=session_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error processing widget message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/integrations/widget/snippet")
async def get_widget_snippet(
    integration_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get widget installation snippet"""
    try:
        integration = await db.integrations.find_one({
            "id": integration_id,
            "user_id": current_user['user_id'],
            "type": "widget"
        })
        
        if not integration:
            raise HTTPException(status_code=404, detail="Widget integration not found")
        
        # Get subscription to get API key
        subscription = await db.subscriptions.find_one({"id": integration['subscription_id']})
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        config = WidgetConfig(**integration['config'])
        
        # Generate snippet
        snippet = f"""<!-- VoiceAI Widget -->
<script src="{os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000')}/voiceai-widget.js"></script>
<script>
  VoiceAIWidget.init({{
    apiKey: '{subscription['api_key']}',
    apiUrl: '{os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000')}/api',
    themeColor: '{config.theme_color}',
    position: '{config.position}',
    greetingMessage: '{config.greeting_message}',
    voiceEnabled: {str(config.voice_enabled).lower()},
    textEnabled: {str(config.text_enabled).lower()},
    agentName: '{integration['name']}'
  }});
</script>
<!-- End VoiceAI Widget -->"""
        
        return {"snippet": snippet}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating widget snippet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== CRM INTEGRATION ENDPOINTS ====================

async def sync_to_crm(
    crm_config: CRMConfig,
    contact_data: CRMContactData,
    action: str = "upsert"
):
    """Universal CRM sync function"""
    try:
        # Prepare data based on CRM type
        if crm_config.crm_type == "salesforce":
            # Salesforce format
            payload = {
                "FirstName": contact_data.name.split()[0] if contact_data.name else "",
                "LastName": " ".join(contact_data.name.split()[1:]) if contact_data.name and len(contact_data.name.split()) > 1 else "Unknown",
                "Email": contact_data.email,
                "Phone": contact_data.phone,
                "Company": contact_data.company
            }
            endpoint = f"{crm_config.api_url}/services/data/v58.0/sobjects/Contact"
            headers = {
                "Authorization": f"Bearer {crm_config.api_key}",
                "Content-Type": "application/json"
            }
        elif crm_config.crm_type == "hubspot":
            # HubSpot format
            payload = {
                "properties": {
                    "firstname": contact_data.name.split()[0] if contact_data.name else "",
                    "lastname": " ".join(contact_data.name.split()[1:]) if contact_data.name and len(contact_data.name.split()) > 1 else "",
                    "email": contact_data.email,
                    "phone": contact_data.phone,
                    "company": contact_data.company
                }
            }
            endpoint = f"{crm_config.api_url or 'https://api.hubapi.com'}/crm/v3/objects/contacts"
            headers = {
                "Authorization": f"Bearer {crm_config.api_key}",
                "Content-Type": "application/json"
            }
        elif crm_config.crm_type == "pipedrive":
            # Pipedrive format
            payload = {
                "name": contact_data.name,
                "email": [{"value": contact_data.email, "primary": True}] if contact_data.email else [],
                "phone": [{"value": contact_data.phone, "primary": True}] if contact_data.phone else [],
                "org_id": contact_data.company
            }
            endpoint = f"{crm_config.api_url or 'https://api.pipedrive.com/v1'}/persons?api_token={crm_config.api_key}"
            headers = {"Content-Type": "application/json"}
        elif crm_config.crm_type == "custom":
            # Custom webhook/API
            payload = contact_data.model_dump()
            if contact_data.custom_fields:
                payload.update(contact_data.custom_fields)
            
            # Apply field mapping if configured
            if crm_config.custom_fields_mapping:
                mapped_payload = {}
                for key, value in payload.items():
                    mapped_key = crm_config.custom_fields_mapping.get(key, key)
                    mapped_payload[mapped_key] = value
                payload = mapped_payload
            
            endpoint = crm_config.webhook_url or crm_config.api_url
            headers = crm_config.custom_headers or {"Content-Type": "application/json"}
            
            if crm_config.api_key and "Authorization" not in headers:
                headers["Authorization"] = f"Bearer {crm_config.api_key}"
        else:
            raise Exception(f"Unsupported CRM type: {crm_config.crm_type}")
        
        # Send to CRM
        async with httpx.AsyncClient() as client:
            response = await client.post(endpoint, headers=headers, json=payload, timeout=30.0)
            response.raise_for_status()
            
        logging.info(f"Contact synced to {crm_config.crm_type} CRM")
        return response.json()
        
    except Exception as e:
        logging.error(f"CRM sync error: {str(e)}")
        raise

@api_router.post("/integrations/crm/sync")
async def crm_sync(
    request: CRMSyncRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Sync contact to CRM"""
    try:
        # Get integration
        integration = await db.integrations.find_one({
            "id": request.integration_id,
            "user_id": current_user['user_id'],
            "type": "crm"
        })
        
        if not integration:
            await log_monitoring_event("error", "crm", "CRM integration not found", {"integration_id": request.integration_id})
            raise HTTPException(status_code=404, detail="CRM integration not found")
        
        if integration.get('status') != 'active':
            await log_monitoring_event("warning", "crm", "CRM integration not active", {"integration_id": request.integration_id})
            raise HTTPException(status_code=400, detail="Integration is not active")
        
        # Check rate limit
        subscription_id = integration['subscription_id']
        if not await check_rate_limit(subscription_id):
            await log_monitoring_event("warning", "crm", "Rate limit exceeded", {"subscription_id": subscription_id})
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        config = CRMConfig(**integration['config'])
        contact_data = CRMContactData(**request.contact_data)
        
        # Sync in background
        async def sync_task():
            try:
                await sync_to_crm(config, contact_data, request.action)
                # Log analytics success
                await log_analytics_event(
                    user_id=current_user['user_id'],
                    subscription_id=subscription_id,
                    agent_id=integration['subscription_id'],
                    integration_type="crm",
                    event_type="integration_used",
                    metadata={"action": request.action, "crm_type": config.crm_type}
                )
                await log_monitoring_event("info", "crm", f"Contact synced to {config.crm_type}", {"integration_id": request.integration_id})
            except Exception as e:
                logging.error(f"Background CRM sync failed: {str(e)}")
                await log_analytics_event(
                    user_id=current_user['user_id'],
                    subscription_id=subscription_id,
                    agent_id=integration['subscription_id'],
                    integration_type="crm",
                    event_type="error",
                    metadata={"error": str(e), "action": request.action}
                )
                await log_monitoring_event("error", "crm", f"CRM sync failed: {str(e)}", {"integration_id": request.integration_id})
        
        background_tasks.add_task(sync_task)
        
        return {
            "status": "queued",
            "message": "Contact queued for CRM sync"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error syncing to CRM: {str(e)}")
        await log_monitoring_event("error", "crm", f"Error in CRM endpoint: {str(e)}", {})
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/integrations/crm/test")
async def test_crm_integration(
    integration_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Test CRM integration"""
    try:
        integration = await db.integrations.find_one({
            "id": integration_id,
            "user_id": current_user['user_id'],
            "type": "crm"
        })
        
        if not integration:
            raise HTTPException(status_code=404, detail="CRM integration not found")
        
        config = CRMConfig(**integration['config'])
        
        # Test with dummy contact
        test_contact = CRMContactData(
            name="Teste VoiceAI",
            email="teste@voiceaihub.com",
            phone="+5511999999999",
            company="VoiceAI Hub",
            custom_fields={"source": "VoiceAI Test"}
        )
        
        result = await sync_to_crm(config, test_contact, "create")
        
        return {
            "success": True,
            "message": "Contato de teste criado com sucesso no CRM",
            "details": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error testing CRM: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao testar CRM: {str(e)}")

# ==================== WEBHOOK CUSTOMIZADO ENDPOINTS ====================

@api_router.post("/integrations/webhook/trigger")
async def trigger_webhook(
    integration_id: str,
    event_type: str,
    payload: Dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Trigger custom webhook"""
    try:
        # Get integration
        integration = await db.integrations.find_one({
            "id": integration_id,
            "user_id": current_user['user_id'],
            "type": "webhook"
        })
        
        if not integration:
            await log_monitoring_event("error", "webhook", "Webhook integration not found", {"integration_id": integration_id})
            raise HTTPException(status_code=404, detail="Webhook integration not found")
        
        if integration.get('status') != 'active':
            await log_monitoring_event("warning", "webhook", "Webhook integration not active", {"integration_id": integration_id})
            raise HTTPException(status_code=400, detail="Integration is not active")
        
        # Check rate limit
        subscription_id = integration['subscription_id']
        if not await check_rate_limit(subscription_id):
            await log_monitoring_event("warning", "webhook", "Rate limit exceeded", {"subscription_id": subscription_id})
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        config = WebhookConfig(**integration['config'])
        
        # Check if event is subscribed
        if event_type not in config.events:
            return {"status": "skipped", "message": f"Event {event_type} not subscribed"}
        
        # Send webhook in background
        async def send_webhook_task():
            try:
                headers = config.headers or {}
                headers["Content-Type"] = "application/json"
                headers["X-Event-Type"] = event_type
                
                # Add HMAC signature if secret is configured
                if config.secret:
                    import hmac
                    import hashlib
                    
                    payload_json = json.dumps(payload)
                    signature = hmac.new(
                        config.secret.encode(),
                        payload_json.encode(),
                        hashlib.sha256
                    ).hexdigest()
                    headers["X-Webhook-Signature"] = f"sha256={signature}"
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        config.webhook_url,
                        headers=headers,
                        json=payload,
                        timeout=30.0
                    )
                    response.raise_for_status()
                
                # Log analytics success
                await log_analytics_event(
                    user_id=current_user['user_id'],
                    subscription_id=subscription_id,
                    agent_id=integration['subscription_id'],
                    integration_type="webhook",
                    event_type="integration_used",
                    metadata={"event": event_type, "url": config.webhook_url}
                )
                await log_monitoring_event("info", "webhook", f"Webhook sent: {event_type}", {"integration_id": integration_id})
                logging.info(f"Webhook sent: {event_type} to {config.webhook_url}")
                
            except Exception as e:
                logging.error(f"Webhook send error: {str(e)}")
                await log_analytics_event(
                    user_id=current_user['user_id'],
                    subscription_id=subscription_id,
                    agent_id=integration['subscription_id'],
                    integration_type="webhook",
                    event_type="error",
                    metadata={"error": str(e), "event": event_type}
                )
                await log_monitoring_event("error", "webhook", f"Webhook failed: {str(e)}", {"integration_id": integration_id})
        
        background_tasks.add_task(send_webhook_task)
        
        return {
            "status": "queued",
            "message": "Webhook queued for delivery"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error triggering webhook: {str(e)}")
        await log_monitoring_event("error", "webhook", f"Error in webhook endpoint: {str(e)}", {})
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/integrations/webhook/test")
async def test_webhook_integration(
    integration_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Test webhook integration"""
    try:
        integration = await db.integrations.find_one({
            "id": integration_id,
            "user_id": current_user['user_id'],
            "type": "webhook"
        })
        
        if not integration:
            raise HTTPException(status_code=404, detail="Webhook integration not found")
        
        config = WebhookConfig(**integration['config'])
        
        # Send test webhook
        test_payload = {
            "event": "test",
            "message": "Teste de integração VoiceAI Hub",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": {
                "test": True,
                "source": "VoiceAI Hub"
            }
        }
        
        headers = config.headers or {}
        headers["Content-Type"] = "application/json"
        headers["X-Event-Type"] = "test"
        
        if config.secret:
            import hmac
            import hashlib
            
            payload_json = json.dumps(test_payload)
            signature = hmac.new(
                config.secret.encode(),
                payload_json.encode(),
                hashlib.sha256
            ).hexdigest()
            headers["X-Webhook-Signature"] = f"sha256={signature}"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                config.webhook_url,
                headers=headers,
                json=test_payload,
                timeout=30.0
            )
            response.raise_for_status()
        
        return {
            "success": True,
            "message": "Webhook de teste enviado com sucesso",
            "status_code": response.status_code
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error testing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao testar webhook: {str(e)}")

# ==================== ANALYTICS ENDPOINTS ====================

async def log_analytics_event(
    user_id: str,
    subscription_id: str,
    agent_id: str,
    integration_type: str,
    event_type: str,
    metadata: Optional[Dict] = None
):
    """Log analytics event to database"""
    try:
        event = AnalyticsEvent(
            user_id=user_id,
            subscription_id=subscription_id,
            agent_id=agent_id,
            integration_type=integration_type,
            event_type=event_type,
            metadata=metadata or {}
        )
        
        await db.analytics_events.insert_one(event.model_dump())
        logging.info(f"Analytics event logged: {event_type} for {integration_type}")
        
    except Exception as e:
        logging.error(f"Error logging analytics: {str(e)}")

@api_router.get("/analytics/dashboard")
async def get_analytics_dashboard(
    subscription_id: Optional[str] = None,
    days: int = 7,
    current_user: dict = Depends(get_current_user)
):
    """Get analytics dashboard data"""
    try:
        # Build query filter
        query = {"user_id": current_user['user_id']}
        if subscription_id:
            query["subscription_id"] = subscription_id
        
        # Date range
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        query["timestamp"] = {"$gte": start_date.isoformat()}
        
        # Get all events
        events = await db.analytics_events.find(query, {"_id": 0}).to_list(10000)
        
        if not events:
            return AnalyticsMetrics(
                total_messages=0,
                messages_by_channel={},
                messages_by_day=[],
                avg_response_time=0,
                top_agents=[],
                error_rate=0,
                active_integrations=0
            )
        
        # Calculate metrics
        total_messages = len([e for e in events if e['event_type'] in ['message_sent', 'message_received']])
        
        # Messages by channel
        messages_by_channel = {}
        for event in events:
            if event['event_type'] in ['message_sent', 'message_received']:
                channel = event['integration_type']
                messages_by_channel[channel] = messages_by_channel.get(channel, 0) + 1
        
        # Messages by day
        messages_by_day = {}
        for event in events:
            if event['event_type'] in ['message_sent', 'message_received']:
                # Parse timestamp
                if isinstance(event['timestamp'], str):
                    event_date = datetime.fromisoformat(event['timestamp'].replace('Z', '+00:00'))
                else:
                    event_date = event['timestamp']
                
                day_key = event_date.strftime('%Y-%m-%d')
                messages_by_day[day_key] = messages_by_day.get(day_key, 0) + 1
        
        messages_by_day_list = [{"date": k, "count": v} for k, v in sorted(messages_by_day.items())]
        
        # Average response time (mock for now - would need to track actual times)
        avg_response_time = 2.5  # seconds
        
        # Top agents
        agent_counts = {}
        for event in events:
            if event['event_type'] in ['message_sent', 'message_received']:
                agent_id = event['agent_id']
                agent_counts[agent_id] = agent_counts.get(agent_id, 0) + 1
        
        # Get agent names
        top_agents = []
        for agent_id, count in sorted(agent_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
            agent = await db.agents.find_one({"id": agent_id}, {"_id": 0, "name": 1})
            if agent:
                top_agents.append({"agent_id": agent_id, "name": agent['name'], "count": count})
        
        # Error rate
        error_events = len([e for e in events if e['event_type'] == 'error'])
        error_rate = (error_events / len(events) * 100) if events else 0
        
        # Active integrations
        active_integrations = await db.integrations.count_documents({
            "user_id": current_user['user_id'],
            "status": "active"
        })
        
        return AnalyticsMetrics(
            total_messages=total_messages,
            messages_by_channel=messages_by_channel,
            messages_by_day=messages_by_day_list,
            avg_response_time=avg_response_time,
            top_agents=top_agents,
            error_rate=error_rate,
            active_integrations=active_integrations
        )
        
    except Exception as e:
        logging.error(f"Error getting analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analytics/realtime")
async def get_realtime_analytics(
    current_user: dict = Depends(get_current_user)
):
    """Get real-time analytics (last hour)"""
    try:
        # Get events from last hour
        start_time = datetime.now(timezone.utc) - timedelta(hours=1)
        
        events = await db.analytics_events.find({
            "user_id": current_user['user_id'],
            "timestamp": {"$gte": start_time.isoformat()}
        }, {"_id": 0}).to_list(1000)
        
        # Calculate real-time metrics
        messages_last_hour = len([e for e in events if e['event_type'] in ['message_sent', 'message_received']])
        errors_last_hour = len([e for e in events if e['event_type'] == 'error'])
        
        # Messages per minute
        messages_per_minute = []
        for i in range(60):
            minute_start = start_time + timedelta(minutes=i)
            minute_end = minute_start + timedelta(minutes=1)
            
            count = len([
                e for e in events 
                if e['event_type'] in ['message_sent', 'message_received'] 
                and minute_start.isoformat() <= e['timestamp'] < minute_end.isoformat()
            ])
            
            messages_per_minute.append({
                "minute": minute_start.strftime('%H:%M'),
                "count": count
            })
        
        return {
            "messages_last_hour": messages_last_hour,
            "errors_last_hour": errors_last_hour,
            "messages_per_minute": messages_per_minute[-10:],  # Last 10 minutes
            "current_time": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logging.error(f"Error getting realtime analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== RATE LIMITING ====================

async def check_rate_limit(subscription_id: str) -> bool:
    """Check if subscription has exceeded rate limits"""
    try:
        # Get or create rate limit document
        rate_limit = await db.rate_limits.find_one({"subscription_id": subscription_id})
        
        now = datetime.now(timezone.utc)
        
        if not rate_limit:
            # Create new rate limit
            rate_limit = RateLimit(subscription_id=subscription_id).model_dump()
            rate_limit["reset_minute"] = now.isoformat()
            rate_limit["reset_hour"] = now.isoformat()
            rate_limit["reset_day"] = now.isoformat()
            await db.rate_limits.insert_one(rate_limit)
            return True
        
        # Parse reset times
        reset_minute = datetime.fromisoformat(rate_limit['reset_minute'].replace('Z', '+00:00'))
        reset_hour = datetime.fromisoformat(rate_limit['reset_hour'].replace('Z', '+00:00'))
        reset_day = datetime.fromisoformat(rate_limit['reset_day'].replace('Z', '+00:00'))
        
        # Reset counters if time has passed
        updates = {}
        
        if now > reset_minute + timedelta(minutes=1):
            updates["current_minute_count"] = 0
            updates["reset_minute"] = now.isoformat()
        
        if now > reset_hour + timedelta(hours=1):
            updates["current_hour_count"] = 0
            updates["reset_hour"] = now.isoformat()
        
        if now > reset_day + timedelta(days=1):
            updates["current_day_count"] = 0
            updates["reset_day"] = now.isoformat()
        
        if updates:
            await db.rate_limits.update_one(
                {"subscription_id": subscription_id},
                {"$set": updates}
            )
            # Refresh rate_limit
            rate_limit = await db.rate_limits.find_one({"subscription_id": subscription_id})
        
        # Check limits
        if (rate_limit['current_minute_count'] >= rate_limit['limit_per_minute'] or
            rate_limit['current_hour_count'] >= rate_limit['limit_per_hour'] or
            rate_limit['current_day_count'] >= rate_limit['limit_per_day']):
            return False
        
        # Increment counters
        await db.rate_limits.update_one(
            {"subscription_id": subscription_id},
            {
                "$inc": {
                    "current_minute_count": 1,
                    "current_hour_count": 1,
                    "current_day_count": 1
                }
            }
        )
        
        return True
        
    except Exception as e:
        logging.error(f"Rate limit check error: {str(e)}")
        return True  # Allow on error

@api_router.get("/rate-limits/status")
async def get_rate_limit_status(
    subscription_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get current rate limit status"""
    try:
        # Verify subscription belongs to user
        subscription = await db.subscriptions.find_one({
            "id": subscription_id,
            "user_id": current_user['user_id']
        })
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Get rate limit
        rate_limit = await db.rate_limits.find_one({"subscription_id": subscription_id}, {"_id": 0})
        
        if not rate_limit:
            # Return default limits
            return {
                "subscription_id": subscription_id,
                "limits": {
                    "per_minute": 60,
                    "per_hour": 1000,
                    "per_day": 10000
                },
                "usage": {
                    "minute": 0,
                    "hour": 0,
                    "day": 0
                },
                "remaining": {
                    "minute": 60,
                    "hour": 1000,
                    "day": 10000
                }
            }
        
        return {
            "subscription_id": subscription_id,
            "limits": {
                "per_minute": rate_limit['limit_per_minute'],
                "per_hour": rate_limit['limit_per_hour'],
                "per_day": rate_limit['limit_per_day']
            },
            "usage": {
                "minute": rate_limit['current_minute_count'],
                "hour": rate_limit['current_hour_count'],
                "day": rate_limit['current_day_count']
            },
            "remaining": {
                "minute": rate_limit['limit_per_minute'] - rate_limit['current_minute_count'],
                "hour": rate_limit['limit_per_hour'] - rate_limit['current_hour_count'],
                "day": rate_limit['limit_per_day'] - rate_limit['current_day_count']
            },
            "reset_times": {
                "minute": rate_limit['reset_minute'],
                "hour": rate_limit['reset_hour'],
                "day": rate_limit['reset_day']
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting rate limit status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== MONITORING & LOGS ====================

async def log_monitoring_event(
    level: str,
    source: str,
    message: str,
    metadata: Optional[Dict] = None
):
    """Log monitoring event"""
    try:
        log = MonitoringLog(
            level=level,
            source=source,
            message=message,
            metadata=metadata or {}
        )
        
        await db.monitoring_logs.insert_one(log.model_dump())
        
        # Also log to Python logger
        if level == "critical":
            logging.critical(f"[{source}] {message}")
        elif level == "error":
            logging.error(f"[{source}] {message}")
        elif level == "warning":
            logging.warning(f"[{source}] {message}")
        else:
            logging.info(f"[{source}] {message}")
            
    except Exception as e:
        logging.error(f"Error logging monitoring event: {str(e)}")

@api_router.get("/monitoring/logs")
async def get_monitoring_logs(
    level: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get monitoring logs"""
    try:
        query = {}
        
        if level:
            query["level"] = level
        
        if source:
            query["source"] = source
        
        logs = await db.monitoring_logs.find(
            query,
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return {"logs": logs, "total": len(logs)}
        
    except Exception as e:
        logging.error(f"Error getting monitoring logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/monitoring/health")
async def get_system_health():
    """Get system health status"""
    try:
        # Check database connection
        db_healthy = True
        try:
            await db.command("ping")
        except:
            db_healthy = False
        
        # Get error count from last hour
        start_time = datetime.now(timezone.utc) - timedelta(hours=1)
        error_logs = await db.monitoring_logs.count_documents({
            "level": {"$in": ["error", "critical"]},
            "timestamp": {"$gte": start_time.isoformat()}
        })
        
        # Get active integrations count
        active_integrations = await db.integrations.count_documents({"status": "active"})
        
        # Determine overall health
        overall_status = "healthy"
        if not db_healthy or error_logs > 10:
            overall_status = "unhealthy"
        elif error_logs > 5:
            overall_status = "degraded"
        
        return {
            "status": overall_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "components": {
                "database": "healthy" if db_healthy else "unhealthy",
                "api": "healthy"
            },
            "metrics": {
                "errors_last_hour": error_logs,
                "active_integrations": active_integrations
            }
        }
        
    except Exception as e:
        logging.error(f"Error getting system health: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@api_router.post("/monitoring/logs/{log_id}/resolve")
async def resolve_monitoring_log(
    log_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark monitoring log as resolved"""
    try:
        result = await db.monitoring_logs.update_one(
            {"id": log_id},
            {"$set": {"resolved": True}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Log not found")
        
        return {"message": "Log marked as resolved"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error resolving log: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== N8N WEBHOOK CHAT ====================

class ChatWebhookRequest(BaseModel):
    subscription_id: str
    agent_id: str
    session_id: Optional[str] = None
    input_text: str = ""
    input_audio_base64: Optional[str] = None
    audio: bool = False

async def trigger_n8n_title_webhook_task(session_id: str):
    try:
        messages_cursor = db.messages.find({"session_id": session_id, "role": "user"}).sort("timestamp", 1).limit(2)
        user_msgs = await messages_cursor.to_list(length=2)
        
        if len(user_msgs) != 2:
            return

        context_msg = f"Mensagem 1: {user_msgs[0].get('content', '')}\nMensagem 2: {user_msgs[1].get('content', '')}"
        
        async with httpx.AsyncClient() as client:
            webhook_url = N8N_TITLE_WEBHOOK
            payload = {
                "message": context_msg,
                "session_id": session_id,
                "message_number": 2
            }
            response = await client.post(webhook_url, json=payload, timeout=10.0)
            if response.status_code == 200:
                text_resp = response.text.strip()
                try:
                    json_resp = response.json()
                    if isinstance(json_resp, list) and len(json_resp) > 0:
                        json_resp = json_resp[0]
                    title = json_resp.get("output", json_resp.get("output_text", json_resp.get("title", json_resp.get("titulo", text_resp))))
                except ValueError:
                    title = text_resp
                
                if title and title.strip():
                    await db.chat_sessions.update_one({"id": session_id}, {"$set": {"title": title}})
    except Exception as e:
        print(f"Error calling n8n title webhook task: {e}")

@api_router.post("/chat")
async def process_chat(request: ChatWebhookRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    
    sub = await db.subscriptions.find_one({"id": request.subscription_id, "user_id": user_id, "status": "active"})
    if not sub:
        raise HTTPException(status_code=403, detail="Subscription not active or invalid")
        
    agent = await db.agents.find_one({"id": request.agent_id})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    session_id = request.session_id
    if not session_id:
        new_session = ChatSession(
            user_id=user_id,
            agent_id=request.agent_id,
            subscription_id=request.subscription_id,
            status="active"
        )
        await db.chat_sessions.insert_one(new_session.model_dump())
        session_id = new_session.id
    else:
        session = await db.chat_sessions.find_one({"id": session_id})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if session.get("status") != "active":
            raise HTTPException(status_code=400, detail="Session is closed or expired")
            
        last_interaction = session.get("last_interaction")
        if last_interaction:
            if isinstance(last_interaction, str):
                try:
                    last_interaction = datetime.fromisoformat(last_interaction.replace("Z", "+00:00"))
                except:
                    pass
            if isinstance(last_interaction, datetime):
                if last_interaction.tzinfo is None:
                    last_interaction = last_interaction.replace(tzinfo=timezone.utc)
                diff = datetime.now(timezone.utc) - last_interaction
                # Update expiration to 30 days (2592000 seconds)
                if diff.total_seconds() > 2592000:
                    await db.chat_sessions.update_one({"id": session_id}, {"$set": {"status": "expired"}})
                    await db.messages.delete_many({"session_id": session_id})
                    return {"error": "Sessão expirada (30 dias inativa)", "session_status": "expired"}
                
    user_msg_dict = Message(session_id=session_id, role="user", content=request.input_text).model_dump()
    if request.input_audio_base64:
        user_msg_dict["audioBase64"] = request.input_audio_base64
    await db.messages.insert_one(user_msg_dict)
    
    count_user_msgs = await db.messages.count_documents({"session_id": session_id, "role": "user"})
    if count_user_msgs == 2:
        asyncio.create_task(trigger_n8n_title_webhook_task(session_id))
    
    segment = agent.get("segment", "")
    webhook_url = sub.get("config", {}).get("webhook_url") or agent.get("webhook_url")
    if not webhook_url:
        webhook_url = N8N_WEBHOOKS.get((segment or "").lower())

    if not webhook_url:
        return {"response_text": "Error: Webhook endpoint not mapped for this agent segment.", "session_id": session_id}

    sanitized_sub = dict(sub)
    if "_id" in sanitized_sub: sanitized_sub["_id"] = str(sanitized_sub["_id"])
    if "created_at" in sanitized_sub and isinstance(sanitized_sub["created_at"], datetime):
        sanitized_sub["created_at"] = sanitized_sub["created_at"].isoformat()
    if "updated_at" in sanitized_sub and isinstance(sanitized_sub["updated_at"], datetime):
        sanitized_sub["updated_at"] = sanitized_sub["updated_at"].isoformat()
        
    sanitized_agent = dict(agent)
    if "_id" in sanitized_agent: sanitized_agent["_id"] = str(sanitized_agent["_id"])
    if "created_at" in sanitized_agent and isinstance(sanitized_agent["created_at"], datetime):
        sanitized_agent["created_at"] = sanitized_agent["created_at"].isoformat()
        
    payload = {
        "subscription_id": request.subscription_id,
        "agent_id": request.agent_id,
        "session_id": session_id,
        "input_text": request.input_text,
        "input_audio_base64": request.input_audio_base64,
        "audio": request.audio,
        "custom_prompt": None,
        "user_context": {
            "subscription": sanitized_sub,
            "agent": sanitized_agent
        }
    }
    
    FALLBACK_TEXT = "Desculpe, sistema indisponível no momento."
    agent_response_text = FALLBACK_TEXT
    metadata = {}
    audio_b64 = None

    async with httpx.AsyncClient() as client:
        for attempt in range(3):
            try:
                resp = await client.post(webhook_url, json=payload, timeout=60.0)
                if resp.status_code == 200:
                    try:
                        n8n_data = resp.json()
                        if isinstance(n8n_data, list) and len(n8n_data) > 0:
                            n8n_data = n8n_data[0]
                        if isinstance(n8n_data, dict):
                            # Accept any of these keys from the n8n workflow.
                            extracted = (
                                n8n_data.get("output_text")
                                or n8n_data.get("response_text")
                                or n8n_data.get("output")
                                or n8n_data.get("resposta")
                                or n8n_data.get("message")
                                or n8n_data.get("text")
                            )
                            if extracted:
                                agent_response_text = extracted
                            else:
                                # Nothing usable in the JSON — log the shape so we can debug
                                logging.warning(
                                    f"Webhook 200 but no known text key. "
                                    f"webhook={webhook_url} keys={list(n8n_data.keys())} preview={str(n8n_data)[:500]}"
                                )
                                # Fall back to raw body if it looks like plain text
                                raw = (resp.text or "").strip()
                                if raw and raw not in ("{}", "[]"):
                                    agent_response_text = raw
                            audio_b64 = n8n_data.get("audio_base64", n8n_data.get("input_audio_base64"))
                            metadata = n8n_data.get("metadata", {})
                        else:
                            # Response was JSON but not a dict/list — treat as plain text
                            raw = (resp.text or "").strip()
                            if raw:
                                agent_response_text = raw
                    except Exception as parse_err:
                        logging.warning(f"Webhook 200 JSON parse failed: {parse_err}; using raw body")
                        raw = (resp.text or "").strip()
                        if raw:
                            agent_response_text = raw
                    break
                else:
                    # Non-200: log and stop retrying immediately — n8n is
                    # telling us something is wrong, retrying won't help.
                    logging.error(
                        f"Webhook non-200 (attempt {attempt+1}): status={resp.status_code} "
                        f"url={webhook_url} body={resp.text[:500] if resp.text else '<empty>'}"
                    )
                    break
            except Exception as e:
                logging.error(f"Webhook attempt {attempt+1} failed: {repr(e)}")
                if attempt == 2:
                    break
                    
    agent_msg_dict = Message(session_id=session_id, role="agent", content=agent_response_text).model_dump()
    if audio_b64:
        agent_msg_dict["audioBase64"] = audio_b64
    await db.messages.insert_one(agent_msg_dict)
    
    await db.chat_sessions.update_one(
        {"id": session_id}, 
        {"$set": {"last_interaction": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "response_text": agent_response_text,
        "audio_base64": audio_b64,
        "metadata": metadata,
        "session_id": session_id
    }

@api_router.post("/chat/session/{session_id}/close")
async def close_chat_session(session_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    session = await db.chat_sessions.find_one({"id": session_id, "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    await db.chat_sessions.update_one({"id": session_id}, {"$set": {"status": "closed"}})
    await db.messages.delete_many({"session_id": session_id})
    
    return {"status": "success", "message": "Sessão encerrada"}

@api_router.post("/client-chat/{session_id}/close")
async def close_client_chat_session(session_id: str):
    """Close a client (public) chat session - no auth required, keeps messages for history."""
    session = await db.chat_sessions.find_one({"id": session_id, "is_client_chat": True})
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {"status": "closed", "closed_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"status": "success", "message": "Atendimento finalizado"}

@api_router.get("/chat/session/{session_id}/history")
async def get_session_history(session_id: str, request: Request):
    if not await validate_api_token(request):
        raise HTTPException(status_code=403, detail="Acesso negado. Token inválido.")
        
    session = await db.chat_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")
    
    messages = await db.messages.find({"session_id": session_id}).sort("timestamp", 1).to_list(100)
    
    formatted_messages = []
    for msg in messages:
        formatted_messages.append({
            "message_id": str(msg.get("_id", "")),
            "role": msg.get("role"),
            "content": msg.get("content"),
            "audioBase64": msg.get("audioBase64"),
            "timestamp": msg.get("timestamp")
        })
        
    return {
        "ok": True,
        "session_id": session_id,
        "agent_id": session.get("agent_id"),
        "messages": formatted_messages
    }

@api_router.post("/knowledge-base")
async def save_kb(request: Request, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    payload = await request.json()
    agent_name = payload.get("agent")

    if not agent_name:
        raise HTTPException(status_code=400, detail="Agent id/name is required in payload")

    await db.knowledge_base.update_one(
        {"user_id": user_id, "agent": agent_name},
        {"$set": payload},
        upsert=True
    )

    # If this is the SDR agent, (re)register the scheduled lead-extraction job
    try:
        if _is_sdr_agent_name(agent_name):
            _register_or_update_sdr_job(
                user_id=user_id,
                enabled=bool(payload.get("scheduler_enabled", False)),
                time_str=payload.get("scheduler_time"),
            )
    except Exception as e:
        logger.warning(f"[SDR scheduler] could not update job on KB save: {e}")

    return {"status": "success"}

@api_router.get("/knowledge-base")
async def get_my_kb(agent: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    doc = await db.knowledge_base.find_one({"user_id": user_id, "agent": agent})
    if not doc:
        return {}
    doc.pop("_id", None)
    return doc

@api_router.post("/chat-links")
async def create_chat_link(subscription_id: str = Body(..., embed=True), current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    sub = await db.subscriptions.find_one({"id": subscription_id, "user_id": user_id, "status": "active"})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    chat_link = ChatLink(
        user_id=user_id,
        subscription_id=subscription_id,
        agent_id=sub["agent_id"]
    )
    await db.chat_links.insert_one(chat_link.model_dump())
    
    return {"link_id": chat_link.id}

@api_router.get("/chat-links/{link_id}")
async def get_chat_link_info(link_id: str):
    link = await db.chat_links.find_one({"id": link_id})
    if not link:
        raise HTTPException(status_code=404, detail="Link inválido")
    if link.get("status") == "used":
        session = await db.chat_sessions.find_one({"chat_link_id": link_id})
        if session:
            return {"ok": True, "already_used": True, "session_id": session["id"]}
        raise HTTPException(status_code=400, detail="Este link já foi utilizado e a sessão foi perdida")
        
    agent = await db.agents.find_one({"id": link["agent_id"]})
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não encontrado")
        
    return {
        "ok": True,
        "agent_name": agent.get("name"),
        "agent_avatar": agent.get("mascot_image_url"),
        "agent_segment": agent.get("segment")
    }

class StartClientChatRequest(BaseModel):
    link_id: str
    client_name: str
    client_email: EmailStr

@api_router.post("/client-chat/start")
async def start_client_chat(request: StartClientChatRequest):
    link = await db.chat_links.find_one({"id": request.link_id})
    if not link:
        raise HTTPException(status_code=404, detail="Link inválido")
    if link.get("status") == "used":
        session = await db.chat_sessions.find_one({"chat_link_id": request.link_id})
        if session:
            return {"session_id": session["id"]}
        raise HTTPException(status_code=400, detail="Este link já foi utilizado e a sessão foi perdida")
        
    # Mark as used (queimar o link)
    await db.chat_links.update_one({"id": request.link_id}, {"$set": {"status": "used"}})
    
    new_session = ChatSession(
        user_id=link["user_id"], # SaaS user owner
        agent_id=link["agent_id"],
        subscription_id=link["subscription_id"],
        status="active",
        is_client_chat=True,
        client_name=request.client_name,
        client_email=request.client_email,
        chat_link_id=request.link_id
    )
    await db.chat_sessions.insert_one(new_session.model_dump())
    
    return {"session_id": new_session.id}

class ClientChatWebhookRequest(BaseModel):
    session_id: str
    input_text: str = ""
    input_audio_base64: Optional[str] = None
    audio: bool = False

@api_router.post("/client-chat/message")
async def process_client_chat(request: ClientChatWebhookRequest):
    # This route bypasses Bearer token, strictly uses session_id
    if not request.session_id:
        raise HTTPException(status_code=400, detail="session_id é obrigatório para chat de clientes")
        
    session = await db.chat_sessions.find_one({"id": request.session_id})
    if not session or not session.get("is_client_chat"):
        raise HTTPException(status_code=404, detail="Sessão de cliente inválida")
        
    if session.get("status") != "active":
        raise HTTPException(status_code=400, detail="Sessão está encerrada ou expirada")

    sub = await db.subscriptions.find_one({"id": session["subscription_id"]})
    agent = await db.agents.find_one({"id": session["agent_id"]})

    user_msg_dict = Message(session_id=request.session_id, role="user", content=request.input_text).model_dump()
    if request.input_audio_base64:
        user_msg_dict["audioBase64"] = request.input_audio_base64
    await db.messages.insert_one(user_msg_dict)
    
    segment = agent.get("segment", "")
    webhook_url = sub.get("config", {}).get("webhook_url") or agent.get("webhook_url")
    if not webhook_url:
        webhook_url = N8N_WEBHOOKS.get((segment or "").lower())

    if not webhook_url:
        return {"response_text": "Error: Webhook endpoint not mapped for this agent segment.", "session_id": request.session_id}

    sanitized_sub = dict(sub)
    if "_id" in sanitized_sub: sanitized_sub["_id"] = str(sanitized_sub["_id"])
    if "created_at" in sanitized_sub and isinstance(sanitized_sub["created_at"], datetime):
        sanitized_sub["created_at"] = sanitized_sub["created_at"].isoformat()
    
    sanitized_agent = dict(agent)
    if "_id" in sanitized_agent: sanitized_agent["_id"] = str(sanitized_agent["_id"])
    if "created_at" in sanitized_agent and isinstance(sanitized_agent["created_at"], datetime):
        sanitized_agent["created_at"] = sanitized_agent["created_at"].isoformat()

    payload = {
        "subscription_id": session["subscription_id"],
        "agent_id": session["agent_id"],
        "session_id": request.session_id,
        "input_text": request.input_text,
        "input_audio_base64": request.input_audio_base64,
        "audio": request.audio,
        "custom_prompt": None,
        "user_context": {
            "subscription": sanitized_sub,
            "agent": sanitized_agent
        }
    }

    agent_response_text = ""
    audio_b64 = None
    metadata = {}
    
    async with httpx.AsyncClient() as client:
        for attempt in range(3):
            try:
                resp = await client.post(webhook_url, json=payload, timeout=60.0)
                if resp.status_code == 200:
                    try:
                        n8n_data = resp.json()
                        if isinstance(n8n_data, list) and len(n8n_data) > 0: n8n_data = n8n_data[0]
                        if isinstance(n8n_data, dict):
                            agent_response_text = n8n_data.get("output_text", n8n_data.get("response_text", n8n_data.get("output", n8n_data.get("resposta", agent_response_text))))
                            audio_b64 = n8n_data.get("audio_base64", n8n_data.get("input_audio_base64"))
                            metadata = n8n_data.get("metadata", {})
                    except:
                        agent_response_text = resp.text
                    break
            except Exception as e:
                logging.error(f"Webhook Attempt {attempt+1} Failed: {repr(e)}")
                if attempt == 2: break
                    
    agent_msg_dict = Message(session_id=request.session_id, role="agent", content=agent_response_text).model_dump()
    if audio_b64:
        agent_msg_dict["audioBase64"] = audio_b64
    await db.messages.insert_one(agent_msg_dict)
    
    await db.chat_sessions.update_one(
        {"id": request.session_id}, 
        {"$set": {"last_interaction": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "response_text": agent_response_text,
        "audio_base64": audio_b64,
        "metadata": metadata,
        "session_id": request.session_id
    }

@api_router.get("/client-chat/{session_id}")
async def get_client_chat_session(session_id: str):
    session = await db.chat_sessions.find_one({"id": session_id})
    if not session or not session.get("is_client_chat"):
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
        
    agent = await db.agents.find_one({"id": session["agent_id"]})
    messages = await db.messages.find({"session_id": session_id}).sort("timestamp", 1).to_list(1000)
    
    # Strip sensitive data
    agent_safe = {
        "name": agent.get("name"),
        "mascot_image_url": agent.get("mascot_image_url"),
        "segment": agent.get("segment")
    }
    
    msgs_safe = []
    for m in messages:
        msgs_safe.append({
            "role": m.get("role"),
            "content": m.get("content", ""),
            "audioBase64": m.get("audioBase64"),
            "timestamp": m.get("timestamp")
        })
        
    return {
        "status": session.get("status"),
        "agent": agent_safe,
        "messages": msgs_safe
    }

def _coerce_to_utc_datetime(value):
    """Accept datetime OR ISO-8601 string and return a timezone-aware UTC datetime.
    Returns None if the value can't be parsed.

    The chat_sessions collection has historically been written in two different
    ways (Pydantic model_dump keeps datetime objects, manual dicts stored
    `.isoformat()` strings), so any code that compares these timestamps must
    handle both shapes or it will raise TypeError and break the endpoint.
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            # `fromisoformat` in Python 3.11+ handles the "Z" suffix, older
            # versions need it swapped for "+00:00".
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            return None
    return None


async def purge_expired_sessions(subscription_id: str = None, user_id: str = None):
    """Delete sessions expired >30 days based on last interaction or closed_at. Purge messages too."""
    THIRTY_DAYS = timedelta(days=30)
    cutoff_dt = datetime.now(timezone.utc) - THIRTY_DAYS

    query = {}
    if subscription_id:
        query["subscription_id"] = subscription_id
    if user_id:
        query["user_id"] = user_id

    # A session is expired if:
    # - closed: closed_at < cutoff
    # - active: last_interaction (or created_at) < cutoff
    expired_ids = []
    try:
        async for sess in db.chat_sessions.find(query, {"id": 1, "status": 1, "closed_at": 1, "last_interaction": 1, "created_at": 1}):
            raw_ref = sess.get("closed_at") or sess.get("last_interaction") or sess.get("created_at")
            ref_dt = _coerce_to_utc_datetime(raw_ref)
            if ref_dt and ref_dt < cutoff_dt:
                expired_ids.append(sess["id"])
    except Exception as e:
        # Never let a purge failure bubble up into the listing endpoints.
        logger.exception(f"purge_expired_sessions scan failed: {e}")
        return

    if expired_ids:
        try:
            await db.messages.delete_many({"session_id": {"$in": expired_ids}})
            await db.chat_sessions.delete_many({"id": {"$in": expired_ids}})
            logger.info(f"Purged {len(expired_ids)} expired sessions")
        except Exception as e:
            logger.exception(f"purge_expired_sessions delete failed: {e}")

@api_router.get("/subscriptions/{subscription_id}/client-sessions")
async def get_client_sessions_history(subscription_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    sub = await db.subscriptions.find_one({"id": subscription_id, "user_id": user_id})
    if not sub:
        raise HTTPException(status_code=403, detail="Subscription not found")

    # Purge expired client sessions (non-fatal)
    try:
        await purge_expired_sessions(subscription_id=subscription_id)
    except Exception as e:
        logger.exception(f"Non-fatal: purge (client sessions) failed for sub {subscription_id}: {e}")

    sessions = await db.chat_sessions.find({
        "subscription_id": subscription_id,
        "is_client_chat": True
    }).sort("last_interaction", -1).to_list(100)

    results = []
    for s in sessions:
        msgs = await db.messages.find({"session_id": s["id"]}).sort("timestamp", 1).limit(2).to_list(2)
        preview = []
        for m in msgs:
            preview.append({
                "role": m.get("role"),
                "content": m.get("content", ""),
                "has_audio": bool(m.get("audioBase64"))
            })
        results.append({
            "session_id": s["id"],
            "client_name": s.get("client_name", "Desconhecido"),
            "client_email": s.get("client_email", ""),
            "status": s.get("status"),
            "created_at": s.get("created_at"),
            "last_interaction": s.get("last_interaction"),
            "preview_messages": preview
        })

    return results

# ==================== SDR SCHEDULER + NOTIFICATIONS ====================
# Lead-extraction scheduler: at the user-configured time we call the SDR n8n
# webhook asking for N leads, and store the webhook response as a notification
# that the floating chat renders (with a red unread badge).

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

SDR_WEBHOOK_URL = N8N_WEBHOOKS["sdr"]
SDR_SCHED_TZ = os.environ.get("SDR_SCHEDULER_TZ", "America/Sao_Paulo")

sdr_scheduler = AsyncIOScheduler(timezone=SDR_SCHED_TZ)


def _is_sdr_agent_name(name: str) -> bool:
    if not name:
        return False
    lower = name.lower()
    return ("sdr" in lower) or ("bruno" in lower)


async def _find_user_sdr_subscription(user_id: str) -> Optional[dict]:
    """Return the user's active SDR subscription (by agent name/segment) or None."""
    subs = await db.subscriptions.find(
        {"user_id": user_id, "status": "active"}
    ).to_list(length=100)
    for sub in subs:
        agent = await db.agents.find_one({"id": sub.get("agent_id")})
        if not agent:
            continue
        seg = (agent.get("segment") or "").lower()
        name = agent.get("name") or ""
        if seg == "sdr" or _is_sdr_agent_name(name):
            sub["_agent"] = agent
            return sub
    return None


async def _insert_sdr_notification(user_id: str, sub: Optional[dict], qty: int, content: str,
                                    metadata: Optional[Dict] = None, status_code: Optional[int] = None,
                                    ntype: str = "lead_extraction"):
    await db.sdr_notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "subscription_id": (sub or {}).get("id"),
        "agent_id": (sub or {}).get("agent_id"),
        "type": ntype,
        "content": content,
        "metadata": metadata or {},
        "requested_quantity": qty,
        "webhook_status": status_code,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def _run_sdr_lead_extraction(user_id: str, force: bool = False, qty_override: Optional[int] = None):
    """Trigger the SDR webhook and persist the response as a notification.

    - force=False (APScheduler cron): obeys scheduler_enabled + scheduler_leads_qty from KB.
    - force=True ("Testar agora"): always runs. Uses qty_override, then KB qty, else 10 as default.
    Any failure is surfaced as an error notification so the user sees it in the floating chat.
    """
    try:
        kb = await db.knowledge_base.find_one({"user_id": user_id, "agent": {"$regex": "sdr|bruno", "$options": "i"}})

        # Scheduled runs: still require the toggle to be ON
        if not force and (not kb or not kb.get("scheduler_enabled")):
            return

        # Determine quantity: explicit override > KB config > default 10 (only when forced)
        kb_qty = int(kb.get("scheduler_leads_qty") or 0) if kb else 0
        qty = qty_override or kb_qty or (10 if force else 0)
        if qty <= 0:
            return

        sub = await _find_user_sdr_subscription(user_id)
        if not sub:
            msg = "Não foi possível acionar o webhook: nenhuma assinatura ativa do SDR (Bruno) encontrada para este usuário."
            logger.warning(f"[SDR trigger] {msg} (user={user_id})")
            if force:
                await _insert_sdr_notification(user_id, None, qty, msg, ntype="lead_extraction_error")
            return

        agent = sub.get("_agent") or {}
        webhook_url = sub.get("config", {}).get("webhook_url") or agent.get("webhook_url") or SDR_WEBHOOK_URL

        # Sanitize sub + agent (mirror of the chat payload so the n8n workflow
        # can reuse the same expressions, e.g. {{ $json.status }} /
        # {{ $json.user_context.subscription.status }}).
        sanitized_sub = dict(sub)
        sanitized_sub.pop("_agent", None)
        if "_id" in sanitized_sub:
            sanitized_sub["_id"] = str(sanitized_sub["_id"])
        for _dtk in ("created_at", "updated_at"):
            if isinstance(sanitized_sub.get(_dtk), datetime):
                sanitized_sub[_dtk] = sanitized_sub[_dtk].isoformat()

        sanitized_agent = dict(agent)
        if "_id" in sanitized_agent:
            sanitized_agent["_id"] = str(sanitized_agent["_id"])
        for _dtk in ("created_at", "updated_at"):
            if isinstance(sanitized_agent.get(_dtk), datetime):
                sanitized_agent[_dtk] = sanitized_agent[_dtk].isoformat()

        sub_status = sanitized_sub.get("status")

        # Prompt enviado ao agente (o n8n lê via {{ $json.body.input_text }})
        input_text = f"Olá, preciso de {qty} leads"

        # n8n's Webhook node already nests the POST body under $json.body, so we
        # keep input_text at the root here to access it as {{ $json.body.input_text }}.
        payload = {
            "trigger": "manual_test" if force else "scheduled_lead_extraction",
            "status": sub_status,  # top-level for {{ $json.body.status }}
            "input_text": input_text,  # => {{ $json.body.input_text }}
            "user_id": user_id,
            "subscription_id": sub.get("id"),
            "agent_id": sub.get("agent_id"),
            "quantity": qty,
            "knowledge_base": {k: v for k, v in (kb or {}).items() if k != "_id"},
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
            "user_context": {
                "subscription": sanitized_sub,
                "agent": sanitized_agent,
            },
        }

        label = "Teste manual" if force else "Execução agendada"
        content_text = f"{label} disparado: {qty} lead(s) solicitados."
        metadata: Dict = {}
        status_code = None

        async with httpx.AsyncClient(timeout=120.0) as cli:
            try:
                resp = await cli.post(webhook_url, json=payload)
                status_code = resp.status_code
                if resp.status_code == 200:
                    try:
                        data = resp.json()
                        if isinstance(data, list) and data:
                            data = data[0]
                        if isinstance(data, dict):
                            content_text = data.get(
                                "output_text",
                                data.get("response_text", data.get("message", content_text))
                            )
                            metadata = data.get("metadata", {}) or {}
                    except Exception:
                        content_text = resp.text[:2000] or content_text
                else:
                    content_text = f"Webhook retornou status {resp.status_code}. Resposta: {resp.text[:500]}"
            except Exception as e:
                content_text = f"Falha ao acionar webhook SDR: {e}"
                logger.error(f"[SDR trigger] webhook call failed: {e}")

        await _insert_sdr_notification(
            user_id=user_id, sub=sub, qty=qty,
            content=content_text, metadata=metadata, status_code=status_code,
        )
    except Exception as e:
        logger.exception(f"[SDR trigger] unexpected error for user {user_id}: {e}")


def _sdr_job_id(user_id: str) -> str:
    return f"sdr_lead_{user_id}"


def _register_or_update_sdr_job(user_id: str, enabled: bool, time_str: Optional[str]):
    job_id = _sdr_job_id(user_id)
    existing = sdr_scheduler.get_job(job_id)

    if not enabled or not time_str:
        if existing:
            sdr_scheduler.remove_job(job_id)
        return

    try:
        hour, minute = time_str.split(":")[:2]
        hour = int(hour)
        minute = int(minute)
    except Exception:
        logger.warning(f"[SDR scheduler] invalid time '{time_str}' for user {user_id}")
        return

    trigger = CronTrigger(hour=hour, minute=minute, timezone=SDR_SCHED_TZ)
    if existing:
        sdr_scheduler.reschedule_job(job_id, trigger=trigger)
    else:
        sdr_scheduler.add_job(
            _run_sdr_lead_extraction,
            trigger=trigger,
            id=job_id,
            args=[user_id],
            replace_existing=True,
            misfire_grace_time=3600,
            coalesce=True,
        )


@app.on_event("startup")
async def _sdr_scheduler_startup():
    try:
        sdr_scheduler.start()
        # Reload any persisted enabled schedules
        cursor = db.knowledge_base.find({"scheduler_enabled": True})
        async for kb in cursor:
            if not _is_sdr_agent_name(kb.get("agent", "")):
                continue
            _register_or_update_sdr_job(
                kb.get("user_id"),
                True,
                kb.get("scheduler_time"),
            )
        logger.info(f"[SDR scheduler] started with {len(sdr_scheduler.get_jobs())} job(s)")
    except Exception as e:
        logger.exception(f"[SDR scheduler] startup error: {e}")


@app.on_event("shutdown")
async def _sdr_scheduler_shutdown():
    try:
        if sdr_scheduler.running:
            sdr_scheduler.shutdown(wait=False)
    except Exception:
        pass


@api_router.get("/sdr/has-subscription")
async def sdr_has_subscription(current_user: dict = Depends(get_current_user)):
    sub = await _find_user_sdr_subscription(current_user["user_id"])
    return {"has_sdr": bool(sub)}


@api_router.get("/sdr/notifications")
async def list_sdr_notifications(
    current_user: dict = Depends(get_current_user),
    limit: int = 50,
):
    user_id = current_user["user_id"]
    cursor = db.sdr_notifications.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
    items = []
    async for n in cursor:
        n.pop("_id", None)
        items.append(n)
    unread = await db.sdr_notifications.count_documents({"user_id": user_id, "read": False})
    return {"items": items, "unread": unread}


@api_router.get("/sdr/unread-count")
async def sdr_unread_count(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    unread = await db.sdr_notifications.count_documents({"user_id": user_id, "read": False})
    return {"unread": unread}


@api_router.post("/sdr/notifications/mark-read")
async def mark_sdr_notifications_read(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    res = await db.sdr_notifications.update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True}},
    )
    return {"updated": res.modified_count}


@api_router.post("/sdr/trigger-now")
async def sdr_trigger_now(request: Request, current_user: dict = Depends(get_current_user)):
    """Manual trigger: fires the SDR webhook now, even if the scheduler is off.

    Optional JSON body: {"quantity": <int>} to override the configured lead count.
    """
    qty_override: Optional[int] = None
    try:
        body = await request.json()
        if isinstance(body, dict) and body.get("quantity"):
            qty_override = int(body["quantity"])
    except Exception:
        pass

    asyncio.create_task(_run_sdr_lead_extraction(
        current_user["user_id"], force=True, qty_override=qty_override
    ))
    return {"status": "queued"}


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

_cors_raw = os.environ.get('CORS_ORIGINS', '*').strip()
_cors_origins = [o.strip() for o in _cors_raw.split(',') if o.strip()]
# Per the CORS spec (and Starlette), allow_credentials=True is incompatible
# with allow_origins=['*']. If the deployer passes '*', we must disable
# credentials; otherwise we honor their explicit origin list with credentials on.
if _cors_origins == ['*']:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=False,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=_cors_origins,
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