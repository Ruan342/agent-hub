from pymongo import MongoClient

# Use the production atlas connection string
MONGO_URI = ""
client = MongoClient(MONGO_URI)
db = client["agenthub"]

collection = db["knowledge_base"]

for doc in collection.find({}):
    agent_name = doc.get("agent", "")
    if "Bruno" in agent_name or "SDR" in agent_name.upper() or "sdr" in agent_name.lower():
        updates = {}
        platform = doc.get("apify_platform")
        
        # If it's a string, convert to array
        if isinstance(platform, str):
            if platform == "Nenhuma" or platform == "":
                updates["apify_platform"] = []
            else:
                updates["apify_platform"] = [platform]
        
        # Remove legacy fields
        if "orientacoes_prospeccao" in doc:
            updates["$unset"] = updates.get("$unset", {})
            updates["$unset"]["orientacoes_prospeccao"] = ""
        if "informacoes_necessarias_prospeccao" in doc:
            updates["$unset"] = updates.get("$unset", {})
            updates["$unset"]["informacoes_necessarias_prospeccao"] = ""

        if updates:
            set_ops = {}
            unset_ops = {}
            if "apify_platform" in updates:
                set_ops["apify_platform"] = updates.pop("apify_platform")
            if "$unset" in updates:
                unset_ops = updates.pop("$unset")
                
            update_body = {}
            if set_ops:
                update_body["$set"] = set_ops
            if unset_ops:
                update_body["$unset"] = unset_ops
                
            if update_body:
                print(f"Updating {agent_name} for user {doc.get('user_id')}: {update_body}")
                collection.update_one({"_id": doc["_id"]}, update_body)
        else:
            print(f"No properties to update for {agent_name} with user {doc.get('user_id')}")

print("Migration completed.")
