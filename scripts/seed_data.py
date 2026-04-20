#!/usr/bin/env python3
"""
Script para popular o banco de dados com dados de exemplo.

Lê MONGO_URL / DB_NAME de variáveis de ambiente (backend/.env).
Nunca hardcode credenciais.
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Carrega backend/.env para reaproveitar a mesma configuração da API.
REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(REPO_ROOT / "backend" / ".env")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "agenthub")

if not MONGO_URL:
    print("❌ MONGO_URL não definido. Preencha backend/.env antes de rodar o seed.")
    sys.exit(1)


async def seed_database():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Criar usuário admin
    admin_email = os.environ.get("SEED_ADMIN_EMAIL", "admin@voiceai.com")
    admin_password = os.environ.get("SEED_ADMIN_PASSWORD", "admin123")

    admin_exists = await db.users.find_one({"email": admin_email})
    if not admin_exists:
        password_hash = bcrypt.hashpw(admin_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Admin",
            "role": "admin",
            "password_hash": password_hash,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(admin_user)
        print(f"✓ Usuário admin criado ({admin_email})")
    else:
        print(f"✓ Usuário admin já existe ({admin_email})")

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
                "Relatórios de performance",
            ],
            "mascot_image_url": "https://via.placeholder.com/256/6366f1/ffffff?text=Sales+AI",
            "elevenlabs_voice_id": "voice_sales_001",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
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
                "Histórico de conversas",
            ],
            "mascot_image_url": "https://via.placeholder.com/256/8b5cf6/ffffff?text=Support+AI",
            "elevenlabs_voice_id": "voice_support_001",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
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
                "Testes A/B automáticos",
            ],
            "mascot_image_url": "https://via.placeholder.com/256/ec4899/ffffff?text=Marketing+AI",
            "elevenlabs_voice_id": "voice_marketing_001",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
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
                "Relatórios financeiros",
            ],
            "mascot_image_url": "https://via.placeholder.com/256/10b981/ffffff?text=Finance+AI",
            "elevenlabs_voice_id": "voice_finance_001",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
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
                "Análise de fit cultural",
            ],
            "mascot_image_url": "https://via.placeholder.com/256/f59e0b/ffffff?text=HR+AI",
            "elevenlabs_voice_id": "voice_hr_001",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    ]

    for agent in sample_agents:
        existing = await db.agents.find_one({"name": agent["name"]})
        if not existing:
            await db.agents.insert_one(agent)
            print(f"✓ Agente '{agent['name']}' criado")
        else:
            print(f"✓ Agente '{agent['name']}' já existe")

    client.close()
    print("\n✅ Banco de dados populado com sucesso!")
    print(f"\n📋 Credenciais admin: {admin_email} (senha definida via SEED_ADMIN_PASSWORD ou default)")


if __name__ == "__main__":
    asyncio.run(seed_database())
