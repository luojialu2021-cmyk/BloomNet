from typing import Any, Dict, List, Optional
from datetime import date, datetime, timedelta
from app.crud.base import CRUDBase
from app.models.listing import Listing, ListingCreate, ListingUpdate, ListingSearchParams, ListingStatus


class CRUDListing(CRUDBase[Listing, ListingCreate, ListingUpdate]):
    def __init__(self):
        super().__init__(Listing, "listings")
       

    async def search_listings(self, params: ListingSearchParams) -> List[Listing]:
        """Search listings based on various criteria"""
        collection = await self.get_collection()
        
        # Build filter query
        filter_dict: Dict[str, Any] = {}
        
        if params.status:
            filter_dict["status"] = params.status
        else:
            filter_dict["status"] = ListingStatus.ACTIVE
        
        if params.zip_code:
            filter_dict["location.zip_code"] = params.zip_code
        
        if params.campus_area:
            filter_dict["location.campus_area"] = params.campus_area
        
        if params.plant_type:
            filter_dict["plants.plant_type"] = {"$in": [params.plant_type]}
        
        if params.care_type:
            filter_dict["care_requirements.care_types"] = {"$in": [params.care_type]}
        
        if params.start_date:
            filter_dict["care_requirements.start_date"] = {"$gte": params.start_date.isoformat()}
        
        if params.end_date:
            filter_dict["care_requirements.end_date"] = {"$lte": params.end_date.isoformat()}
        
        if params.min_payment is not None:
            filter_dict["total_payment"] = {"$gte": params.min_payment}
        
        if params.max_payment is not None:
            if "total_payment" in filter_dict:
                filter_dict["total_payment"]["$lte"] = params.max_payment
            else:
                filter_dict["total_payment"] = {"$lte": params.max_payment}
        
        if params.is_urgent_only:
            filter_dict["is_urgent"] = True
        
        # Sort by urgency first, then by creation date (newest first)
        cursor = collection.find(filter_dict).sort([
            ("is_urgent", -1),
            ("created_at", -1)
        ])
        
        docs = await cursor.to_list(length=100)
        return [Listing(**doc) for doc in docs]
    
    async def get_by_owner_id(self, owner_id: str) -> List[Listing]:
        """Get all listings by owner ID"""
        collection = await self.get_collection()
        cursor = collection.find({"owner_id": owner_id}).sort("created_at", -1)
        docs = await cursor.to_list(length=100)
        return [Listing(**doc) for doc in docs]
    
    async def get_active_listings(self, limit: int = 50) -> List[Listing]:
        """Get active listings"""
        collection = await self.get_collection()
        cursor = collection.find({"status": ListingStatus.ACTIVE}).sort([
            ("is_urgent", -1),
            ("created_at", -1)
        ]).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [Listing(**doc) for doc in docs]
    
    async def increment_applications(self, listing_id: str):
        """Increment applications count for a listing"""
        collection = await self.get_collection()
        await collection.update_one(
            {"_id": listing_id},
            {"$inc": {"applications_count": 1}}
        )
    
    async def select_sitter(self, listing_id: str, sitter_id: str):
        """Select a sitter for a listing"""
        collection = await self.get_collection()
        await collection.update_one(
            {"_id": listing_id},
            {
                "$set": {
                    "selected_sitter_id": sitter_id,
                    "status": ListingStatus.COMPLETED
                }
            }
        )
    
    async def update_status(self, listing_id: str, status: ListingStatus):
        """Update listing status"""
        collection = await self.get_collection()
        await collection.update_one(
            {"_id": listing_id},
            {"$set": {"status": status}}
        )
    
    async def expire_old_listings(self, days_old: int = 30):
        """Mark old listings as expired"""
        collection = await self.get_collection()
        cutoff_date = datetime.utcnow().replace(
            hour=0, minute=0, second=0, microsecond=0
        ) - timedelta(days=days_old)
        
        await collection.update_many(
            {
                "status": ListingStatus.ACTIVE,
                "created_at": {"$lt": cutoff_date}
            },
            {"$set": {"status": "expired"}}
        )
    



listing = CRUDListing()
