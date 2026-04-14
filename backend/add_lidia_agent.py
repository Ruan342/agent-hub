import asyncio
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient

lidia_agent = {
    "id": str(uuid.uuid4()),
    "name": "Lidia Prospecção",
    "segment": "lidia_prospec",
    "description": "Agente de vendas especializada em prospecção ativa. A Lidia aborda leads, apresenta produtos, envia links de agendamento e fecha negócios enviando links de pagamento.",
    "voice_id": "pNInz6obbfIdG2p2pPxb",
    "system_prompt": "Você é a Lidia, uma agente de vendas especializada em prospecção. Seu objetivo é abordar potenciais clientes de forma consultiva, apresentar os produtos/serviços, qualificar o interesse e conduzir ao fechamento enviando links de agendamento ou pagamento conforme o momento da conversa.",
    "features": [
        "Abordagem consultiva e personalizada",
        "Apresentação de produtos e serviços",
        "Envio de link de agendamento de reunião",
        "Fechamento com link de pagamento direto",
        "Gestão de objeções automática"
    ],
    "mascot_image_url": "",
    "price": 0,
    "webhook_url": "https://corefy.app.n8n.cloud/webhook/lidia-prospec"
}

async def main():
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client["agenthub"]
    agents_col = db["agents"]

    existing = await agents_col.find_one({"name": lidia_agent["name"]})
    if not existing:
        await agents_col.insert_one(lidia_agent)
        print(f"✅ Agente '{lidia_agent['name']}' criado com sucesso!")
        print(f"   Segment: {lidia_agent['segment']}")
        print(f"   Webhook: {lidia_agent['webhook_url']}")
    else:
        print(f"⚠️  Agente '{lidia_agent['name']}' já existe no banco.")
        # Atualizar webhook se necessário
        await agents_col.update_one(
            {"name": lidia_agent["name"]},
            {"$set": {"webhook_url": lidia_agent["webhook_url"], "segment": lidia_agent["segment"]}}
        )
        print(f"   Webhook atualizado para: {lidia_agent['webhook_url']}")

if __name__ == "__main__":
    asyncio.run(main())
