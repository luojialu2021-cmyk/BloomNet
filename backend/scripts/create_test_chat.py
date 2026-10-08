"""
Script to create test chat conversations for testing
This allows you to test chat functionality between two accounts
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from bson import ObjectId

# MongoDB connection
MONGODB_URL = "mongodb://localhost:27017"
DB_NAME = "plant_care_platform"  # Correct database name

async def create_test_conversations():
    """Create test conversations between two users"""
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    try:
        # First, find your two test users by email
        user1_email = "alinapanyue@gmail.com"
        user2_email = "alinapanyue@outlook.com"
        
        user1 = await db.auth_users.find_one({"email": user1_email})
        user2 = await db.auth_users.find_one({"email": user2_email})
        
        if not user1:
            print(f"❌ User {user1_email} not found. Please login with this account first.")
            return
        
        if not user2:
            print(f"❌ User {user2_email} not found. Please login with this account first.")
            return
        
        user1_id = str(user1["_id"])
        user2_id = str(user2["_id"])
        
        print(f"✅ Found users:")
        print(f"   User 1: {user1['name']} ({user1_email}) - ID: {user1_id}")
        print(f"   User 2: {user2['name']} ({user2_email}) - ID: {user2_id}")
        
        # Check roles
        user1_role = user1.get("role", "user")
        user2_role = user2.get("role", "user")
        
        print(f"\n📋 Roles:")
        print(f"   {user1['name']}: {user1_role}")
        print(f"   {user2['name']}: {user2_role}")
        
        # Create a conversation between them
        # Assuming user1 is a sitter and user2 is a user (or vice versa)
        conversation_id = ObjectId()
        
        conversation = {
            "_id": conversation_id,
            "participants": [user1_id, user2_id],
            "participant_details": {
                user1_id: {
                    "name": user1["name"],
                    "email": user1["email"],
                    "role": user1_role
                },
                user2_id: {
                    "name": user2["name"],
                    "email": user2["email"],
                    "role": user2_role
                }
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_message_at": datetime.utcnow()
        }
        
        # Check if conversation already exists
        existing_conv = await db.conversations.find_one({
            "participants": {"$all": [user1_id, user2_id]}
        })
        
        if existing_conv:
            print(f"\n⚠️  Conversation already exists between these users.")
            print(f"   Conversation ID: {existing_conv['_id']}")
            conversation_id = existing_conv["_id"]
        else:
            await db.conversations.insert_one(conversation)
            print(f"\n✅ Created conversation between {user1['name']} and {user2['name']}")
            print(f"   Conversation ID: {conversation_id}")
        
        # Create some test messages
        messages = [
            {
                "conversation_id": str(conversation_id),
                "sender_id": user1_id,
                "content": "Hi! I'm looking for a plant sitter for next week.",
                "created_at": datetime.utcnow(),
                "read": False
            },
            {
                "conversation_id": str(conversation_id),
                "sender_id": user2_id,
                "content": "Hello! I'd be happy to help. What kind of plants do you have?",
                "created_at": datetime.utcnow(),
                "read": False
            },
            {
                "conversation_id": str(conversation_id),
                "sender_id": user1_id,
                "content": "I have 3 succulents and 2 ferns. They need watering every other day.",
                "created_at": datetime.utcnow(),
                "read": False
            },
        ]
        
        # Clear existing messages for this conversation (for testing)
        deleted_count = await db.messages.delete_many({"conversation_id": str(conversation_id)})
        if deleted_count.deleted_count > 0:
            print(f"\n🗑️  Deleted {deleted_count.deleted_count} old messages")
        
        # Insert new messages
        result = await db.messages.insert_many(messages)
        print(f"\n✅ Created {len(result.inserted_ids)} test messages")
        
        print(f"\n🎉 Test data created successfully!")
        print(f"\n📌 You can now test chat between:")
        print(f"   - Login as {user1_email} and go to /sitter/messages (or /dashboard)")
        print(f"   - Login as {user2_email} and go to /sitter/messages (or /dashboard)")
        print(f"\n   Both users should see the conversation and can send messages to each other.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(create_test_conversations())

