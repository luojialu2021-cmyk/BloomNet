from typing import Any, Dict, List, Optional
from datetime import date, datetime, timedelta
from app.crud.base import CRUDBase
from app.models.user_profile import UserProfile, UserProfileCreate, UserProfileUpdate, UserProfileSearchParams

class CRUDUserProfile(CRUDBase[UserProfile, UserProfileCreate, UserProfileUpdate]):
    def __init__(self):
        super().__init__(UserProfile, "user_profiles")
    async def get_all(self):
        """Get all users from MongoDB"""
        collection = await self.get_collection()
        cursor = collection.find(
            {},
            {
                "user_id": 1,
                "preferred_plant_types": 1,
                "bio": 1,
                "name":1,
                "email":1,
                "profile_image":1
            }
        )

        results = []
        async for doc in cursor:
            results.append(doc)
        return results

user_profiles = CRUDUserProfile()
