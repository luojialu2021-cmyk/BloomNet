from typing import Any, Dict, List, Optional
from bson import ObjectId
from bson.errors import InvalidId
from app.crud.base import CRUDBase
from app.models.review import Review

class CRUDReview(CRUDBase[Review, Review, Review]):
    def __init__(self):
        super().__init__(Review, "reviews")

    async def get_by_reservation_id(self, reservation_id: str) -> Optional[Review]:
        """Get a review by reservation ID."""
        collection = await self.get_collection()
        doc = await collection.find_one({"reservation_id": reservation_id})
        return Review(**doc) if doc else None

    async def get_multi(self, skip: int = 0, limit: int = 10) -> List[Review]:
        """Get multiple reviews with pagination."""
        collection = await self.get_collection()
        cursor = collection.find().skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [Review(**doc) for doc in docs]

    async def remove(self, id: ObjectId) -> bool:
        """Remove a review by ID."""
        try:
            collection = await self.get_collection()
            # Ensure id is a valid ObjectId
            if not isinstance(id, ObjectId):
                raise ValueError("Provided id is not a valid ObjectId")
            result = await collection.delete_one({"_id": id})
            return result.deleted_count > 0
        except InvalidId:
            print(f"Invalid ObjectId: {id}")
            return False
        except Exception as e:
            print(f"Error during deletion: {e}")
            return False

review_crud = CRUDReview()