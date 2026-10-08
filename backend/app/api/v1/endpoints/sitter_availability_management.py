from fastapi import APIRouter, HTTPException, Depends, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from bson import ObjectId
from typing import Optional, List

from app.models.sitter_availability import (
    RecurringSchedule, DateRangeAvailability,
    RecurringScheduleCreate, DateRangeAvailabilityCreate,
    AvailabilityResponse
)
from app.api.deps import get_database
from app.core.security import verify_token

router = APIRouter()


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Extract user ID from authorization header"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace('Bearer ', '')
    token_data = verify_token(token)
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return token_data.user_id


@router.post("/availability/recurring", response_model=RecurringSchedule)
async def create_recurring_schedule(
    schedule_data: RecurringScheduleCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create or update recurring schedule"""
    # Delete existing recurring schedules for this sitter
    await db.recurring_schedules.delete_many({"sitter_id": user_id})
    
    # Create new schedule
    new_schedule = RecurringSchedule(
        sitter_id=user_id,
        day_schedules=schedule_data.day_schedules,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    result = await db.recurring_schedules.insert_one(
        new_schedule.model_dump(exclude={'id'})
    )
    
    new_schedule.id = str(result.inserted_id)
    return new_schedule


@router.post("/availability/daterange", response_model=DateRangeAvailability)
async def create_date_range_availability(
    availability_data: DateRangeAvailabilityCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create new date range availability"""
    new_availability = DateRangeAvailability(
        sitter_id=user_id,
        start_date=availability_data.start_date,
        end_date=availability_data.end_date,
        time_slots=availability_data.time_slots,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    result = await db.date_range_availabilities.insert_one(
        new_availability.model_dump(exclude={'id'})
    )
    
    new_availability.id = str(result.inserted_id)
    return new_availability


@router.get("/availability", response_model=AvailabilityResponse)
async def get_sitter_availability(
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all availability for current sitter"""
    # Get recurring schedules
    recurring_cursor = db.recurring_schedules.find({"sitter_id": user_id})
    recurring_schedules = await recurring_cursor.to_list(length=100)
    
    for schedule in recurring_schedules:
        schedule['id'] = str(schedule['_id'])
    
    # Get date range availabilities
    date_range_cursor = db.date_range_availabilities.find({"sitter_id": user_id})
    date_ranges = await date_range_cursor.to_list(length=100)
    
    for dr in date_ranges:
        dr['id'] = str(dr['_id'])
    
    return AvailabilityResponse(
        recurring_schedules=[RecurringSchedule(**s) for s in recurring_schedules],
        date_ranges=[DateRangeAvailability(**dr) for dr in date_ranges]
    )


@router.delete("/availability/recurring/{schedule_id}")
async def delete_recurring_schedule(
    schedule_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a recurring schedule"""
    result = await db.recurring_schedules.delete_one({
        "_id": ObjectId(schedule_id),
        "sitter_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    return {"message": "Schedule deleted successfully"}


@router.delete("/availability/daterange/{availability_id}")
async def delete_date_range_availability(
    availability_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a date range availability"""
    result = await db.date_range_availabilities.delete_one({
        "_id": ObjectId(availability_id),
        "sitter_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Availability not found")
    
    return {"message": "Availability deleted successfully"}

