import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))
    db = client["agenthub"]
    agent = await db["agents"].find_one({"segment": "lidia_prospec"})
    if agent:
        print("OK - Lidia encontrada:", agent.get("name"), "| webhook:", agent.get("webhook_url"))
    else:
        print("NAO encontrada - inserindo agora...")
        from add_lidia_agent import lidia_agent
        await db["agents"].insert_one(lidia_agent)
        print("Inserida com sucesso.")

asyncio.run(check())
