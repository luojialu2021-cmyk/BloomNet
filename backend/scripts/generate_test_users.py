#!/usr/bin/env python3
"""
Test data generation script for user profiles with preferred_plant_types.
This script creates test users (plant owners) with various plant type interests
for testing the Explore page similar users feature.
"""

import asyncio
import sys
import os
from datetime import datetime
from typing import List
from bson import ObjectId

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from app.core.database import connect_to_mongo, close_mongo_connection, get_database

# Plant types that users can have as interests
PLANT_TYPES = [
    "succulent", "cactus", "fern", "tropical", "flower", "herb",
    "palm", "orchid", "ivy", "bamboo", "bonsai", "air plant"
]

# First and last names for generating user names
FIRST_NAMES = [
    "Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn",
    "Avery", "Blake", "Cameron", "Dakota", "Emery", "Finley", "Harper"
]

LAST_NAMES = [
    "Chen", "Johnson", "Lee", "Kim", "Park", "Smith", "Williams", "Brown",
    "Davis", "Miller", "Wilson", "Moore", "Anderson", "Thomas", "Jackson"
]

# Bio templates
BIO_TEMPLATES = [
    "Plant enthusiast and collector",
    "Indoor garden lover",
    "Cactus collector",
    "Herb garden expert",
    "Plant parent",
    "Tropical plant specialist",
    "Succulent enthusiast",
    "Houseplant hobbyist"
]


async def generate_test_users(num_users: int = 20):
    """Generate test user profiles with preferred_plant_types"""
    await connect_to_mongo()
    db = await get_database()
    
    if db is None:
        print("❌ Failed to connect to database")
        return
    
    print(f"🌱 Generating {num_users} test user profiles...")
    
    # Clear existing test user profiles (optional - comment out if you want to keep existing data)
    # result = await db.user_profiles.delete_many({"email": {"$regex": "@testuser"}})
    # print(f"🧹 Cleared {result.deleted_count} existing test user profiles")
    
    created_count = 0
    
    for idx in range(num_users):
        # Generate user data
        first_name = FIRST_NAMES[idx % len(FIRST_NAMES)]
        last_name = LAST_NAMES[(idx // len(FIRST_NAMES)) % len(LAST_NAMES)]
        name = f"{first_name} {last_name}"
        email = f"{first_name.lower()}.{last_name.lower()}@testuser.com"
        
        # Generate user_id (ObjectId)
        user_id = str(ObjectId())
        
        # Select 2-4 random plant types for each user
        import random
        num_interests = random.randint(2, 4)
        preferred_plant_types = random.sample(PLANT_TYPES, num_interests)
        
        # Select bio
        bio = BIO_TEMPLATES[idx % len(BIO_TEMPLATES)]
        
        # Create user profile document
        profile_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "bio": bio,
            "preferred_plant_types": preferred_plant_types,
            "is_complete": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Create corresponding auth_user document
        auth_user_doc = {
            "_id": ObjectId(user_id),
            "email": email,
            "name": name,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        try:
            # Insert auth_user first
            await db.auth_users.insert_one(auth_user_doc)
            
            # Insert user_profile
            await db.user_profiles.insert_one(profile_doc)
            
            created_count += 1
            print(f"✅ Created user: {name} ({email}) - Interests: {', '.join(preferred_plant_types)}")
        except Exception as e:
            print(f"❌ Error creating user {name}: {e}")
            continue
    
    print(f"\n🎉 Successfully created {created_count} test user profiles!")
    print(f"💡 These users will now appear in the Explore page if they share interests with you.")
    
    await close_mongo_connection()


if __name__ == "__main__":
    # Default to 20 users, but allow override via command line
    num_users = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    asyncio.run(generate_test_users(num_users))

