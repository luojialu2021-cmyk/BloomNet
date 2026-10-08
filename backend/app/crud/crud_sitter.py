from typing import Any, Dict, List, Optional
from datetime import date
from app.crud.base import CRUDBase
from app.models.sitter import SitterProfile, SitterCreate, SitterUpdate, SitterSearchParams


class CRUDSitter(CRUDBase[SitterProfile, SitterCreate, SitterUpdate]):
    def __init__(self):
        super().__init__(SitterProfile, "sitters")
        
    async def search_sitters(self, params: SitterSearchParams) -> List[SitterProfile]:
        """Search sitters based on various criteria"""
        collection = await self.get_collection()
        
        # Build filter query
        filter_dict: Dict[str, Any] = {}
        
        if params.available_only:
            filter_dict["is_available"] = True
            filter_dict["is_active"] = True
        
        if params.zip_code:
            filter_dict["service_areas"] = {"$in": [params.zip_code]}
        
        if params.campus_area:
            filter_dict["campus_area"] = params.campus_area

        specialty_requirements: List[str] = []
        if params.plant_type:
            specialty_requirements.append(params.plant_type)
        if params.specialties:
            specialty_requirements.extend(params.specialties)
        if specialty_requirements:
            filter_dict["specialties"] = {"$all": specialty_requirements}
        
        if params.experience_levels:
            filter_dict["experience_level"] = {"$in": params.experience_levels}
        
        if params.max_service_radius is not None:
            filter_dict["service_radius_miles"] = {"$lte": params.max_service_radius}
        
        if params.verified_only:
            filter_dict["is_verified"] = True
        
        if params.background_checked_only:
            filter_dict["background_checked"] = True
        
        if params.min_price is not None:
            filter_dict["price_per_visit"] = {"$gte": params.min_price}
        
        if params.max_price is not None:
            if "price_per_visit" in filter_dict:
                filter_dict["price_per_visit"]["$lte"] = params.max_price
            else:
                filter_dict["price_per_visit"] = {"$lte": params.max_price}
        
        if params.min_rating is not None:
            filter_dict["rating"] = {"$gte": params.min_rating}
        
        # Check availability for specific dates
        if params.start_date and params.end_date:
            # For now, simple check - exclude sitters with unavailable dates in range
            filter_dict["unavailable_dates"] = {
                "$not": {
                    "$elemMatch": {
                        "$gte": params.start_date.isoformat(),
                        "$lte": params.end_date.isoformat()
                    }
                }
            }
        
        cursor = collection.find(filter_dict).sort("rating", -1)
        docs = await cursor.to_list(length=100)
        return [SitterProfile(**doc) for doc in docs]
    
    async def get_by_user_id(self, user_id: str) -> Optional[SitterProfile]:
        """Get sitter profile by user ID"""
        from bson import ObjectId
        collection = await self.get_collection()
        
        # Convert user_id to ObjectId if it's a string
        if isinstance(user_id, str):
            try:
                user_id_obj = ObjectId(user_id)
            except:
                user_id_obj = user_id
        else:
            user_id_obj = user_id
        
        # Try both ObjectId and string formats
        doc = await collection.find_one({"user_id": user_id_obj})
        if not doc:
            # Try string format if ObjectId didn't work
            doc = await collection.find_one({"user_id": str(user_id)})
        
        if doc:
            return SitterProfile(**doc)
        return None
    
    async def get_by_email(self, email: str) -> Optional[SitterProfile]:
        """Get sitter profile by email"""
        collection = await self.get_collection()
        doc = await collection.find_one({"email": email})
        if doc:
            return SitterProfile(**doc)
        return None
    
    async def update_rating(self, sitter_id: str, new_rating: float, review_count: int):
        """Update sitter's rating and review count"""
        collection = await self.get_collection()
        await collection.update_one(
            {"_id": sitter_id},
            {
                "$set": {
                    "rating": new_rating,
                    "total_reviews": review_count
                }
            }
        )
    
    async def add_unavailable_dates(self, sitter_id: str, dates: List[date]):
        """Add unavailable dates to sitter's calendar"""
        collection = await self.get_collection()
        date_strings = [d.isoformat() for d in dates]
        await collection.update_one(
            {"_id": sitter_id},
            {"$addToSet": {"unavailable_dates": {"$each": date_strings}}}
        )
    
    async def remove_unavailable_dates(self, sitter_id: str, dates: List[date]):
        """Remove unavailable dates from sitter's calendar"""
        collection = await self.get_collection()
        date_strings = [d.isoformat() for d in dates]
        await collection.update_one(
            {"_id": sitter_id},
            {"$pull": {"unavailable_dates": {"$in": date_strings}}}
        )


sitter = CRUDSitter()
