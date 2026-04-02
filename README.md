# 🤖 Agent Hub Platform

Plataforma de SaaS focada em orquestração, contratação e faturamento de Agentes Multicanais de IA, atuando como o core de um ecossistema nativo de assinaturas B2B. Este projeto contém toda a interface do usuário, API central e gateways de conexão.

## 🚀 Arquitetura e Stack
Este projeto atua como interface cliente-assistente, delegando processamento para a automação local (n8n, webhook etc).
- **Frontend**: React.js, Tailwind CSS, Lucide Icons, SPA (Single Page Application)
- **Backend**: Python (FastAPI), Async, JWT Auth
- **Banco de Dados**: MongoDB (Document Store)
- **Contêineres**: Docker + Docker Compose, isolando serviços

---

## 💻 Instalação Rápida (Recomendada via Docker)

Se quiser subir todo o ecossistema Agent Hub sem se preocupar com versões de Python ou Node, basta usar Docker. O banco de dados, frontend e o backend subirão automaticamente no host.

### 1. Requisitos
- [Docker](https://www.docker.com/products/docker-desktop) instalado em seu ambiente.
- (Opcional) Git para clonar.

### 2. Configure os Ambient Variables (Opcional)
Na maioria dos testes locais nada disso é estrito usando Docker (pois ele assumirá fallbacks no compose), mas para Produção / Testes Reais:
- No diretório `backend/`, copie `.env.example` para `.env` e ajuste variáveis importantes de gateway (tokens do stripe, elevenlabs).
- No diretório `frontend/`, copie `.env.example` para `.env` (`REACT_APP_BACKEND_URL`).

### 3. Rodando o Ambiente
Na raiz (mesma de `docker-compose.yml`), rode o terminal:

```bash
docker-compose up --build -d
```

> **Acessando localmente**
> - 🟢 frontend: [http://localhost:3000](http://localhost:3000)
> - 🟢 REST Swagger Auto-Docs: [http://localhost:8001/docs](http://localhost:8001/docs)

---

## 🛠️ Instalação Manual (Modo Dev)

Este formato é voltado se você for modificar o código rodando servidores locais individualmente.
Você precisará ter instalado o NodeJS e o Python (>=3.10).

1. Suba seu MongoDB local (na porta padronizada `:27017`).
2. **Terminal 1 — API**:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn server:app --reload --port 8001
   ```
3. **Terminal 2 — Painel Web**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

---

## 🤝 Estrutura do Sistema de Agentes

O projeto base possui nativamente um "Marketplace" de "Licenças de Agentes", onde clientes acessam detalhes, checam preços e compram licenças. Você poderá alterar o fluxo de pagamento posteriormente na rota `/checkout/`, sendo hoje um mock visual elegante à espera das APIs do Stripe ou Pagar.me.

As integrações comunicam-se via `/api/chat` usando Webhooks e garantem o isolamento e sigilo entre sessões.

Licença privada. Não copie o código para reuso desautorizado.
