"""
Script para atualizar agentes no MongoDB baseado no documento "Agentes & Prompts.docx"
- Preserva configurações existentes (preço, modelo LLM, imagens)
- Adiciona novos agentes com configurações padrão
- Deleta agentes que não estão no documento
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

# Load environment
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Definição dos agentes do documento com seus prompts
# Usando os nomes mais descritivos e prompts da seção principal
AGENTS_FROM_DOC = {
    "Agente Vendedor / Pré-venda (Inbound)": {
        "segment": "Vendas & Receita",
        "prompt": "Qualifica leads que chegam (site, WhatsApp, Insta). Quebra objeções básicas, agenda call ou manda link de pagamento.",
        "description": "Qualifica leads inbound, quebra objeções e agenda reuniões ou envia links de pagamento."
    },
    "Agente de Vendas Outbound / SDR de IA": {
        "segment": "Vendas & Receita",
        "prompt": "Monta listas (via LinkedIn, sites, bases). Cria cadências multi-canal (e-mail, LinkedIn, WhatsApp – com cuidado). Faz follow-up automático até agendar reunião.",
        "description": "Gera e qualifica leads automaticamente, cria cadências multi-canal e agenda reuniões sem precisar de time grande de pré-venda."
    },
    "Agente Qualificador de Leads B2B": {
        "segment": "Vendas & Receita",
        "prompt": "Enriquecimento de leads (cargo, empresa, segmento). Score e prioridade no CRM.",
        "description": "Enriquece dados de leads, faz score e priorização automática no CRM."
    },
    "Agente Pós-venda & Retenção": {
        "segment": "Vendas & Receita",
        "prompt": "Follow-up pós-compra/procedimento, reviews, upsell e renovação.",
        "description": "Faz follow-up, pede feedback, estimula renovação e upsell automaticamente com base no histórico do cliente."
    },
    "Agente E-commerce Manager": {
        "segment": "Vendas & Receita",
        "prompt": "Atendimento de dúvidas, recomendação de produtos, status de pedido, troca/devolução. Sugestão de combos, campanhas, e alertas de estoque / produtos encalhados.",
        "description": "Atende clientes, recomenda produtos, acompanha pedidos e ajuda a escoar estoque parado."
    },
    "Agente Secretária / Atendimento 24h": {
        "segment": "Atendimento, Agenda & Operações",
        "prompt": "WhatsApp/site/Insta, triagem, explica serviços, coleta dados.",
        "description": "Atende WhatsApp/site/Insta 24h, responde dúvidas e coleta informações dos clientes."
    },
    "Agente de Agendamento & Reagendamento": {
        "segment": "Atendimento, Agenda & Operações",
        "prompt": "Conecta com Google Agenda/PMS/crm. Lembra, reage agenda, reduz no-show.",
        "description": "Reduz furos de agenda com confirmações, lembretes e reagendamentos automáticos."
    },
    "Agente Suporte Técnico / Helpdesk": {
        "segment": "Atendimento, Agenda & Operações",
        "prompt": "Responde dúvidas de uso do sistema / plataforma. Abre e atualiza tickets, integra com ferramentas de suporte.",
        "description": "Resolve dúvidas de clientes puxando respostas da base de conhecimento e só envia o que é realmente complexo para humanos."
    },
    "Agente Concierge para Pousada / Hotel / Glamping": {
        "segment": "Atendimento, Agenda & Operações",
        "prompt": "Responde dúvidas de hóspedes, explica check-in/out, regras, passeios.",
        "description": "Atende hóspedes 24h com informações de check-in, regras, passeios e dúvidas, reduzindo carga do staff."
    },
    "Agente de Knowledge Base / Operações Internas": {
        "segment": "Atendimento, Agenda & Operações",
        "prompt": "Responde dúvidas do time sobre processos, políticas e playbooks. Integrado a Slack/Teams/Docs internos.",
        "description": "Responde dúvidas internas sobre processos, políticas, scripts e documentos, liberando os líderes de perguntas repetitivas."
    },
    "Agente Gerenciador de E-mail (Inbox Manager)": {
        "segment": "Produtividade Executiva & E-mail",
        "prompt": "Classifica, prioriza, resume, sugere respostas, cria follow-ups.",
        "description": "Limpa, organiza, prioriza e responde seus e-mails, com resumos diários e follow-ups automáticos."
    },
    "Agente Executive Assistant / Chief of Staff": {
        "segment": "Produtividade Executiva & E-mail",
        "prompt": "E-mail + Agenda + Tarefas + Docs + pós-reunião. Integra com Google Calendar, Gmail, Notion/Tasks, etc.",
        "description": "Organiza e-mail, agenda, tarefas e follow-ups como um braço direito digital para empreendedores e diretores."
    },
    "Agente Meeting Copilot": {
        "segment": "Produtividade Executiva & E-mail",
        "prompt": "Entra na call (ou recebe a gravação), faz resumo, decisões, próximos passos e já distribui tarefas.",
        "description": "Participa de reuniões, faz resumo, captura decisões e distribui tarefas automaticamente."
    },
    "Agente de Finanças Pessoais e Empresariais": {
        "segment": "Finanças",
        "prompt": "Organiza gastos/receitas, classifica por categoria, faz alertas de vencimentos, cria eventos no calendário. Faz projeções simples e simulações de cenário.",
        "description": "Organiza gastos e receitas, cria alertas de vencimento, faz projeções simples e sugere cortes e ajustes de hábitos financeiros."
    },
    "Agente de Cobrança / Financeiro Light": {
        "segment": "Finanças",
        "prompt": "Lembra boletos, parcelas, assinaturas. Envia links de pagamento, atualiza status no CRM.",
        "description": "Lembra vencimentos, envia links de pagamento, faz cobranças suaves e atualiza o status financeiro."
    },
    "Agente de Processamento de Faturas / AP": {
        "segment": "Finanças",
        "prompt": "Lê faturas, extrai dados, categoriza, manda pra aprovação, atualiza ERP/planilhas.",
        "description": "Processa faturas automaticamente, extrai dados, categoriza e envia para aprovação."
    },
    "Agente de Conteúdo & Marketing": {
        "segment": "Marketing & Inteligência",
        "prompt": "Gera posts, anúncios, e-mails, landing pages com base em diretrizes da marca.",
        "description": "Cria conteúdo para redes sociais, e-mails e anúncios seguindo as diretrizes da sua marca."
    },
    "Agente de Inteligência de Marca & Mercado": {
        "segment": "Marketing & Inteligência",
        "prompt": "Monitora redes, reviews, Reddit e concorrentes. Gera relatórios de sentimento, tópicos quentes e oportunidades.",
        "description": "Monitora redes, reviews e concorrentes e te entrega insights prontos para decisão e marketing."
    },
    "Agente de Pesquisa/SEO & Conteúdo Longo": {
        "segment": "Marketing & Inteligência",
        "prompt": "Consolida YouTube → blog, newsletter curator, pesquisa em fóruns (tipo Reddit).",
        "description": "Pesquisa e consolida conteúdo de múltiplas fontes para criar blogs, newsletters e materiais longos."
    },
    "Agente de RH / Recrutamento Inicial": {
        "segment": "Pessoas, RH & Jurídico",
        "prompt": "Recebe candidatos, faz triagem, agenda entrevistas.",
        "description": "Recebe candidatos, faz perguntas filtro, organiza CVs e agenda entrevistas com o RH."
    },
    "Agente Assistente de Advogado": {
        "segment": "Pessoas, RH & Jurídico",
        "prompt": "Triagem de casos, coleta dados, agenda, envia checklists de documentos (sempre com disclaimers).",
        "description": "Faz triagem de casos, explica o passo a passo inicial, orienta documentos e agenda com o advogado."
    },
    "Agente Terapeuta 24h / Bem-estar Emocional": {
        "segment": "Saúde, Bem-estar, Fitness & Lifestyle",
        "prompt": "Acolhimento, técnicas de respiração, organização de pensamentos, reflexão guiada. Posicionado como bem-estar/mental coach, não como substituto de terapia médica.",
        "description": "Oferece apoio emocional, exercícios de respiração, reflexão guiada e ferramentas para lidar com ansiedade e conflitos do dia a dia."
    },
    "Agente Nutrição/Treino (UpFit)": {
        "segment": "Saúde, Bem-estar, Fitness & Lifestyle",
        "prompt": "Explica plano, sugere ajustes simples, lembra treinos e refeições, conecta com resultados no app.",
        "description": "Explica o plano, tira dúvidas simples, ajusta trocas básicas e acompanha aderência ao treino e à dieta."
    }
}

async def update_agents():
    """Atualiza o banco de dados com os agentes do documento"""
    
    print("=" * 80)
    print("INICIANDO ATUALIZAÇÃO DE AGENTES")
    print("=" * 80)
    
    # 1. Buscar todos os agentes atuais
    current_agents = await db.agents.find({}).to_list(length=None)
    current_agents_by_name = {agent['name']: agent for agent in current_agents}
    
    print(f"\n📊 ESTADO ATUAL DO BANCO:")
    print(f"   Total de agentes no banco: {len(current_agents)}")
    for agent in current_agents:
        print(f"   - {agent['name']}")
    
    print(f"\n📄 AGENTES NO DOCUMENTO:")
    print(f"   Total de agentes no documento: {len(AGENTS_FROM_DOC)}")
    for name in AGENTS_FROM_DOC.keys():
        print(f"   - {name}")
    
    # 2. Atualizar ou criar agentes do documento
    updated_count = 0
    created_count = 0
    
    print(f"\n🔄 PROCESSANDO ATUALIZAÇÕES:")
    for agent_name, agent_data in AGENTS_FROM_DOC.items():
        if agent_name in current_agents_by_name:
            # Atualizar apenas o base_prompt
            result = await db.agents.update_one(
                {"name": agent_name},
                {"$set": {
                    "base_prompt": agent_data["prompt"],
                    "segment": agent_data["segment"]  # Também atualiza o segmento
                }}
            )
            if result.modified_count > 0:
                print(f"   ✅ Atualizado: {agent_name}")
                updated_count += 1
            else:
                print(f"   ⚪ Sem mudanças: {agent_name}")
        else:
            # Criar novo agente com configurações padrão
            new_agent = {
                "id": str(uuid.uuid4()),
                "name": agent_name,
                "description": agent_data["description"],
                "segment": agent_data["segment"],
                "price": 97.00,  # Preço padrão
                "features": [
                    "Atendimento 24/7",
                    "Integração via API",
                    "Respostas em tempo real"
                ],
                "mascot_image_url": "https://via.placeholder.com/150",
                "mascot_image_hero_url": "https://via.placeholder.com/800x400",
                "mascot_image_feature_url": "https://via.placeholder.com/600x400",
                "mascot_image_cta_url": "https://via.placeholder.com/600x400",
                "elevenlabs_voice_id": "21m00Tcm4TlvDq8ikWAM",  # Voice ID padrão
                "base_prompt": agent_data["prompt"],
                "voice_sample_url": None,
                "llm_provider": "openai",
                "llm_model": "gpt-5",
                "status": "active",
                "created_at": datetime.now(timezone.utc)
            }
            await db.agents.insert_one(new_agent)
            print(f"   ➕ Criado: {agent_name}")
            created_count += 1
    
    # 3. Deletar agentes que não estão no documento
    deleted_count = 0
    print(f"\n🗑️  PROCESSANDO DELEÇÕES:")
    for agent_name in current_agents_by_name.keys():
        if agent_name not in AGENTS_FROM_DOC:
            result = await db.agents.delete_one({"name": agent_name})
            if result.deleted_count > 0:
                print(f"   ❌ Deletado: {agent_name}")
                deleted_count += 1
    
    # 4. Resumo final
    print(f"\n" + "=" * 80)
    print("RESUMO DA ATUALIZAÇÃO")
    print("=" * 80)
    print(f"   ✅ Agentes atualizados: {updated_count}")
    print(f"   ➕ Agentes criados: {created_count}")
    print(f"   ❌ Agentes deletados: {deleted_count}")
    
    # Verificar estado final
    final_agents = await db.agents.find({}).to_list(length=None)
    print(f"\n📊 ESTADO FINAL DO BANCO:")
    print(f"   Total de agentes: {len(final_agents)}")
    
    print("\n✨ Atualização concluída com sucesso!")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(update_agents())
