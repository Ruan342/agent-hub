from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

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
    mascot_image_hero_url: Optional[str] = None  # Imagem grande do hero (topo)
    mascot_image_feature_url: Optional[str] = None  # Imagem da seÃ§Ã£o de recursos
    mascot_image_cta_url: Optional[str] = None  # Imagem do CTA final
    voice_call_image_url: Optional[str] = None  # Imagem para o modo de chamada de voz
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

class KnowledgeBaseConfig(BaseModel):
    agent: str
    duvidas_frequentes: str = ""
    recomendacoes: str = ""
    combos_de_produtos: str = ""
    controle_de_estoque: str = ""

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
    # Para processamento de mÃ­dia
    process_images: bool = True
    process_audio: bool = True

class SendWhatsAppRequest(BaseModel):
    integration_id: str
    to_phone: str
    message: str
    message_type: str = "text"  # text, template, media

class WhatsAppIncomingMessage(BaseModel):
    from_phone: str
    message_text: Optional[str] = None
    message_type: str  # text, image, audio, video
    media_url: Optional[str] = None
    media_id: Optional[str] = None
    timestamp: str

# CRM Integration
class CRMConfig(BaseModel):
    crm_type: str  # salesforce, hubspot, pipedrive, custom
    api_key: Optional[str] = None
    api_url: Optional[str] = None
    webhook_url: Optional[str] = None
    custom_fields_mapping: Optional[Dict] = None
    # Headers customizados para autenticaÃ§Ã£o
    custom_headers: Optional[Dict] = None
    # Ativar sync automÃ¡tico quando conversa acontece
    auto_sync: bool = True

class CRMSyncRequest(BaseModel):
    integration_id: str
    action: str  # create, update, upsert
    contact_data: Dict

class CRMContactData(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    custom_fields: Optional[Dict] = None

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
    greeting_message: str = "OlÃ¡! Como posso ajudar?"
    voice_enabled: bool = True
    text_enabled: bool = True

# Analytics Models
class AnalyticsEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    subscription_id: str
    agent_id: str
    integration_type: str  # email, whatsapp, widget, crm, webhook
    event_type: str  # message_sent, message_received, integration_used, error
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

# Rate Limiting Models
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

# Monitoring Models
class MonitoringLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    level: str  # info, warning, error, critical
    source: str  # integration_type or system
    message: str
    metadata: Optional[Dict] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved: bool = False

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

class ChatLink(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    subscription_id: str
    agent_id: str
    status: str = "active"  # active, used
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    agent_id: str
    subscription_id: str
    status: str = "active"  # active | closed | expired
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
    role: str  # "user" or "agent"
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Knowledge Base Models
class EcommerceKnowledgeBase(BaseModel):
    duvidas: List[str] = []
    recomendacoes: List[Dict] = []  # e.g., {'produtos': '...', 'publico_alvo': '...', 'sugerido': '...'}
    combos: List[Dict] = []
    estoque: List[Dict] = []  # e.g., {'produto': '...', 'quantidade': int}

class FinanceiroKnowledgeBase(BaseModel):
    vencimentos: List[Dict] = [] # e.g., {'descricao': '...', 'codigo': '...', 'data_vencimento': '...'}

class PosVendasKnowledgeBase(BaseModel):
    processo_vendas: str = ""
    clientes: List[Dict] = []  # e.g., {'nome': '...', 'status': '...', 'produto': '...'}
    politicas: Dict = {} # e.g., {'upsell': '...', 'renovacao': '...', 'ativacao': '...'}

class NutricaoTreinoKnowledgeBase(BaseModel):
    contexto: str = ""  # Generic field until user defines specific requirements

class KnowledgeBaseConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    subscription_id: str
    agent_type: str  # ecommerce, financeiro, posvendas, nutricao
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

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

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
