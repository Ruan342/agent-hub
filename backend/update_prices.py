"""Utility: reprice existing agents in the database.

Reads MONGO_URL / DB_NAME from backend/.env — never hardcode credentials.
"""
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "agenthub")

if not MONGO_URL:
    print("❌ MONGO_URL não definido. Preencha backend/.env antes de executar este script.")
    sys.exit(1)


async def update_prices():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    prices = {
        "Lucy E-commerce": 329.90,
        "Bruno SDR": 349.90,
        "Clara Pós vendas": 279.90,
        "Max Suporte": 229.90,
    }

    for name, price in prices.items():
        result = await db.agents.update_many(
            {"name": {"$regex": name, "$options": "i"}},
            {"$set": {"price": price}},
        )
        print(f"Atualizado {name} para R${price}: {result.modified_count} documentos")


if __name__ == "__main__":
    asyncio.run(update_prices())
