import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

mongo_url = "mongodb://localhost:27017" # Ajustar se necessário, mas .env do servidor costuma usar localhost Default

async def update_prices():
    client = AsyncIOMotorClient(mongo_url)
    db = client["agenthub"]

    prices = {
        "Lucy E-commerce": 329.90,
        "Bruno SDR": 349.90,
        "Clara Pós vendas": 279.90,
        "Max Suporte": 229.90
    }

    for name, price in prices.items():
        result = await db.agents.update_many(
            {"name": {"$regex": name, "$options": "i"}},
            {"$set": {"price": price}}
        )
        print(f"Atualizado {name} para R${price}: {result.modified_count} documentos")

if __name__ == "__main__":
    asyncio.run(update_prices())
