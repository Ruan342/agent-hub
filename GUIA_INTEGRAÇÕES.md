# 🔌 Guia de Configuração e Teste de Integrações
## VoiceAI Hub - Integrações Multi-Canal

Este guia fornece instruções completas para configurar e testar todas as integrações disponíveis na plataforma VoiceAI Hub.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Integração Email (SendGrid)](#1-integração-email-sendgrid)
3. [Integração WhatsApp Business](#2-integração-whatsapp-business)
4. [Integração Widget de Chat](#3-integração-widget-de-chat)
5. [Integração CRM Universal](#4-integração-crm-universal)
6. [Integração Webhooks](#5-integração-webhooks)
7. [Monitoramento e Analytics](#6-monitoramento-e-analytics)
8. [Solução de Problemas](#7-solução-de-problemas)

---

## Pré-requisitos

Antes de começar, certifique-se de ter:

- ✅ Conta ativa no VoiceAI Hub
- ✅ Pelo menos uma assinatura de agente ativa
- ✅ Acesso à página de Integrações (`/integrations`)
- ✅ API Key da sua assinatura (disponível no Dashboard)

---

## 1. Integração Email (SendGrid)

### 📧 O que é?
Permite que seu agente envie e-mails automatizados usando templates do SendGrid.

### 🔑 Credenciais Necessárias

1. **SendGrid API Key**
   - Acesse: https://app.sendgrid.com/settings/api_keys
   - Clique em "Create API Key"
   - Nome: `VoiceAI Hub Integration`
   - Permissões: **Full Access** (ou apenas "Mail Send")
   - Copie a chave gerada (ex: `SG.xxxxxxxxxxxxxxxx`)

2. **Endereço de E-mail Verificado**
   - Acesse: https://app.sendgrid.com/settings/sender_auth/senders
   - Adicione e verifique seu e-mail de envio
   - **Importante**: Deve ser um e-mail que você controla

### ⚙️ Configuração no VoiceAI Hub

1. Acesse `/integrations`
2. Clique em **"Email (SendGrid)"** → **"Adicionar"**
3. Preencha os campos:

```json
{
  "name": "Email Principal",
  "sendgrid_api_key": "SG.xxxxxxxxxxxxxxxxx",
  "from_email": "seu-email@seudominio.com",
  "from_name": "Nome da Sua Empresa",
  "reply_to": "contato@seudominio.com"
}
```

4. Clique em **"Salvar"**

### 🧪 Testando a Integração

#### Teste via API:

```bash
curl -X POST https://voiceai-hub-9.preview.emergentagent.com/api/integrations/email/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -d '{
    "integration_id": "ID_DA_SUA_INTEGRAÇÃO",
    "to_email": "destinatario@email.com",
    "subject": "Teste de Integração VoiceAI",
    "template": "default",
    "variables": {
      "message": "Esta é uma mensagem de teste do seu agente de IA!"
    }
  }'
```

#### Resultado Esperado:
- ✅ Status 200
- ✅ E-mail recebido em até 2 minutos
- ✅ Log de analytics registrado

### 📊 Monitoramento

Verifique em:
- **Analytics Dashboard**: Gráfico "Mensagens por Canal" (aparecerá "email")
- **Logs de Monitoramento**: Eventos de "email" com status "info" ou "error"

---

## 2. Integração WhatsApp Business

### 💬 O que é?
Conecta seu agente ao WhatsApp Business Cloud API para enviar/receber mensagens, processar áudio e imagens.

### 🔑 Credenciais Necessárias

1. **Meta Business Account**
   - Acesse: https://business.facebook.com/
   - Crie uma conta comercial (se ainda não tiver)

2. **WhatsApp Business App**
   - No painel Meta: https://developers.facebook.com/apps
   - Clique em "Create App" → Escolha "Business"
   - Adicione o produto **"WhatsApp"**

3. **Obter Credenciais**:

   a. **Phone Number ID**:
      - No app, vá em WhatsApp → API Setup
      - Copie o `Phone number ID` (ex: `123456789012345`)

   b. **Business Account ID**:
      - No mesmo painel, copie `WhatsApp Business Account ID`

   c. **Access Token**:
      - Clique em "Generate Token" (token temporário para testes)
      - Para produção, gere um token permanente em System Users

   d. **Webhook Verify Token**:
      - Escolha uma string secreta (ex: `meu_token_secreto_123`)
      - Você vai usar isso na configuração do webhook

### ⚙️ Configuração no VoiceAI Hub

1. Acesse `/integrations`
2. Clique em **"WhatsApp Business"** → **"Adicionar"**
3. Preencha os campos:

```json
{
  "name": "WhatsApp Oficial",
  "business_account_id": "123456789012345",
  "phone_number_id": "987654321098765",
  "access_token": "EAAxxxxxxxxxxxxxxxxxxxxx",
  "webhook_verify_token": "meu_token_secreto_123",
  "process_images": true,
  "process_audio": true
}
```

4. Clique em **"Salvar"**
5. **Copie a URL do Webhook** que aparecerá após salvar:
   ```
   https://voiceai-hub-9.preview.emergentagent.com/api/integrations/whatsapp/webhook
   ```

### 🔗 Configurar Webhook no Meta

1. No painel da Meta, vá em WhatsApp → Configuration
2. Clique em "Edit" em Webhook
3. Cole:
   - **Callback URL**: `https://voiceai-hub-9.preview.emergentagent.com/api/integrations/whatsapp/webhook`
   - **Verify Token**: `meu_token_secreto_123` (o mesmo que você configurou)
4. Clique em "Verify and Save"
5. **Subscribe** aos eventos:
   - ✅ `messages`
   - ✅ `message_status` (opcional)

### 🧪 Testando a Integração

#### Teste 1: Enviar Mensagem (API)

```bash
curl -X POST https://voiceai-hub-9.preview.emergentagent.com/api/integrations/whatsapp/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -d '{
    "integration_id": "ID_DA_SUA_INTEGRAÇÃO",
    "to_phone": "5511999999999",
    "message": "Olá! Esta é uma mensagem de teste do VoiceAI Hub.",
    "message_type": "text"
  }'
```

#### Teste 2: Receber Mensagem (Real)

1. Envie uma mensagem para o número WhatsApp configurado
2. Seu agente deve responder automaticamente
3. Verifique os logs em `/analytics`

#### Teste 3: Processar Áudio

1. Envie um **áudio de voz** para o WhatsApp
2. O sistema transcreve com Whisper
3. O agente processa e responde

#### Teste 4: Processar Imagem

1. Envie uma **imagem** para o WhatsApp
2. O sistema analisa com GPT-4 Vision
3. O agente descreve a imagem e responde

### ⚠️ Observações Importantes

- **Números de Teste**: A Meta fornece 5 números de teste gratuitos
- **Aprovação**: Para produção, você precisa passar pela Business Verification
- **Rate Limits**: 
  - Teste: 250 conversas/dia
  - Produção: Até 100k+ conversas/dia (após aprovação)

---

## 3. Integração Widget de Chat

### 🌐 O que é?
Um widget JavaScript incorporável para adicionar chat com IA em qualquer site.

### ⚙️ Configuração no VoiceAI Hub

1. Acesse `/integrations`
2. Clique em **"Widget de Chat"** → **"Adicionar"**
3. Preencha os campos:

```json
{
  "name": "Widget Site Principal",
  "domain_whitelist": ["seusite.com", "www.seusite.com"],
  "theme_color": "#7C3AED",
  "position": "bottom-right",
  "greeting_message": "Olá! Como posso ajudar você hoje?",
  "voice_enabled": true,
  "text_enabled": true
}
```

4. Clique em **"Salvar"**
5. **Copie o código de instalação** gerado

### 🔧 Instalação no Seu Site

Adicione este código antes do `</body>` do seu HTML:

```html
<!-- VoiceAI Widget -->
<script src="https://voiceai-hub-9.preview.emergentagent.com/voiceai-widget.js"></script>
<script>
  VoiceAIWidget.init({
    apiKey: 'SUA_API_KEY_AQUI',
    apiUrl: 'https://voiceai-hub-9.preview.emergentagent.com/api',
    themeColor: '#7C3AED',
    position: 'bottom-right',
    greetingMessage: 'Olá! Como posso ajudar?',
    voiceEnabled: true,
    textEnabled: true,
    agentName: 'Assistente Virtual'
  });
</script>
<!-- End VoiceAI Widget -->
```

### 🧪 Testando o Widget

1. **Página de Demo**: Acesse `/widget-demo.html`
2. Clique no botão flutuante roxo no canto inferior direito
3. Teste conversação por texto
4. Teste conversação por voz (clique no ícone de microfone)

#### Funcionalidades:
- ✅ Chat de texto em tempo real
- ✅ Chat de voz (Speech-to-Text + Text-to-Speech)
- ✅ Histórico de conversação
- ✅ Totalmente responsivo (mobile/desktop)
- ✅ Customizável (cores, posição, mensagens)

---

## 4. Integração CRM Universal

### 🗂️ O que é?
Sincroniza automaticamente contatos e conversas com seu CRM (Salesforce, HubSpot, Pipedrive, etc).

### ⚙️ Configuração no VoiceAI Hub

1. Acesse `/integrations`
2. Clique em **"CRM Universal"** → **"Adicionar"**
3. Preencha os campos:

#### Exemplo: HubSpot

```json
{
  "name": "HubSpot CRM",
  "crm_type": "hubspot",
  "api_key": "SEU_HUBSPOT_API_KEY",
  "api_url": "https://api.hubapi.com",
  "auto_sync": true,
  "custom_fields_mapping": {
    "name": "firstname",
    "email": "email",
    "phone": "phone",
    "company": "company"
  }
}
```

#### Exemplo: Salesforce

```json
{
  "name": "Salesforce CRM",
  "crm_type": "salesforce",
  "api_key": "SEU_SALESFORCE_TOKEN",
  "api_url": "https://yourinstance.salesforce.com",
  "custom_headers": {
    "Authorization": "Bearer SEU_ACCESS_TOKEN"
  },
  "auto_sync": true
}
```

### 🧪 Testando a Integração

```bash
curl -X POST https://voiceai-hub-9.preview.emergentagent.com/api/integrations/crm/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -d '{
    "integration_id": "ID_DA_SUA_INTEGRAÇÃO",
    "action": "create",
    "contact_data": {
      "name": "João Silva",
      "email": "joao@exemplo.com",
      "phone": "+5511999999999",
      "company": "Empresa XYZ"
    }
  }'
```

---

## 5. Integração Webhooks

### 🔔 O que é?
Envia notificações HTTP para URLs externas quando eventos acontecem (mensagem recebida, enviada, etc).

### ⚙️ Configuração no VoiceAI Hub

1. Acesse `/integrations`
2. Clique em **"Webhooks"** → **"Adicionar"**
3. Preencha os campos:

```json
{
  "name": "Webhook Principal",
  "webhook_url": "https://seuservidor.com/webhook/voiceai",
  "secret": "chave_secreta_para_verificacao",
  "events": ["message_received", "message_sent"],
  "headers": {
    "X-Custom-Header": "valor"
  }
}
```

### 📦 Payload Recebido

Quando um evento ocorre, você receberá um POST com:

```json
{
  "event_type": "message_received",
  "timestamp": "2025-01-26T13:45:00Z",
  "integration_type": "whatsapp",
  "data": {
    "from": "+5511999999999",
    "message": "Olá, preciso de ajuda",
    "session_id": "abc123",
    "agent_id": "agent-123"
  }
}
```

### 🔐 Verificação de Segurança

Verifique o header `X-Webhook-Signature`:

```python
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

---

## 6. Monitoramento e Analytics

### 📊 Dashboard de Analytics

Acesse `/analytics` para visualizar:

1. **Métricas em Tempo Real**:
   - Mensagens na última hora
   - Total de mensagens (período selecionado)
   - Tempo médio de resposta

2. **Status do Sistema**:
   - Health check (Database, API)
   - Erros na última hora
   - Integrações ativas

3. **Mensagens por Canal**:
   - Gráfico de barras com distribuição
   - Widget, Email, WhatsApp, CRM, Webhook

4. **Top Agentes**:
   - Ranking dos agentes mais utilizados
   - Total de mensagens por agente

5. **Logs de Monitoramento**:
   - Eventos INFO, WARNING, ERROR, CRITICAL
   - Filtro por fonte e nível
   - Opção de "Resolver" logs

### 🔄 Rate Limiting

Cada assinatura tem limites:
- **Por Minuto**: 60 requisições
- **Por Hora**: 1.000 requisições
- **Por Dia**: 10.000 requisições

Verifique seu uso em `/analytics` ou via API:

```bash
curl -X GET "https://voiceai-hub-9.preview.emergentagent.com/api/rate-limits/status?subscription_id=SEU_SUB_ID" \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

---

## 7. Solução de Problemas

### ❌ Erro: "401 Unauthorized"

**Causa**: Token JWT inválido ou expirado

**Solução**:
1. Faça login novamente em `/login`
2. Verifique se o token está sendo enviado no header: `Authorization: Bearer TOKEN`

---

### ❌ Erro: "Integration not found"

**Causa**: ID da integração incorreto

**Solução**:
1. Acesse `/integrations` e copie o ID correto
2. Verifique se a integração está com status "active"

---

### ❌ SendGrid: "Sender email not verified"

**Causa**: E-mail de envio não foi verificado no SendGrid

**Solução**:
1. Acesse SendGrid → Settings → Sender Authentication
2. Adicione e verifique seu e-mail
3. Aguarde a verificação (pode levar até 24h)

---

### ❌ WhatsApp: "Webhook verification failed"

**Causa**: Verify Token incorreto

**Solução**:
1. Certifique-se de usar o MESMO token no VoiceAI Hub e no Meta
2. Verifique se não há espaços extras
3. Teste novamente o webhook na Meta

---

### ❌ Widget: "CORS Error"

**Causa**: Domínio não está na whitelist

**Solução**:
1. Edite a integração do widget
2. Adicione seu domínio em `domain_whitelist`
3. Inclua todas as variações (com/sem www)

---

### ❌ Rate Limit Exceeded

**Causa**: Excedeu os limites de requisições

**Solução**:
1. Aguarde o reset do período (minuto/hora/dia)
2. Verifique seu uso em `/analytics`
3. Otimize suas chamadas ou faça upgrade do plano

---

## 📞 Suporte

Se você encontrar problemas não listados aqui:

1. ✅ Verifique os **Logs de Monitoramento** em `/analytics`
2. ✅ Teste os endpoints via `curl` para isolar o problema
3. ✅ Entre em contato com o suporte técnico com:
   - ID da sua integração
   - Mensagem de erro completa
   - Logs relevantes

---

## 🎉 Conclusão

Você agora tem todas as ferramentas necessárias para configurar e testar as integrações multi-canal do VoiceAI Hub. 

**Checklist Final**:
- [ ] Email (SendGrid) configurado e testado
- [ ] WhatsApp Business configurado e testado
- [ ] Widget instalado em seu site
- [ ] CRM sincronizando corretamente
- [ ] Webhooks recebendo eventos
- [ ] Analytics mostrando métricas

**Próximos Passos**:
1. Configure seu prompt personalizado em cada assinatura
2. Ajuste o tom e comportamento do agente
3. Monitore as métricas regularmente
4. Otimize baseado nos dados de analytics

Boa sorte! 🚀
