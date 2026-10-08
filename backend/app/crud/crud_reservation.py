from typing import Any, Dict, List, Optional
from datetime import datetime
from bson import ObjectId
from app.crud.base import CRUDBase
from app.models.reservation import (
    Reservation,
    ReservationCreate,
    ReservationUpdate,
    ReservationStatus,
    PaymentStatus,
    CareUpdate,
    CareUpdateCreate,
    CareUpdateComment,
    CareCommentCreate
)
from app.models.auth import UserRole


class CRUDReservation(CRUDBase[Reservation, ReservationCreate, ReservationUpdate]):
    async def get_by_owner_id(self, owner_id: str) -> List[Reservation]:
        """Get all reservations for an owner"""
        collection = await self.get_collection()
        cursor = collection.find({"owner_id": owner_id}).sort("created_at", -1)
        docs = await cursor.to_list(length=100)
        return [Reservation(**doc) for doc in docs]
    
    async def get_by_sitter_id(self, sitter_id: str) -> List[Reservation]:
        """Get all reservations for a sitter"""
        collection = await self.get_collection()
        cursor = collection.find({"sitter_id": sitter_id}).sort("created_at", -1)
        docs = await cursor.to_list(length=100)
        return [Reservation(**doc) for doc in docs]
    
    async def get_by_sitter_email(self, sitter_email: str) -> List[Reservation]:
        """Get all reservations for a sitter by email"""
        collection = await self.get_collection()
        cursor = collection.find({"sitter_email": sitter_email}).sort("created_at", -1)
        docs = await cursor.to_list(length=100)
        return [Reservation(**doc) for doc in docs]
    
    async def get_by_sitter_profile_id(self, sitter_profile_id: str) -> List[Reservation]:
        """Get all reservations for a sitter by profile ID"""
        collection = await self.get_collection()
        cursor = collection.find({"sitter_profile_id": sitter_profile_id}).sort("created_at", -1)
        docs = await cursor.to_list(length=100)
        return [Reservation(**doc) for doc in docs]
    
    async def get_active_reservations(self, user_id: str) -> List[Reservation]:
        """Get active reservations for a user (as owner or sitter)"""
        collection = await self.get_collection()
        active_statuses = [
            ReservationStatus.CONFIRMED,
            ReservationStatus.IN_PROGRESS
        ]
        
        cursor = collection.find({
            "$or": [
                {"owner_id": user_id},
                {"sitter_id": user_id}
            ],
            "status": {"$in": active_statuses}
        }).sort("start_date", 1)
        
        docs = await cursor.to_list(length=50)
        return [Reservation(**doc) for doc in docs]
    
    async def confirm_reservation(self, reservation_id: str) -> Optional[Reservation]:
        """Confirm a reservation (legacy method - reservations now start as confirmed)"""
        # Since reservations now start as confirmed, this method is kept for backward compatibility
        # but just returns the reservation if it's already confirmed
        reservation = await self.get(reservation_id)
        if reservation and reservation.status == ReservationStatus.CONFIRMED:
            return reservation
        # If somehow not confirmed, update it
        if reservation:
            collection = await self.get_collection()
            result = await collection.update_one(
                {"_id": ObjectId(reservation_id)},
                {
                    "$set": {
                        "status": ReservationStatus.CONFIRMED,
                        "confirmed_at": datetime.utcnow()
                    }
                }
            )
            if result.modified_count > 0:
                return await self.get(reservation_id)
        return None

    async def add_care_update_comment(
        self,
        reservation_id: str,
        care_update_id: str,
        user_id: str,
        role: UserRole,
        comment: CareCommentCreate
    ) -> Optional[Reservation]:
        """Add a comment to a specific care update"""
        collection = await self.get_collection()
        try:
            user_object_id = ObjectId(user_id)
        except Exception:
            user_object_id = ObjectId(str(user_id))

        comment_doc = CareUpdateComment(
            user_id=user_object_id,
            role=role,
            message=comment.message
        )

        result = await collection.update_one(
            {
                "_id": ObjectId(reservation_id),
                "care_updates.id": care_update_id
            },
            {
                "$push": {"care_updates.$.comments": comment_doc.model_dump()},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

        if result.modified_count > 0:
            return await self.get(reservation_id)
        return None

    async def update_care_checklist(
        self,
        reservation_id: str,
        checklist: List[str],
        templates: Optional[List[Dict[str, Any]]] = None,
        schedule: Optional[List[Dict[str, Any]]] = None
    ) -> Optional[Reservation]:
        """Update the shared care checklist for a reservation"""
        collection = await self.get_collection()
        update_data: Dict[str, Any] = {
            "care_checklist": checklist,
            "updated_at": datetime.utcnow()
        }

        if templates is not None:
            update_data["care_task_templates"] = templates
        if schedule is not None:
            update_data["care_task_schedule"] = schedule

        result = await collection.update_one(
            {"_id": ObjectId(reservation_id)},
            {"$set": update_data}
        )
        if result.modified_count > 0:
            return await self.get(reservation_id)
        return None
    
    async def start_care(self, reservation_id: str) -> Optional[Reservation]:
        """Start care period - sets status to IN_PROGRESS and started_at timestamp"""
        collection = await self.get_collection()
        
        # First check if reservation exists and get its current status
        reservation = await self.get(reservation_id)
        if not reservation:
            print(f"[start_care] Reservation {reservation_id} not found")
            return None
        
        # Don't allow starting if already completed or cancelled
        if reservation.status == ReservationStatus.COMPLETED:
            print(f"[start_care] Reservation {reservation_id} is already completed")
            return None
        if reservation.status == ReservationStatus.CANCELLED:
            print(f"[start_care] Reservation {reservation_id} is cancelled")
            return None
        
        # If already in_progress and has started_at, don't allow starting again
        if reservation.status == ReservationStatus.IN_PROGRESS and reservation.started_at:
            print(f"[start_care] Reservation {reservation_id} is already in progress with started_at={reservation.started_at}")
            return None
        
        # Update to IN_PROGRESS and set started_at
        # Allow any status (None, confirmed, or in_progress without started_at)
        now = datetime.utcnow()
        result = await collection.update_one(
            {"_id": ObjectId(reservation_id)},
            {
                "$set": {
                    "status": ReservationStatus.IN_PROGRESS,
                    "started_at": now,
                    "updated_at": now
                }
            }
        )
        
        print(f"[start_care] Update result for {reservation_id}: matched={result.matched_count}, modified={result.modified_count}")
        
        if result.modified_count > 0:
            updated = await self.get(reservation_id)
            if updated:
                print(f"[start_care] Successfully started care for {reservation_id}, started_at={updated.started_at}")
            return updated
        else:
            print(f"[start_care] Failed to update reservation {reservation_id} (matched={result.matched_count}, modified={result.modified_count})")
        return None
    
    async def complete_reservation(self, reservation_id: str) -> Optional[Reservation]:
        """Complete a reservation - requires started_at to exist"""
        collection = await self.get_collection()
        
        # First check if reservation exists and has been started
        reservation = await self.get(reservation_id)
        if not reservation:
            print(f"[complete_reservation] Reservation {reservation_id} not found")
            return None
        
        # Must have started_at to complete
        if not reservation.started_at:
            print(f"[complete_reservation] Reservation {reservation_id} has not been started yet")
            return None
        
        # Don't allow completing if already completed
        if reservation.status == ReservationStatus.COMPLETED:
            print(f"[complete_reservation] Reservation {reservation_id} is already completed")
            return None
        
        # Allow completing if status is IN_PROGRESS or None (as long as started_at exists)
        now = datetime.utcnow()
        query_filter = {"_id": ObjectId(reservation_id)}
        
        # Try with IN_PROGRESS status first
        result = await collection.update_one(
            {
                "_id": ObjectId(reservation_id),
                "status": ReservationStatus.IN_PROGRESS
            },
            {
                "$set": {
                    "status": ReservationStatus.COMPLETED,
                    "completed_at": now,
                    "updated_at": now
                }
            }
        )
        
        # If no match, try without status filter (for None status)
        if result.modified_count == 0:
            result = await collection.update_one(
                {"_id": ObjectId(reservation_id)},
                {
                    "$set": {
                        "status": ReservationStatus.COMPLETED,
                        "completed_at": now,
                        "updated_at": now
                    }
                }
            )
        
        print(f"[complete_reservation] Update result for {reservation_id}: matched={result.matched_count}, modified={result.modified_count}")
        
        if result.modified_count > 0:
            updated = await self.get(reservation_id)
            if updated:
                print(f"[complete_reservation] Successfully completed reservation {reservation_id}, completed_at={updated.completed_at}")
            return updated
        else:
            print(f"[complete_reservation] Failed to complete reservation {reservation_id}")
        return None
    
    async def cancel_reservation(self, reservation_id: str, reason: str = None) -> Optional[Reservation]:
        """Cancel a reservation"""
        collection = await self.get_collection()
        update_data = {
            "status": ReservationStatus.CANCELLED,
            "updated_at": datetime.utcnow()
        }
        
        if reason:
            update_data["cancellation_reason"] = reason
        
        result = await collection.update_one(
            {"_id": ObjectId(reservation_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get(reservation_id)
        return None
    
    async def add_care_update(self, reservation_id: str, care_update: CareUpdateCreate) -> Optional[Reservation]:
        """Add a care update to a reservation"""
        collection = await self.get_collection()
        base64_photos = []
        for p in care_update.photos or []:
            if isinstance(p, str) and p.strip().startswith("data:image"):
                base64_photos.append(p)

        care_update_doc = CareUpdate(
            date=datetime.utcnow(),
            photos=base64_photos,
            notes=care_update.notes,
            care_actions=care_update.care_actions,
            timestamp_verified=True,
            tasks_completed=care_update.tasks_completed or []
        )
        
        result = await collection.update_one(
            {"_id": ObjectId(reservation_id)},
            {
                "$push": {"care_updates": care_update_doc.model_dump()},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count > 0:
            return await self.get(reservation_id)
        return None
    
    async def update_payment_status(self, reservation_id: str, status: PaymentStatus):
        """Update payment status"""
        collection = await self.get_collection()
        await collection.update_one(
            {"_id": ObjectId(reservation_id)},
            {"$set": {"payment_status": status}}
        )
    
    async def add_rating(
        self, 
        reservation_id: str, 
        is_owner_rating: bool, 
        rating: int, 
        review: str = None
    ) -> Optional[Reservation]:
        """Add rating and review to completed reservation"""
        collection = await self.get_collection()
        
        # First check if reservation exists and has completed_at
        reservation = await self.get(reservation_id)
        if not reservation:
            print(f"[add_rating] Reservation {reservation_id} not found")
            return None
        
        if not reservation.completed_at:
            print(f"[add_rating] Reservation {reservation_id} has not been completed yet")
            return None
        
        if is_owner_rating:
            update_data = {
                "owner_rating": rating,
                "owner_review": review,
                "updated_at": datetime.utcnow()
            }
        else:
            update_data = {
                "sitter_rating": rating,
                "sitter_review": review,
                "updated_at": datetime.utcnow()
            }
        
        # Update reservation (allow status to be COMPLETED or None, as long as completed_at exists)
        # Try with COMPLETED status first
        result = await collection.update_one(
            {
                "_id": ObjectId(reservation_id),
                "status": ReservationStatus.COMPLETED
            },
            {"$set": update_data}
        )
        
        # If no match, try without status filter (for None status but with completed_at)
        if result.modified_count == 0:
            result = await collection.update_one(
                {"_id": ObjectId(reservation_id)},
                {"$set": update_data}
            )
        
        print(f"[add_rating] Update result for {reservation_id}: matched={result.matched_count}, modified={result.modified_count}")
        
        if result.modified_count > 0:
            updated = await self.get(reservation_id)
            if updated:
                print(f"[add_rating] Successfully added rating for {reservation_id}")
            return updated
        else:
            print(f"[add_rating] Failed to add rating for {reservation_id}")
        return None


reservation = CRUDReservation(Reservation, "reservations")
