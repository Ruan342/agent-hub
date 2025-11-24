"""
Script para criar uma assinatura de teste para o usuário 'teste'
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone
import bcrypt

# Load environment
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def create_test_subscription():
    """Criar ou atualizar usuário teste e criar assinatura"""
    
    print("=" * 80)
    print("CRIANDO ASSINATURA DE TESTE")
    print("=" * 80)
    
    # 1. Verificar/Criar usuário teste
    test_user = await db.users.find_one({"email": "teste@teste.com"})
    
    if not test_user:
        print("\n📝 Criando usuário teste...")
        test_user = {
            "id": str(uuid.uuid4()),
            "email": "teste@teste.com",
            "name": "Usuário Teste",
            "role": "customer",
            "password_hash": hash_password("teste123"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(test_user)
        print(f"   ✅ Usuário criado: teste@teste.com (senha: teste123)")
    else:
        print(f"\n✅ Usuário teste já existe: {test_user['email']}")
    
    user_id = test_user['id']
    
    # 2. Buscar um agente interessante para teste (vou pegar o primeiro da categoria Vendas)
    agent = await db.agents.find_one({"name": "Agente de Vendas Outbound / SDR de IA"})
    
    if not agent:
        # Se não encontrar, pega qualquer agente
        agent = await db.agents.find_one({})
    
    if not agent:
        print("❌ Nenhum agente encontrado no banco de dados!")
        return
    
    print(f"\n📋 Agente selecionado: {agent['name']}")
    print(f"   Segmento: {agent['segment']}")
    print(f"   Preço: R$ {agent['price']}")
    
    # 3. Verificar se já existe assinatura
    existing_subscription = await db.subscriptions.find_one({
        "user_id": user_id,
        "agent_id": agent['id'],
        "status": "active"
    })
    
    if existing_subscription:
        print(f"\n⚠️ Usuário teste já tem assinatura ativa deste agente!")
        print(f"   Subscription ID: {existing_subscription['id']}")
        return
    
    # 4. Criar assinatura
    subscription = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "agent_id": agent['id'],
        "agent_name": agent['name'],
        "status": "active",
        "stripe_subscription_id": "test_sub_" + str(uuid.uuid4())[:8],
        "api_key": "sk_test_" + str(uuid.uuid4()).replace("-", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "current_period_start": datetime.now(timezone.utc).isoformat(),
        "current_period_end": None
    }
    
    await db.subscriptions.insert_one(subscription)
    
    print(f"\n✅ Assinatura criada com sucesso!")
    print(f"   Subscription ID: {subscription['id']}")
    print(f"   API Key: {subscription['api_key']}")
    
    # 5. Verificar total de assinaturas do usuário
    all_subscriptions = await db.subscriptions.find({
        "user_id": user_id,
        "status": "active"
    }).to_list(length=None)
    
    print(f"\n📊 Total de assinaturas ativas do usuário teste: {len(all_subscriptions)}")
    for sub in all_subscriptions:
        print(f"   - {sub['agent_name']}")
    
    print("\n" + "=" * 80)
    print("CREDENCIAIS PARA LOGIN")
    print("=" * 80)
    print(f"   Email: teste@teste.com")
    print(f"   Senha: teste123")
    print("\n✨ Acesse o dashboard em: /dashboard")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(create_test_subscription())
