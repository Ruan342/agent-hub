"""
Script para corrigir o formato da API key da assinatura de teste
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid

# Load environment
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def fix_api_keys():
    """Corrigir formato das API keys"""
    
    print("=" * 80)
    print("CORRIGINDO FORMATO DAS API KEYS")
    print("=" * 80)
    
    # Buscar todas as assinaturas ativas
    subscriptions = await db.subscriptions.find({"status": "active"}).to_list(length=None)
    
    print(f"\n📊 Total de assinaturas ativas: {len(subscriptions)}")
    
    fixed_count = 0
    for sub in subscriptions:
        api_key = sub.get('api_key', '')
        
        # Se a API key não começa com vapi_, corrigir
        if not api_key.startswith('vapi_'):
            new_api_key = f"vapi_{str(uuid.uuid4()).replace('-', '')}"
            
            result = await db.subscriptions.update_one(
                {"id": sub['id']},
                {"$set": {"api_key": new_api_key}}
            )
            
            if result.modified_count > 0:
                print(f"\n✅ Corrigida assinatura: {sub['id']}")
                print(f"   Antiga: {api_key}")
                print(f"   Nova: {new_api_key}")
                fixed_count += 1
        else:
            print(f"\n⚪ Assinatura OK: {sub['id']} - {api_key[:20]}...")
    
    print(f"\n" + "=" * 80)
    print(f"RESUMO: {fixed_count} API keys corrigidas")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(fix_api_keys())
