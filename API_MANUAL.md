# 📘 Manual de APIs — Agent Hub Platform

> **Base URL:** `http://localhost:8001/api`  
> **Autenticação:** A maioria dos endpoints protegidos utiliza Bearer Token JWT no header:  
> `Authorization: Bearer <seu_token>`

---

## Índice

1. [Autenticação](#1-autenticação)
2. [Agentes](#2-agentes)
3. [Assinaturas](#3-assinaturas)
4. [Chat Principal](#4-chat-principal)
5. [Sessões de Chat](#5-sessões-de-chat)
6. [Base de Conhecimento](#6-base-de-conhecimento)
7. [Links de Cliente (B2B2C)](#7-links-de-cliente-b2b2c)
8. [Chat de Cliente Público](#8-chat-de-cliente-público)
9. [Integrações](#9-integrações)
10. [Analytics](#10-analytics)
11. [Monitoramento](#11-monitoramento)
12. [Admin](#12-admin)
13. [TTS / Voz](#13-tts--voz)
14. [Arquivos Estáticos](#14-arquivos-estáticos)

---

## 1. Autenticação

### `POST /api/auth/register`
Cria um novo usuário na plataforma.

**Autenticação:** Pública

**Body:**
```json
{
  "email": "usuario@email.com",
  "name": "Nome do Usuário",
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "token": "eyJ...",
  "user": { "id": "uuid", "email": "usuario@email.com", "name": "Nome", "role": "customer" }
}
```

---

### `POST /api/auth/login`
Autentica um usuário e retorna o token JWT.

**Autenticação:** Pública

**Body:**
```json
{
  "email": "usuario@email.com",
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "token": "eyJ...",
  "user": { "id": "uuid", "email": "...", "name": "Nome", "role": "customer" }
}
```

---

### `GET /api/auth/me`
Retorna os dados do usuário autenticado.

**Autenticação:** Bearer Token

**Resposta:**
```json
{ "id": "uuid", "email": "usuario@email.com", "name": "Nome", "role": "customer" }
```

---

## 2. Agentes

### `GET /api/agents`
Lista todos os agentes disponíveis no marketplace.

**Autenticação:** Pública

**Resposta:**
```json
[
  {
    "id": "uuid", "name": "Lucy E-commerce", "segment": "ecommerce",
    "description": "...", "price": 49.90, "features": ["Feature 1"],
    "mascot_image_url": "http://.../api/uploads/agents/lucy.png"
  }
]
```

---

### `GET /api/agents/{agent_id}`
Retorna detalhes de um agente específico.

**Autenticação:** Pública

**Parâmetro:** `agent_id` — UUID do agente

---

## 3. Assinaturas

### `POST /api/subscriptions`
Cria nova assinatura para o usuário logado.

**Autenticação:** Bearer Token

**Body:**
```json
{ "agent_id": "uuid-do-agente" }
```

---

### `GET /api/subscriptions/me`
Retorna todas as assinaturas ativas do usuário autenticado.

**Autenticação:** Bearer Token

**Resposta:**
```json
[
  {
    "id": "uuid", "user_id": "uuid", "agent_id": "uuid",
    "status": "active", "config": {}, "created_at": "2026-01-01T00:00:00Z"
  }
]
```

---

### `PUT /api/subscriptions/{sub_id}/config`
Atualiza a configuração de uma assinatura.

**Autenticação:** Bearer Token

**Body:**
```json
{
  "custom_prompt": "Você é um assistente especializado em...",
  "config": { "webhook_url": "https://seu-webhook.com/endpoint" }
}
```

---

### `GET /api/subscriptions/{sub_id}/session`
Recupera a sessão de chat mais recente de uma assinatura.

**Autenticação:** Bearer Token

---

### `POST /api/subscriptions/checkout`
Inicia um checkout Stripe para ativação de assinatura.

**Autenticação:** Bearer Token

**Body:**
```json
{ "agent_id": "uuid-do-agente" }
```

**Resposta:**
```json
{ "checkout_url": "https://checkout.stripe.com/...", "session_id": "cs_..." }
```

---

### `GET /api/subscriptions/checkout/status/{session_id}`
Verifica o status do checkout Stripe após o pagamento.

**Autenticação:** Bearer Token

**Parâmetro de rota:** `session_id` — ID da sessão Stripe (começa com `cs_`)

---

### `GET /api/subscriptions/{subscription_id}`
Retorna detalhes de uma assinatura específica.

**Autenticação:** Bearer Token

---

### `PUT /api/subscriptions/{subscription_id}/webhook`
Configura a URL de webhook de uma assinatura.

**Autenticação:** Bearer Token

**Body:**
```json
{ "webhook_url": "https://meu-n8n.com/webhook/agente" }
```

---

### `GET /api/subscriptions/{subscription_id}/client-sessions`
Lista sessões de clientes que usaram o link único da assinatura.

**Autenticação:** Bearer Token

**Resposta:**
```json
[
  {
    "session_id": "uuid", "client_name": "João Silva",
    "client_email": "joao@email.com", "status": "closed",
    "created_at": "2026-03-29T14:00:00Z", "preview_messages": [...]
  }
]
```

---

## 4. Chat Principal

### `POST /api/chat`
Envia mensagem para um agente via assinatura autenticada. Roteia para o webhook n8n.

**Autenticação:** Bearer Token

**Body:**
```json
{
  "subscription_id": "uuid", "agent_id": "uuid",
  "session_id": "uuid-opcional",
  "input_text": "Preciso de ajuda com meu pedido",
  "audio": false, "input_audio_base64": null
}
```

**Resposta:**
```json
{
  "response_text": "Olá! Posso te ajudar...",
  "audio_base64": null, "metadata": {}, "session_id": "uuid"
}
```

---

### `POST /api/chat/session/{session_id}/close`
Encerra uma sessão de chat autenticada (usuário logado).

**Autenticação:** Bearer Token

---

### `GET /api/chat/session/{session_id}/history`
Recupera histórico completo de mensagens de uma sessão.

**Autenticação:** Token de API (Header `x-api-key` ou `Authorization: Bearer <API_HISTORY_TOKEN>`)

**Resposta:**
```json
{
  "ok": true, "session_id": "uuid", "agent_id": "uuid",
  "messages": [
    { "role": "user", "content": "Olá", "timestamp": "..." },
    { "role": "agent", "content": "Olá! Como posso ajudar?", "timestamp": "..." }
  ]
}
```

---

## 5. Sessões de Chat

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/chat-sessions` | Cria nova sessão de chat |
| `GET` | `/api/chat-sessions/subscription/{id}` | Lista sessões de uma assinatura |
| `GET` | `/api/chat-sessions/{session_id}` | Detalhes de uma sessão |
| `POST` | `/api/chat-sessions/{session_id}/messages` | Adiciona mensagem a uma sessão |
| `DELETE` | `/api/chat-sessions/{session_id}` | Remove sessão e mensagens |

Todos exigem **Bearer Token**.

---

## 6. Base de Conhecimento

### `POST /api/knowledge-base`
Cria ou atualiza a base de conhecimento de um agente. Os campos variam por agente.

**Autenticação:** Bearer Token

**Lucy E-commerce:**
```json
{
  "agent": "Lucy E-commerce",
  "duvidas_frequentes": "...", "recomendacoes": "...",
  "combos_de_produtos": "...", "controle_de_estoque": "..."
}
```

**Clara Pós vendas:**
```json
{ "agent": "Clara Pós vendas", "orientacoes_pos_vendas": "..." }
```

**Max Suporte:**
```json
{ "agent": "Max Suporte", "base_conhecimento_suporte": "..." }
```

**Bruno SDR:**
```json
{
  "agent": "Bruno SDR",
  "orientacoes_prospeccao": "...",
  "informacoes_necessarias_prospeccao": "..."
}
```

---

### `GET /api/knowledge-base?agent={nome}`
Recupera a base de conhecimento de um agente para o usuário autenticado.

**Autenticação:** Bearer Token

**Query Params:** `agent` — Nome exato do agente (ex: `Lucy E-commerce`)

---

### `GET /api/knowledge-base/context`
Endpoint para n8n/webhooks consultarem a base de conhecimento de um usuário.

**Autenticação:** Token de API (`x-api-key`)

**Query Params:** `user_id`, `agent`, `field` (opcional)

**Resposta:**
```json
{
  "user_id": "uuid", "agent": "Lucy E-commerce",
  "duvidas_frequentes": "...", "recomendacoes": "..."
}
```

---

## 7. Links de Cliente (B2B2C)

### `POST /api/chat-links`
Gera um link único de atendimento para envio a um cliente final.

**Autenticação:** Bearer Token

**Body:**
```json
{ "subscription_id": "uuid" }
```

**Resposta:**
```json
{ "link_id": "uuid-do-link", "url": "http://seudominio.com/link/uuid-do-link" }
```

---

### `GET /api/chat-links/{link_id}`
Verifica se um link é válido e retorna informações do agente.

**Autenticação:** Pública

**Resposta (link novo):**
```json
{ "ok": true, "agent_name": "Lucy E-commerce", "agent_avatar": "http://...", "agent_segment": "ecommerce" }
```

**Resposta (link já utilizado — re-entrada automática):**
```json
{ "ok": true, "already_used": true, "session_id": "uuid-da-sessao-existente" }
```

---

## 8. Chat de Cliente Público

### `POST /api/client-chat/start`
Inicia sessão para cliente que clicou no link único.

**Autenticação:** Pública

**Body:**
```json
{ "link_id": "uuid", "client_name": "João Silva", "client_email": "joao@email.com" }
```

**Resposta:**
```json
{ "session_id": "uuid-da-sessao" }
```

---

### `POST /api/client-chat/message`
Envia mensagem no chat público do cliente. Roteia para o webhook n8n do agente.

**Autenticação:** Pública (identificação pelo `session_id`)

**Body:**
```json
{
  "session_id": "uuid-da-sessao",
  "input_text": "Quero saber sobre o produto X",
  "audio": false, "input_audio_base64": null
}
```

**Resposta:**
```json
{
  "response_text": "Claro! O produto X está disponível em...",
  "audio_base64": null, "metadata": {}, "session_id": "uuid"
}
```

---

### `GET /api/client-chat/{session_id}`
Recupera histórico e dados do agente de uma sessão pública.

**Autenticação:** Pública

**Resposta:**
```json
{
  "status": "active",
  "agent": { "name": "Lucy E-commerce", "mascot_image_url": "http://...", "segment": "ecommerce" },
  "messages": [...]
}
```

---

### `POST /api/client-chat/{session_id}/close`
Encerra sessão de cliente público. Histórico preservado, status muda para `closed`.

**Autenticação:** Pública

**Resposta:**
```json
{ "status": "success", "message": "Atendimento finalizado" }
```

---

## 9. Integrações

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| `POST` | `/api/integrations` | Cria nova integração | Bearer |
| `GET` | `/api/integrations` | Lista integrações | Bearer |
| `GET` | `/api/integrations/{id}` | Detalhes de uma integração | Bearer |
| `PUT` | `/api/integrations/{id}` | Atualiza integração | Bearer |
| `DELETE` | `/api/integrations/{id}` | Remove integração | Bearer |
| `POST` | `/api/integrations/email/send` | Envia e-mail | Bearer |
| `POST` | `/api/integrations/email/test` | Testa config SMTP | Bearer |
| `POST` | `/api/integrations/whatsapp/send` | Envia mensagem WhatsApp | Bearer |
| `POST` | `/api/integrations/whatsapp/webhook` | Recebe eventos WhatsApp | Pública |
| `GET` | `/api/integrations/whatsapp/webhook` | Handshake de webhook | Pública |
| `POST` | `/api/integrations/whatsapp/test` | Testa envio WhatsApp | Bearer |
| `POST` | `/api/integrations/widget/session` | Cria sessão do widget | API Key |
| `POST` | `/api/integrations/widget/message` | Mensagem via widget | API Key |
| `GET` | `/api/integrations/widget/snippet` | Snippet de embed | Bearer |
| `POST` | `/api/integrations/crm/sync` | Sincroniza CRM | Bearer |
| `POST` | `/api/integrations/crm/test` | Testa conexão CRM | Bearer |
| `POST` | `/api/integrations/webhook/trigger` | Dispara webhook | Bearer |
| `POST` | `/api/integrations/webhook/test` | Testa webhook | Bearer |

---

## 10. Analytics

### `GET /api/analytics/dashboard`
Métricas consolidadas: sessões, mensagens, taxa de resposta.

**Autenticação:** Bearer Token

**Resposta:**
```json
{ "total_sessions": 150, "total_messages": 1200, "active_sessions": 3, "avg_response_time": 1.4 }
```

---

### `GET /api/analytics/realtime`
Dados em tempo real de sessões ativas.

**Autenticação:** Bearer Token

---

## 11. Monitoramento

### `GET /api/monitoring/health`
Healthcheck do sistema.

**Autenticação:** Pública

**Resposta:**
```json
{ "status": "ok", "database": "connected", "timestamp": "2026-03-29T14:00:00Z" }
```

---

### `GET /api/monitoring/logs`
Lista logs de erros do sistema. *Somente admin.*

**Autenticação:** Bearer Token (admin)

### `POST /api/monitoring/logs/{log_id}/resolve`
Marca log como resolvido. *Somente admin.*

**Autenticação:** Bearer Token (admin)

### `GET /api/rate-limits/status`
Status dos rate limits do usuário atual.

**Autenticação:** Bearer Token

---

## 12. Admin

> Todos os endpoints `/admin` exigem `role: "admin"`.

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/admin/agents` | Cria novo agente |
| `PUT` | `/api/admin/agents/{id}` | Atualiza agente |
| `DELETE` | `/api/admin/agents/{id}` | Remove agente |
| `POST` | `/api/admin/duplicate-agent/{id}` | Duplica agente |
| `POST` | `/api/admin/upload-image` | Upload de avatar (multipart) |
| `POST` | `/api/admin/upload-audio` | Upload de áudio (multipart) |
| `GET` | `/api/admin/agent-requests` | Lista solicitações de agentes |
| `PUT` | `/api/admin/agent-requests/{id}` | Aprova/rejeita solicitação |

---

## 13. TTS / Voz

### `POST /api/tts/test`
Gera áudio de teste a partir de texto usando ElevenLabs.

**Autenticação:** Bearer Token

**Body:**
```json
{ "text": "Olá! Eu sou o agente virtual.", "voice_id": "id-da-voz-elevenlabs" }
```

**Resposta:**
```json
{ "audio_base64": "base64-do-mp3", "duration_seconds": 2.4 }
```

---

### `GET /api/tts/test/remaining/{voice_id}`
Consulta créditos restantes de TTS para uma voz.

**Autenticação:** Bearer Token

### `POST /api/tts/generate`
Gera áudio definitivo e persiste no sistema.

**Autenticação:** Bearer Token

### `POST /api/voice/call`
Inicia chamada de voz via agente.

**Autenticação:** Bearer Token

### `GET /api/voice/calls`
Lista chamadas de voz realizadas.

**Autenticação:** Bearer Token

---

## 14. Arquivos Estáticos

### `GET /api/uploads/agents/{filename}`
Serve imagens dos agentes com CORS headers adequados.

**Autenticação:** Pública

**Exemplo:** `GET /api/uploads/agents/lucy_avatar.png`

---

### `GET /api/uploads/audio/{filename}`
Serve arquivos de áudio dos agentes.

**Autenticação:** Pública

**Exemplo:** `GET /api/uploads/audio/lucy_sample.mp3`

---

## Fluxo Completo B2B2C (Link Único)

```
[Logista] POST /api/chat-links
    Recebe: { link_id, url }

[Cliente] GET /api/chat-links/{link_id}
    Se novo: mostra tela de boas-vindas
    Se já usado: redireciona para sessão existente

[Cliente] POST /api/client-chat/start
    Recebe: { session_id }

[Cliente] POST /api/client-chat/message  (repetido a cada mensagem)
    Roteia para n8n => Resposta do agente

[Cliente] POST /api/client-chat/{session_id}/close
    Status => "closed" | Histórico preservado

[Logista] GET /api/subscriptions/{id}/client-sessions
    Lista atendimentos com "Finalizado" ou "Em andamento"

[Logista] GET /api/client-chat/{session_id}
    Visualiza histórico completo (auditoria)
```

---

*Documento gerado em 29/03/2026 — Agent Hub Platform v1.0*
