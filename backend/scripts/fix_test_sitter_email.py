#!/usr/bin/env python3
"""
Script to manually fix the test sitter email and update reservations
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from bson import ObjectId


async def fix_test_sitter_email():
    """Fix the test sitter email and update reservations"""
    print("🔧 Fixing test sitter email and reservations...")
    print("=" * 60)
    
    try:
        # Connect to database
        print("Connecting to MongoDB...")
        await connect_to_mongo()
        db = await get_database()
        
        # First, update the test sitter with email
        print("Updating test sitter with email...")
        sitter_result = await db.sitters.update_one(
            {"user_id": ObjectId("64f1f77bcf86cd7994390112")},
            {"$set": {"email": "sittertest996@gmail.com"}}
        )
        print(f"✅ Updated sitter: {sitter_result.modified_count} documents modified")
        
        # Now update all reservations with sitter_id matching the test sitter
        print("Updating reservations with sitter_email...")
        reservation_result = await db.reservations.update_many(
            {"sitter_id": ObjectId("64f1f77bcf86cd7994390112")},
            {"$set": {"sitter_email": "sittertest996@gmail.com"}}
        )
        print(f"✅ Updated reservations: {reservation_result.modified_count} documents modified")
        
        # Verify the updates
        sitter = await db.sitters.find_one({"user_id": ObjectId("64f1f77bcf86cd7994390112")})
        print(f"Test sitter email: {sitter.get('email')}")
        
        reservation_count = await db.reservations.count_documents({"sitter_email": "sittertest996@gmail.com"})
        print(f"Reservations with sitter_email: {reservation_count}")
        
        print("\n✅ All updates completed successfully!")
        
    except Exception as e:
        print(f"\n💥 Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Close database connection
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(fix_test_sitter_email())
