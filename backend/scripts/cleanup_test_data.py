#!/usr/bin/env python3
"""
Script to clean up all test and sample data
"""

import asyncio
import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.join(os.path.dirname(__file__), '..')
sys.path.append(backend_dir)

from app.core.database import connect_to_mongo, close_mongo_connection, get_database


async def clear_all_test_data():
    """Clean up all test and sample data"""
    try:
        db = await get_database()
        collection = db["sitters"]
        
        # Clean up all test data (based on naming patterns or specific markers)
        result = await collection.delete_many({
            "$or": [
                # Test data user_id range
                {"user_id": {"$regex": "^67f1f77bcf86cd7994390"}},
                # Sample data user_id range  
                {"user_id": {"$regex": "^507f1f77bcf86cd7994390"}},
                # Or based on specific markers
                {"is_test_data": True}
            ]
        })
        
        print(f"🧹 Cleaned up {result.deleted_count} test/sample sitters")
        return result.deleted_count
        
    except Exception as e:
        print(f"❌ Error clearing test data: {str(e)}")
        return 0


async def main():
    print("🌱 Cleaning up all test data...")
    
    try:
        await connect_to_mongo()
        cleared_count = await clear_all_test_data()
        
        if cleared_count > 0:
            print(f"✅ Successfully cleaned {cleared_count} test records")
        else:
            print("ℹ️  No test data found to clean")
            
    except Exception as e:
        print(f"💥 Error: {str(e)}")
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())