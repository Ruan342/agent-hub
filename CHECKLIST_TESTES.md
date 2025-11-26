# ✅ Checklist de Testes End-to-End
## VoiceAI Hub - Integrações

Use este checklist para garantir que todas as integrações estão funcionando corretamente.

---

## 📧 1. Email (SendGrid)

### Pré-requisitos
- [ ] Conta SendGrid criada
- [ ] API Key gerada com permissões "Mail Send"
- [ ] E-mail de envio verificado no SendGrid

### Configuração
- [ ] Integração criada em `/integrations`
- [ ] Campos preenchidos:
  - [ ] `sendgrid_api_key`
  - [ ] `from_email`
  - [ ] `from_name`
  - [ ] `reply_to`

### Testes
- [ ] **Teste 1**: Enviar e-mail via API
  ```bash
  curl -X POST {API_URL}/integrations/email/send \
    -H "Authorization: Bearer {TOKEN}" \
    -d '{"integration_id":"xxx","to_email":"test@test.com","subject":"Test","template":"default"}'
  ```
- [ ] **Teste 2**: Verificar recebimento do e-mail (inbox)
- [ ] **Teste 3**: Verificar analytics (gráfico "email" aparece)
- [ ] **Teste 4**: Verificar logs de monitoramento

### Resultados Esperados
- ✅ Status HTTP 200
- ✅ E-mail recebido em até 2 minutos
- ✅ Analytics registrado
- ✅ Log "info" em monitoramento

---

## 💬 2. WhatsApp Business

### Pré-requisitos
- [ ] Meta Business Account criada
- [ ] WhatsApp Business App configurado
- [ ] Número de telefone adicionado

### Obter Credenciais
- [ ] `phone_number_id` copiado
- [ ] `business_account_id` copiado
- [ ] `access_token` gerado
- [ ] `webhook_verify_token` criado (string secreta)

### Configuração VoiceAI Hub
- [ ] Integração criada em `/integrations`
- [ ] Webhook URL copiado
- [ ] Campos preenchidos:
  - [ ] `business_account_id`
  - [ ] `phone_number_id`
  - [ ] `access_token`
  - [ ] `webhook_verify_token`
  - [ ] `process_images: true`
  - [ ] `process_audio: true`

### Configuração Meta
- [ ] Webhook URL configurado no painel Meta
- [ ] Verify Token inserido
- [ ] Webhook verificado com sucesso ✅
- [ ] Eventos subscribed: `messages`

### Testes
- [ ] **Teste 1**: Enviar mensagem via API
  ```bash
  curl -X POST {API_URL}/integrations/whatsapp/send \
    -H "Authorization: Bearer {TOKEN}" \
    -d '{"integration_id":"xxx","to_phone":"5511999999999","message":"Olá!"}'
  ```
- [ ] **Teste 2**: Receber mensagem no WhatsApp
- [ ] **Teste 3**: Enviar mensagem PARA o número (webhook deve processar)
- [ ] **Teste 4**: Enviar áudio de voz (transcrição Whisper)
- [ ] **Teste 5**: Enviar imagem (análise GPT-4 Vision)
- [ ] **Teste 6**: Verificar resposta automática do agente
- [ ] **Teste 7**: Verificar analytics
- [ ] **Teste 8**: Verificar logs

### Resultados Esperados
- ✅ Mensagem enviada aparece no WhatsApp
- ✅ Mensagem recebida aciona o webhook
- ✅ Agente responde automaticamente
- ✅ Áudio é transcrito corretamente
- ✅ Imagem é analisada
- ✅ Analytics registrado em "whatsapp"

---

## 🌐 3. Widget de Chat

### Configuração
- [ ] Integração criada em `/integrations`
- [ ] Campos preenchidos:
  - [ ] `domain_whitelist` (array com domínios)
  - [ ] `theme_color`
  - [ ] `position`
  - [ ] `greeting_message`
  - [ ] `voice_enabled: true`
  - [ ] `text_enabled: true`

### Instalação
- [ ] Código de instalação copiado
- [ ] Código adicionado antes do `</body>` do site
- [ ] `apiKey` configurado corretamente

### Testes
- [ ] **Teste 1**: Acessar página demo `/widget-demo.html`
- [ ] **Teste 2**: Botão flutuante aparece no canto inferior direito
- [ ] **Teste 3**: Clicar no botão abre a janela de chat
- [ ] **Teste 4**: Enviar mensagem de texto
- [ ] **Teste 5**: Receber resposta do agente
- [ ] **Teste 6**: Clicar no ícone de microfone
- [ ] **Teste 7**: Falar e ver transcrição aparecer
- [ ] **Teste 8**: Ouvir resposta em áudio do agente
- [ ] **Teste 9**: Verificar histórico de mensagens
- [ ] **Teste 10**: Testar em mobile (responsivo)
- [ ] **Teste 11**: Verificar analytics
- [ ] **Teste 12**: Instalar em site real e testar

### Resultados Esperados
- ✅ Widget carrega sem erros de console
- ✅ Chat de texto funciona
- ✅ Chat de voz funciona
- ✅ Design customizado aparece (cor, posição)
- ✅ Mensagem de saudação aparece
- ✅ Histórico persiste durante a sessão
- ✅ Analytics registrado em "widget"

---

## 🗂️ 4. CRM Universal

### Pré-requisitos
- [ ] Conta no CRM escolhido (HubSpot, Salesforce, etc)
- [ ] API Key ou Access Token obtido
- [ ] Mapeamento de campos planejado

### Configuração
- [ ] Integração criada em `/integrations`
- [ ] Campos preenchidos:
  - [ ] `crm_type`
  - [ ] `api_key`
  - [ ] `api_url`
  - [ ] `auto_sync: true`
  - [ ] `custom_fields_mapping`

### Testes
- [ ] **Teste 1**: Sincronizar contato via API
  ```bash
  curl -X POST {API_URL}/integrations/crm/sync \
    -H "Authorization: Bearer {TOKEN}" \
    -d '{"integration_id":"xxx","action":"create","contact_data":{...}}'
  ```
- [ ] **Teste 2**: Verificar contato criado no CRM
- [ ] **Teste 3**: Atualizar contato (action: "update")
- [ ] **Teste 4**: Verificar auto_sync durante conversa
- [ ] **Teste 5**: Verificar analytics
- [ ] **Teste 6**: Verificar logs

### Resultados Esperados
- ✅ Contato criado no CRM
- ✅ Campos mapeados corretamente
- ✅ Auto-sync funciona durante conversas
- ✅ Analytics registrado em "crm"

---

## 🔔 5. Webhooks

### Configuração
- [ ] Servidor/endpoint para receber webhooks preparado
- [ ] Integração criada em `/integrations`
- [ ] Campos preenchidos:
  - [ ] `webhook_url`
  - [ ] `secret` (para verificação)
  - [ ] `events` (array de eventos)
  - [ ] `headers` (opcional)

### Testes
- [ ] **Teste 1**: Acionar evento (enviar mensagem)
- [ ] **Teste 2**: Verificar recebimento do webhook
- [ ] **Teste 3**: Validar signature do webhook
- [ ] **Teste 4**: Processar payload corretamente
- [ ] **Teste 5**: Verificar diferentes tipos de eventos
- [ ] **Teste 6**: Verificar logs de webhook em `/webhooks/logs/{subscription_id}`

### Código de Verificação (Python)
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

### Resultados Esperados
- ✅ Webhook recebido em tempo real (< 1 segundo)
- ✅ Payload contém todos os dados esperados
- ✅ Signature válida
- ✅ Eventos corretos são enviados

---

## 📊 6. Analytics & Monitoramento

### Dashboard Analytics (`/analytics`)
- [ ] **Teste 1**: Acessar dashboard
- [ ] **Teste 2**: Verificar "Status do Sistema" (deve estar "Saudável")
- [ ] **Teste 3**: Verificar "Mensagens (última hora)"
- [ ] **Teste 4**: Verificar "Total de Mensagens"
- [ ] **Teste 5**: Verificar "Tempo Médio de Resposta"
- [ ] **Teste 6**: Verificar gráfico "Mensagens por Canal"
- [ ] **Teste 7**: Verificar "Top Agentes"
- [ ] **Teste 8**: Verificar "Logs de Monitoramento"
- [ ] **Teste 9**: Testar seletor de período (7, 30, 90 dias)
- [ ] **Teste 10**: Aguardar 30 segundos e verificar auto-refresh

### Rate Limiting
- [ ] **Teste 1**: Verificar limites via API
  ```bash
  curl -X GET "{API_URL}/rate-limits/status?subscription_id=xxx" \
    -H "Authorization: Bearer {TOKEN}"
  ```
- [ ] **Teste 2**: Testar limite por minuto (enviar 60+ requisições)
- [ ] **Teste 3**: Verificar resposta "429 Too Many Requests"
- [ ] **Teste 4**: Aguardar reset e testar novamente

### Monitoramento
- [ ] **Teste 1**: Acionar erro intencional
- [ ] **Teste 2**: Verificar log de erro aparece
- [ ] **Teste 3**: Clicar em "Resolver" no log
- [ ] **Teste 4**: Verificar log marcado como resolvido
- [ ] **Teste 5**: Filtrar logs por nível (INFO, WARNING, ERROR)
- [ ] **Teste 6**: Filtrar logs por fonte (email, whatsapp, etc)

### Resultados Esperados
- ✅ Todas as métricas aparecem corretamente
- ✅ Gráficos atualizam com dados reais
- ✅ Auto-refresh funciona
- ✅ Logs são registrados em tempo real
- ✅ Rate limiting bloqueia requisições excessivas

---

## 🎯 Teste End-to-End Completo

### Cenário: Jornada Completa do Cliente

1. **Cliente envia mensagem via Widget**
   - [ ] Widget carrega no site
   - [ ] Cliente digita "Olá, preciso de ajuda"
   - [ ] Agente responde automaticamente

2. **Sistema sincroniza com CRM**
   - [ ] Auto-sync cria/atualiza contato no CRM
   - [ ] Campos mapeados corretamente

3. **Webhook notifica sistema externo**
   - [ ] Evento "message_received" enviado
   - [ ] Sistema externo processa notificação

4. **E-mail de follow-up é enviado**
   - [ ] E-mail enviado via SendGrid
   - [ ] Cliente recebe e-mail

5. **WhatsApp de confirmação**
   - [ ] Mensagem WhatsApp enviada
   - [ ] Cliente recebe no WhatsApp

6. **Analytics registra tudo**
   - [ ] Dashboard mostra 1 mensagem em "widget"
   - [ ] Dashboard mostra 1 mensagem em "email"
   - [ ] Dashboard mostra 1 mensagem em "whatsapp"
   - [ ] Top Agentes atualizado
   - [ ] Logs de todas as ações

### Tempo Total Esperado: < 30 segundos

---

## 🐛 Troubleshooting

### Problema: "401 Unauthorized"
- [ ] Token JWT válido?
- [ ] Token no formato: `Authorization: Bearer {TOKEN}`
- [ ] Fazer novo login se necessário

### Problema: Webhook WhatsApp não funciona
- [ ] Verify Token idêntico em ambos os lados?
- [ ] URL HTTPS (não HTTP)?
- [ ] Webhook verificado no painel Meta?

### Problema: Widget não carrega
- [ ] Domínio na whitelist?
- [ ] API Key correta?
- [ ] Console do navegador sem erros?

### Problema: Rate Limit atingido
- [ ] Aguardar reset (1 minuto/1 hora/1 dia)
- [ ] Otimizar número de requisições
- [ ] Considerar upgrade do plano

---

## ✨ Checklist Final

Antes de ir para produção:

- [ ] Todas as integrações testadas e funcionando
- [ ] Credenciais de produção configuradas (não teste)
- [ ] Analytics mostrando dados corretos
- [ ] Monitoramento sem erros críticos
- [ ] Rate limits adequados para seu volume
- [ ] Webhooks assinados (secure)
- [ ] Domínios de produção na whitelist
- [ ] Backup das configurações feito
- [ ] Equipe treinada sobre o sistema
- [ ] Plano de contingência para downtime

---

## 📞 Suporte

Problemas não resolvidos?

1. Verifique `/analytics` → Logs de Monitoramento
2. Teste endpoints via `curl` isoladamente
3. Entre em contato com suporte técnico com:
   - ID da integração
   - Logs completos
   - Passos para reproduzir

---

**Status Geral**: ⬜ Não Iniciado | 🟡 Em Progresso | ✅ Completo

**Última atualização**: 26/11/2025

Boa sorte! 🚀
