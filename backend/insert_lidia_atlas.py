"""
Script para inserir o agente Lidia Prospecção no MongoDB Atlas (produção).
Execute com: python insert_lidia_atlas.py <MONGO_ATLAS_URL>
Ou defina MONGO_URL no ambiente.

A URL da imagem usa o domínio do Vercel: https://<seu-dominio>.vercel.app/api/uploads/agents/Lidia.png
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

# URL base do Vercel — ajuste se necessário
VERCEL_BASE_URL = os.getenv("BACKEND_URL", "https://agent-hub-p46s.vercel.app")

lidia_agent = {
    "id": str(uuid.uuid4()),
    "name": "Lidia Prospecção",
    "segment": "lidia_prospec",
    "description": "Agente de vendas especializada em prospecção ativa. A Lidia aborda leads, apresenta produtos, envia links de agendamento e fecha negócios enviando links de pagamento.",
    "elevenlabs_voice_id": "pNInz6obbfIdG2p2pPxb",
    "base_prompt": "Você é a Lidia, uma agente de vendas especializada em prospecção. Seu objetivo é abordar potenciais clientes de forma consultiva, apresentar os produtos/serviços, qualificar o interesse e conduzir ao fechamento enviando links de agendamento ou pagamento conforme o momento da conversa.",
    "features": [
        "Abordagem consultiva e personalizada",
        "Apresentação de produtos e serviços",
        "Envio de link de agendamento de reunião",
        "Fechamento com link de pagamento direto",
        "Gestão de objeções automática"
    ],
    "mascot_image_url": f"{VERCEL_BASE_URL}/api/uploads/agents/Lidia.png",
    "mascot_image_hero_url": f"{VERCEL_BASE_URL}/api/uploads/agents/Lidia.png",
    "mascot_image_feature_url": f"{VERCEL_BASE_URL}/api/uploads/agents/Lidia.png",
    "mascot_image_cta_url": f"{VERCEL_BASE_URL}/api/uploads/agents/Lidia.png",
    "price": 0.0,
    "llm_provider": "openai",
    "llm_model": "gpt-4o",
    "status": "active",
    "webhook_url": "https://corefy.app.n8n.cloud/webhook/lidia-prospec",
    "created_at": datetime.now(timezone.utc),
}

async def main():
    # Pega MONGO_URL do argumento ou variável de ambiente
    mongo_url = sys.argv[1] if len(sys.argv) > 1 else os.getenv("MONGO_URL", "mongodb://localhost:27017")
    
    print(f"🔌 Conectando em: {mongo_url[:40]}...")
    client = AsyncIOMotorClient(mongo_url)
    
    db_name = os.getenv("DB_NAME", "agenthub")
    db = client[db_name]
    agents_col = db["agents"]

    existing = await agents_col.find_one({"name": "Lidia Prospecção"})
    
    if not existing:
        result = await agents_col.insert_one(lidia_agent)
        print(f"✅ Agente 'Lidia Prospecção' inserido com sucesso!")
        print(f"   ID: {lidia_agent['id']}")
        print(f"   Imagem: {lidia_agent['mascot_image_url']}")
        print(f"   Webhook: {lidia_agent['webhook_url']}")
    else:
        # Atualiza campos importantes mantendo o ID existente
        await agents_col.update_one(
            {"name": "Lidia Prospecção"},
            {"$set": {
                "segment": lidia_agent["segment"],
                "mascot_image_url": lidia_agent["mascot_image_url"],
                "mascot_image_hero_url": lidia_agent["mascot_image_hero_url"],
                "mascot_image_feature_url": lidia_agent["mascot_image_feature_url"],
                "mascot_image_cta_url": lidia_agent["mascot_image_cta_url"],
                "features": lidia_agent["features"],
                "webhook_url": lidia_agent["webhook_url"],
                "status": "active",
                "description": lidia_agent["description"],
            }}
        )
        print(f"✅ Agente 'Lidia Prospecção' já existia — dados atualizados!")
        print(f"   Imagem: {lidia_agent['mascot_image_url']}")

    client.close()

if __name__ == "__main__":
    asyncio.run(main())
