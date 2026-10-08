from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date, time


class TimeSlot(BaseModel):
    """Time slot model"""
    id: Optional[str] = None
    start_time: str  # Format: "HH:MM" (e.g., "09:00")
    end_time: str    # Format: "HH:MM" (e.g., "17:00")


class DaySchedule(BaseModel):
    """Day schedule with time slots"""
    day: str  # e.g., "Monday", "Tuesday", etc.
    time_slots: List[TimeSlot] = []


class RecurringSchedule(BaseModel):
    """Recurring weekly schedule"""
    id: Optional[str] = None
    sitter_id: str
    day_schedules: List[DaySchedule] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DateRangeAvailability(BaseModel):
    """Specific date range availability"""
    id: Optional[str] = None
    sitter_id: str
    start_date: str  # Format: "YYYY-MM-DD"
    end_date: str    # Format: "YYYY-MM-DD"
    time_slots: List[TimeSlot] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RecurringScheduleCreate(BaseModel):
    """Create recurring schedule request"""
    day_schedules: List[DaySchedule]


class DateRangeAvailabilityCreate(BaseModel):
    """Create date range availability request"""
    start_date: str
    end_date: str
    time_slots: List[TimeSlot]


class AvailabilityResponse(BaseModel):
    """Response with all availability data"""
    recurring_schedules: List[RecurringSchedule] = []
    date_ranges: List[DateRangeAvailability] = []

