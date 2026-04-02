import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('backend/.env')
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'agent_platform')

async def main():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    mappings = [
        {"name": "Lucy E-commerce", "target": "lucy.png"},
        {"name": "Bruno SDR", "target": "bruno.png"},
        {"name": "Clara Pós vendas", "target": "clara.png"},
        {"name": "Max Suporte", "target": "max.png"},
    ]

    for m in mappings:
        url = f"http://localhost:8001/api/uploads/agents/{m['target']}"
        res = await db.agents.update_many(
            {"name": m["name"]},
            {"$set": {
                "mascot_image_url": url,
                "mascot_image_hero_url": url,
                "mascot_image_feature_url": url,
                "mascot_image_cta_url": url
            }}
        )
        print(f"Verified {m['name']} -> matched {res.matched_count}")

    client.close()

if __name__ == "__main__":
    asyncio.run(main())
