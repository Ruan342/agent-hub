# VoiceAI Hub - API Documentation

## 🚀 Execução de Agentes de Voz

### Endpoint: `POST /api/agent/execute`

Este endpoint permite que clientes executem seus agentes de voz com entrada de texto ou áudio.

---

## 🔑 Autenticação

Todos os requests precisam incluir a API Key no header:

```
Authorization: Bearer vapi_xxxxxxxxxxxxx
```

A API Key é gerada automaticamente quando você assina um agente e pode ser encontrada no seu Dashboard.

---

## 📥 Request

### Headers
```
Content-Type: application/json
Authorization: Bearer vapi_xxxxxxxxxxxxx
```

### Body Parameters

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `input_text` | string | Não* | Texto de entrada para o agente processar |
| `input_audio_base64` | string | Não* | Áudio codificado em base64 (formato WAV ou MP3) |
| `session_id` | string | Não | ID da sessão para manter contexto de conversa |

*Pelo menos um dos dois (`input_text` ou `input_audio_base64`) deve ser fornecido.

### Exemplo - Texto
```json
{
  "input_text": "Olá, gostaria de saber mais sobre seus serviços",
  "session_id": "session_abc123"
}
```

### Exemplo - Áudio
```json
{
  "input_audio_base64": "UklGRiQAAABXQVZFZm10IBAAAAABAAEA...",
  "session_id": "session_abc123"
}
```

---

## 📤 Response

### Success Response (200 OK)

```json
{
  "output_text": "Olá! Fico feliz em ajudar. Oferecemos soluções de automação...",
  "output_audio_base64": "UklGRiQAAABXQVZFZm10IBAAAAABAAEA...",
  "session_id": "session_abc123"
}
```

### Response Fields

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `output_text` | string | Resposta do agente em texto |
| `output_audio_base64` | string | Áudio da resposta em base64 (pode ser null se erro no TTS) |
| `session_id` | string | ID da sessão (mantém contexto) |

---

## ⚠️ Error Responses

### 401 Unauthorized
```json
{
  "detail": "Invalid or inactive API key"
}
```

### 400 Bad Request
```json
{
  "detail": "Either input_text or input_audio_base64 is required"
}
```

### 404 Not Found
```json
{
  "detail": "Agent not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Error processing with LLM: ..."
}
```

---

## 🎯 Como Funciona

1. **Autenticação**: Sistema valida sua API Key e identifica sua subscription
2. **Transcrição** (se áudio): Áudio é transcrito usando OpenAI Whisper
3. **Processamento LLM**: 
   - Combina `base_prompt` do agente + `custom_prompt` da sua configuração
   - Adiciona contexto da sua empresa (nome, produto, público, tom)
   - Processa com o LLM configurado (GPT-5, Claude, Gemini)
4. **Síntese de Voz**: Resposta é convertida em áudio usando ElevenLabs
5. **Resposta**: Retorna texto + áudio

---

## 🔗 Integração com CRMs e Sistemas

### Exemplo: Integração com WhatsApp via Webhook

```python
import requests
import base64

API_KEY = "vapi_xxxxxxxxxxxxx"
VOICEAI_URL = "https://sua-instancia.com/api/agent/execute"

def process_whatsapp_message(message_text, user_phone):
    response = requests.post(
        VOICEAI_URL,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "input_text": message_text,
            "session_id": f"whatsapp_{user_phone}"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        return data["output_text"]
    else:
        return "Erro ao processar mensagem"
```

### Exemplo: Integração com Telefone (Twilio)

```python
from twilio.rest import Client
import requests
import base64

TWILIO_SID = "your_twilio_sid"
TWILIO_TOKEN = "your_twilio_token"
API_KEY = "vapi_xxxxxxxxxxxxx"

twilio_client = Client(TWILIO_SID, TWILIO_TOKEN)

def make_voice_call(to_phone, message):
    # 1. Enviar mensagem para o agente
    response = requests.post(
        "https://sua-instancia.com/api/agent/execute",
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={"input_text": message}
    )
    
    # 2. Obter áudio da resposta
    audio_base64 = response.json()["output_audio_base64"]
    audio_bytes = base64.b64decode(audio_base64)
    
    # 3. Fazer chamada com Twilio
    # (implementação específica depende do seu setup)
    # ...
```

### Exemplo: Integração com CRM (Salesforce, HubSpot)

```python
import requests

def process_lead_callback(lead_phone, lead_name, product_interest):
    message = f"Olá {lead_name}, vi que você tem interesse em {product_interest}. Como posso ajudar?"
    
    response = requests.post(
        "https://sua-instancia.com/api/agent/execute",
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={
            "input_text": message,
            "session_id": f"lead_{lead_phone}"
        }
    )
    
    # Registrar interação no CRM
    # ...
```

---

## 🎨 Personalização

### Contexto Automático

O agente automaticamente inclui o contexto que você configurou no Dashboard:
- Nome da empresa
- Produto/Serviço
- Público-alvo
- Tom de voz

Exemplo de como o contexto é aplicado:

**Seu Dashboard:**
```
Empresa: TechSolutions
Produto: Software de Gestão
Público: Pequenas empresas
Tom: Profissional e amigável
```

**Prompt Final Enviado ao LLM:**
```
[Base Prompt do Agente]

[Seu Custom Prompt]

Contexto da empresa:
Empresa: TechSolutions
Produto/Serviço: Software de Gestão
Público-alvo: Pequenas empresas
Tom de voz: Profissional e amigável
```

---

## 💡 Melhores Práticas

1. **Session ID**: Sempre use o mesmo `session_id` para manter o contexto da conversa
2. **Timeout**: Configure timeout de pelo menos 30s para processamento de áudio
3. **Rate Limiting**: Implemente controle de taxa para evitar custos excessivos
4. **Error Handling**: Sempre trate erros 500/503 com retry exponencial
5. **Logging**: Registre todas as chamadas para análise posterior

---

## 📊 Modelos Disponíveis

Cada agente pode usar diferentes modelos de LLM:

### OpenAI
- **GPT-5** - Mais capaz, melhor raciocínio
- **GPT-5 Mini** - Balanceado entre custo e performance
- **GPT-4o** - Versão anterior, ainda muito capaz
- **GPT-4o Mini** - Mais econômico

### Anthropic (Claude)
- **Claude 4 Sonnet** - Premium, excelente para tarefas complexas
- **Claude 3.7 Sonnet** - Alta qualidade
- **Claude 3.5 Sonnet** - Balanceado
- **Claude 3.5 Haiku** - Rápido e econômico

### Google (Gemini)
- **Gemini 2.5 Pro** - Mais capaz
- **Gemini 2.5 Flash** - Rápido
- **Gemini 2.0 Flash** - Econômico
- **Gemini 1.5 Pro** - Versão anterior

O modelo é escolhido pelo admin ao criar o agente e impacta o preço mensal.

---

## 🔒 Segurança e Isolamento

- ✅ **Isolamento Total**: Cada cliente tem sua API Key única
- ✅ **Dados Separados**: Custom prompts e configs são isolados por subscription
- ✅ **Logs Independentes**: Cada execução é registrada separadamente
- ✅ **Session Management**: Sessions são independentes por cliente

---

## 📞 Suporte

Para dúvidas sobre integração ou problemas técnicos, entre em contato com o suporte técnico através do dashboard.
