# Documentação Executiva: Plataforma SaaS de Agentes de IA

## 1. Visão Geral do Produto (Agent Hub)
A plataforma é um **SaaS (Software as a Service) de Agentes de Inteligência Artificial**, desenvolvido para operar como um Marketplace B2B. O sistema permite que diferentes empresas (lojistas, agências, clínicas) acessem um catálogo de agentes especializados (E-commerce, Vendas/SDR, Suporte, Pós-Vendas) e os "contratem" por assinatura.

Cada cliente (empresa) pode assinar múltiplos agentes, configurar o conhecimento específico da sua própria empresa para cada agente (produtos, regras, fretes) e interagir com eles por texto ou voz em tempo real.

O diferencial arquitetural do projeto é que a "inteligência pesada" (LLMs) não está acoplada no código principal. O sistema atua como um maestro, delegando o cérebro das conversas para fluxos visuais no **n8n**, garantindo facilidade extrema para atualizar os robôs sem precisar fazer deploy de código.

---

## 2. Arquitetura do Sistema e Stack Tecnológico

O projeto adota uma arquitetura Serverless/Microsserviços orientada a eventos, dividida em três pilares principais:

### 2.1. Frontend (Interface do Usuário)
- **Tecnologias:** React.js, TailwindCSS, Vite.
- **Responsabilidade:** Entregar uma interface rápida, moderna e responsiva. Gerencia o fluxo de cadastro, vitrine de agentes, painel de configurações (Dashboard) e a sala de chat com suporte nativo a gravação manual de áudio e reprodução de respostas em voz.

### 2.2. Backend (Motor da Plataforma)
- **Tecnologias:** Python com FastAPI, Banco de Dados NoSQL MongoDB.
- **Responsabilidade:** Gerenciar autenticação (JWT), controle de sessões, persistência de histórico de chat, rate-limits, e expor a "Base de Conhecimento" isolada de cada usuário/empresa. Atua também como proxy de segurança entre o Frontend e o orquestrador n8n.

### 2.3. Orquestrador de IA (N8N Automation)
- **Tecnologias:** n8n, OpenAI (LLMs), ElevenLabs (Voz).
- **Responsabilidade:** Receber o texto ou áudio processado da plataforma, buscar o contexto exclusivo do usuário, gerar respostas cognitivas usando GPTs/Claude, sintetizar vozes ultrarrealistas e devolver o resultado (Texto e Base64 de Áudio) instantaneamente para o Backend.

---

## 3. Mapeamento e Funcionamento dos Arquivos (Frontend)

Os arquivos vitais da interface de usuário operam na pasta `/frontend/src/pages`:

* **`Marketplace.jsx`**
  É a "Vitrine" da plataforma. Lista todos os agentes disponíveis no catálogo puxando os metadados do banco. O usuário pode filtrar e buscar agentes por categoria.

* **`AgentDetails.jsx`**
  Página de conversão. Quando o usuário clica em um agente, este arquivo renderiza a Landing Page específica dele, mostrando recursos detalhados, preços e o botão oficial de "Assinar".

* **`MinhasAssinaturas.jsx (Dashboard)`**
  O painel de controle do cliente logado.
  * O que faz: Lista todos os agentes que a empresa assinou.
  * Funcionalidade Crítica: Abriga o novo modal de **Configuração de Base de Conhecimento**. Permite que o cliente preencha 4 campos cruciais (*Dúvidas Frequentes, Recomendações, Combos, Controle de Estoque*), injetando o DNA da empresa dele dentro do agente contratado.

* **`AgentChat.jsx`**
  A joia da coroa. É a interface unificada de mensagens onde ocorre a simulação humana.
  * O que faz: Carrega e mantêm o contexto histórico da conversa (Session).
  * Experiência de Áudio (UX): Implementa gravação de voz onde o usuário dita, escuta a própria prévia (HTML5), e confirma o envio. Renderiza respostas transcritas ou reproduz nativamente respostas em voz (Base64) injetadas pelo Agente.

* **`Login.jsx` & `Register.jsx`**
  Fluxos de Autenticação Segura JWT para criar instâncias "Multi-tenant", isolando os dados de um cliente de outro.

---

## 4. Mapeamento e Funcionamento dos Arquivos (Backend)

Todo o ecossistema backend está condensado de forma otimizada na pasta `/backend`:

* **`server.py`**
  O coração da plataforma FastAPI, que roda o servidor ASGI (Uvicorn). Responsável por:
  * **Auth & Tokens:** Geração e validação de Web Tokens.
  * **Subscrições & Pagamentos (Stubs):** Rotas HTTP para comprar e recuperar agentes de um usuário.
  * **Knowledge Base API:** Contém as rotas exclusivas que salvam a configuração da empresa no MongoDB e expõe o endpoint `GET /api/knowledge-base/context` (protegido por token secreto `API_HISTORY_TOKEN`) para o **n8n** buscar dinamicamente durante um fluxo.
  * **Chat Proxy:** Recebe as mensagens da tela Web, despacha um *Request* assíncrono para os servidores do Webhook do n8n, injeta no banco o Histórico (apagado e expirado sob regras de 30 dias), e cospe a resposta visual de volta para o React.
  * **Servidor de Arquivos Estáticos (`app.mount("/api/uploads")`):** Resolve imagens absolutas fisicamente armazenadas no HD (`/uploads/agents`) enviando arquivos como avatares originais ("lucy.png", "bruno.png") via HTTP sem proxy do React.

* **`/uploads/agents` e `/uploads/audio`**
  Sistema de Arquivos estáticos. Contém toda a mídia vetorial que compõe a estética dos personagens e os áudios gravados/recebidos durante debug.

---

## 5. Fluxo da Operação Perfeita (Workflow)

Uma jornada típica de valor para apresentar aos investidores ou diretoria:
1. O lojista (Empresa X) entra na plataforma, paga e assina o agente "Clara (E-commerce)".
2. No painel, ele preenche a *Base de Conhecimento* avisando: "Nos finais de semana o frete para a empresa X é grátis". O backend salva isso no MongoDB atrelado a ele.
3. No chat do agente, o lojista grava um áudio e clica em enviar.
4. O backend envia o texto transcrito/áudio para o n8n.
5. O fluxo no n8n recebe a chamada, faz uma requisição HTTP secreta de volta para a nossa plataforma solicitando: *"Me dê a base de conhecimento deste cliente específico"*.
6. O LLM formula uma resposta pautada na regra de frete, o ElevenLabs gera a voz customizada, e o chat exibe a resposta impecável falada na hora. 

---

## 6. Diferenciais Estratégicos Atuais
- **Isolamento Total (Multi-Tenant)**: A configuração da Empresa A não contamina a Empresa B. Agentes são os mesmos por modelo, mas a mente deles muda conforme a sessão ativada.
- **Preparação de Escala**: O front não precisa esperar o LLM gerar a voz internamente travando a UI, porque o proxy aguarda via n8n e garante alta concorrência por thread (Async).
- **Sem Lock-in Técnico Pesado**: Prompts e jornadas do agente não precisam de commits no Github, basta arrastar bloquinhos no sistema n8n e a plataforma obedece instantaneamente.
