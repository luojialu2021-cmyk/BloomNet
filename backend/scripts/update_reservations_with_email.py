#!/usr/bin/env python3
"""
Script to update existing reservations with sitter_email field
This script adds sitter_email to existing reservations based on sitter_id
"""

import asyncio
import sys
import os
from datetime import datetime
from typing import List

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from bson import ObjectId


async def update_reservations_with_email():
    """Update existing reservations with sitter_email field"""
    print("🔄 Updating reservations with sitter_email field...")
    print("=" * 60)
    
    try:
        # Connect to database
        print("Connecting to MongoDB...")
        await connect_to_mongo()
        db = await get_database()
        
        # Get all reservations
        reservations_collection = db.reservations
        sitters_collection = db.sitters
        
        # Find all reservations without sitter_email
        reservations_without_email = await reservations_collection.find({
            "sitter_email": {"$exists": False}
        }).to_list(length=None)
        
        print(f"Found {len(reservations_without_email)} reservations without sitter_email")
        
        updated_count = 0
        skipped_count = 0
        
        for reservation in reservations_without_email:
            sitter_id = reservation.get("sitter_id")
            if not sitter_id:
                print(f"⚠️  Skipping reservation {reservation.get('_id')} - no sitter_id")
                skipped_count += 1
                continue
            
            # Find the sitter by sitter_id
            sitter = await sitters_collection.find_one({"user_id": ObjectId(sitter_id)})
            
            if sitter and sitter.get("email"):
                # Update the reservation with sitter email
                await reservations_collection.update_one(
                    {"_id": reservation["_id"]},
                    {"$set": {"sitter_email": sitter["email"]}}
                )
                print(f"✅ Updated reservation {reservation['_id']} with sitter email: {sitter['email']}")
                updated_count += 1
            else:
                print(f"⚠️  Skipping reservation {reservation['_id']} - sitter not found or no email")
                skipped_count += 1
        
        print("\n" + "=" * 60)
        print("📊 SUMMARY:")
        print(f"   Updated: {updated_count}")
        print(f"   Skipped: {skipped_count}")
        print(f"   Total processed: {len(reservations_without_email)}")
        
        if updated_count > 0:
            print("\n✅ Reservations updated successfully!")
        else:
            print("\n⚠️  No reservations were updated.")
            
    except Exception as e:
        print(f"\n💥 Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Close database connection
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(update_reservations_with_email())
