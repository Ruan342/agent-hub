import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

agents_to_add = [
    {
        "id": str(uuid.uuid4()),
        "name": "E-commerce manager",
        "segment": "ecommerce",
        "description": "E-commerce manager for product recommendations and stock monitoring.",
        "voice_id": "pNInz6obbfIdG2p2pPxb",
        "system_prompt": "Você é um gerente de e-commerce."
    },
    {
        "id": str(uuid.uuid4()),
        "name": "SDR de IA / vendedor Outbond",
        "segment": "sdr",
        "description": "Agente SDR para prospecção ativa de vendas.",
        "voice_id": "pNInz6obbfIdG2p2pPxb",
        "system_prompt": "Você é um SDR de Inteligência Artificial."
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Suporte tecnico + Knowlege Base",
        "segment": "suporte",
        "description": "Suporte técnico integrado à base de conhecimento.",
        "voice_id": "pNInz6obbfIdG2p2pPxb",
        "system_prompt": "Você é um suporte técnico."
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Pós vendas e retenção",
        "segment": "pos_vendas",
        "description": "Agente focado no processo de pós-vendas e retenção de clientes.",
        "voice_id": "pNInz6obbfIdG2p2pPxb",
        "system_prompt": "Você é um agente de pós vendas."
    }
]

async def main():
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client["agenthub"]
    agents_col = db["agents"]
    
    for agent in agents_to_add:
        existing = await agents_col.find_one({"name": agent["name"]})
        if not existing:
            await agents_col.insert_one(agent)
            print(f"Agent '{agent['name']}' inserted.")
        else:
            print(f"Agent '{agent['name']}' already exists.")

if __name__ == "__main__":
    asyncio.run(main())
