from typing import Optional
from app.crud.base import CRUDBase
from app.models.user import User, UserCreate, UserUpdate


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        collection = await self.get_collection()
        doc = await collection.find_one({"email": email})
        if doc:
            return User(**doc)
        return None
    
    async def get_by_jhu_id(self, jhu_id: str) -> Optional[User]:
        """Get user by JHU ID"""
        collection = await self.get_collection()
        doc = await collection.find_one({"jhu_id": jhu_id})
        if doc:
            return User(**doc)
        return None
    
    async def update_rating(self, user_id: str, new_rating: float, review_count: int):
        """Update user's rating and review count"""
        collection = await self.get_collection()
        await collection.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "rating": new_rating,
                    "total_reviews": review_count
                }
            }
        )
    
    async def activate(self, user_id: str):
        """Activate user account"""
        collection = await self.get_collection()
        await collection.update_one(
            {"_id": user_id},
            {"$set": {"is_active": True}}
        )
    
    async def deactivate(self, user_id: str):
        """Deactivate user account"""
        collection = await self.get_collection()
        await collection.update_one(
            {"_id": user_id},
            {"$set": {"is_active": False}}
        )


user = CRUDUser(User, "users")
