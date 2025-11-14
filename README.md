# VoiceAI Hub - Plataforma de Agentes de IA por Voz

Uma plataforma completa para disponibilizar agentes de IA por voz para empresas, com integração Stripe para pagamentos e suporte a diferentes segmentos de negócio.

## 🎯 Características Principais

### Para Clientes
- **Marketplace de Agentes**: Browse e compre agentes de IA especializados em diferentes segmentos
- **Planos Mensais**: Assinaturas flexíveis com pagamento via Stripe
- **API Keys**: Receba keys únicas para integrar os agentes
- **Webhooks**: Configure webhooks para conectar com CRM, WhatsApp, Email
- **Dashboard**: Monitore suas assinaturas e configurações
- **Solicitação Personalizada**: Peça agentes customizados se não encontrar o ideal

### Para Administradores
- **Gestão de Agentes**: Crie, edite e delete agentes na plataforma
- **Gerenciamento de Solicitações**: Acompanhe e processe pedidos de agentes personalizados
- **Configuração ElevenLabs**: Associe voice IDs do ElevenLabs a cada agente
- **Painel Administrativo**: Interface completa para gerenciar a plataforma

## 🚀 Tecnologias

**Backend**: FastAPI, MongoDB, Motor, JWT, Bcrypt, Stripe
**Frontend**: React 19, React Router, Axios, Shadcn/UI, Tailwind CSS

## 🔐 Credenciais Padrão

**Admin**: admin@voiceai.com / admin123

## 💳 Fluxo de Pagamento

1. Cliente seleciona agente → Sistema cria checkout Stripe
2. Cliente completa pagamento → Retorna para página de sucesso
3. Sistema faz polling do status → Confirma e cria assinatura com API key

## 📊 Agentes Pré-configurados

- Assistente de Vendas Pro ($49.99/mês)
- Suporte Cliente 24/7 ($39.99/mês)
- Marketing Outbound ($59.99/mês)
- Assistente Financeiro ($44.99/mês)
- RH Recruiter Pro ($54.99/mês)

## ✅ Status dos Testes

- Backend: 14/14 testes passando (100%)
- Frontend: Todos os fluxos funcionais
- Integração Stripe: Operacional
