import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timezone
import bcrypt

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["agenthub"]
    users = db["users"]
    
    hashed = bcrypt.hashpw(b"admin1234", bcrypt.gensalt()).decode('utf-8')
    admin_user = {
        "id": str(uuid.uuid4()),
        "name": "admin1",
        "email": "admin1@email.com",
        "password_hash": hashed,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check if exists
    existing = await users.find_one({"email": "admin1@email.com"})
    if existing:
        await users.update_one({"email": "admin1@email.com"}, {"$set": admin_user})
        print("Admin user updated.")
    else:
        await users.insert_one(admin_user)
        print("Admin user created.")

if __name__ == "__main__":
    asyncio.run(main())
