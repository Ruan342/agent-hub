#!/usr/bin/env python3
"""
Script para popular o banco de dados com dados de exemplo
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import bcrypt
import uuid

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "voiceai_platform"

async def seed_database():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Criar usuário admin
    admin_exists = await db.users.find_one({"email": "admin@voiceai.com"})
    if not admin_exists:
        password_hash = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@voiceai.com",
            "name": "Admin",
            "role": "admin",
            "password_hash": password_hash,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        print("✓ Usuário admin criado (admin@voiceai.com / admin123)")
    else:
        print("✓ Usuário admin já existe")
    
    # Criar agentes de exemplo
    sample_agents = [
        {
            "id": str(uuid.uuid4()),
            "name": "Assistente de Vendas Pro",
            "description": "Agente especializado em vendas consultivas. Qualifica leads, agenda reuniões e faz follow-ups automáticos.",
            "segment": "vendas",
            "price": 49.99,
            "features": [
                "Qualificação automática de leads",
                "Agendamento inteligente de reuniões",
                "Follow-up automático por voz",
                "Integração com CRM",
                "Relatórios de performance"
            ],
            "mascot_image_url": "https://via.placeholder.com/256/6366f1/ffffff?text=Sales+AI",
            "elevenlabs_voice_id": "voice_sales_001",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Suporte Cliente 24/7",
            "description": "Atendimento ao cliente automatizado disponível 24 horas. Resolve dúvidas comuns e escala casos complexos.",
            "segment": "suporte",
            "price": 39.99,
            "features": [
                "Disponível 24/7",
                "Base de conhecimento integrada",
                "Escalação inteligente",
                "Multi-idioma",
                "Histórico de conversas"
            ],
            "mascot_image_url": "https://via.placeholder.com/256/8b5cf6/ffffff?text=Support+AI",
            "elevenlabs_voice_id": "voice_support_001",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Marketing Outbound",
            "description": "Agente para campanhas de marketing por voz. Personaliza mensagens e coleta feedbacks.",
            "segment": "marketing",
            "price": 59.99,
            "features": [
                "Campanhas personalizadas",
                "Coleta de feedback",
                "Segmentação inteligente",
                "Analytics em tempo real",
                "Testes A/B automáticos"
            ],
            "mascot_image_url": "https://via.placeholder.com/256/ec4899/ffffff?text=Marketing+AI",
            "elevenlabs_voice_id": "voice_marketing_001",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Assistente Financeiro",
            "description": "Gerencia cobranças, lembretes de pagamento e fornece informações sobre faturas.",
            "segment": "financeiro",
            "price": 44.99,
            "features": [
                "Cobrança automática",
                "Lembretes de pagamento",
                "Consulta de faturas",
                "Negociação de débitos",
                "Relatórios financeiros"
            ],
            "mascot_image_url": "https://via.placeholder.com/256/10b981/ffffff?text=Finance+AI",
            "elevenlabs_voice_id": "voice_finance_001",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "RH Recruiter Pro",
            "description": "Automatiza triagem de candidatos, agenda entrevistas e coleta feedback inicial.",
            "segment": "rh",
            "price": 54.99,
            "features": [
                "Triagem de candidatos",
                "Agendamento de entrevistas",
                "Coleta de feedback",
                "Integração com ATS",
                "Análise de fit cultural"
            ],
            "mascot_image_url": "https://via.placeholder.com/256/f59e0b/ffffff?text=HR+AI",
            "elevenlabs_voice_id": "voice_hr_001",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Verificar e inserir agentes
    for agent in sample_agents:
        existing = await db.agents.find_one({"name": agent["name"]})
        if not existing:
            await db.agents.insert_one(agent)
            print(f"✓ Agente '{agent['name']}' criado")
        else:
            print(f"✓ Agente '{agent['name']}' já existe")
    
    client.close()
    print("\n✅ Banco de dados populado com sucesso!")
    print("\n📋 Credenciais:")
    print("   Admin: admin@voiceai.com / admin123")

if __name__ == "__main__":
    asyncio.run(seed_database())
