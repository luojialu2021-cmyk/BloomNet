# Sitter Availability API Documentation

## Overview
This document describes the availability system for sitters, which allows them to set their available time slots for plant care services. The system supports both recurring weekly schedules and specific date ranges.

## Data Model

### Availability Schema

```python
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, time

class TimeSlot(BaseModel):
    """Represents a time slot within a day"""
    start_time: time  # e.g., 09:00
    end_time: time    # e.g., 17:00

class DaySchedule(BaseModel):
    """Represents time slots for a specific day"""
    day: str  # e.g., 'Monday'
    time_slots: List[TimeSlot]

class RecurringSchedule(BaseModel):
    """Represents a recurring weekly schedule"""
    id: Optional[str] = None
    sitter_id: str
    day_schedules: List[DaySchedule]  # Each day has its own time slots
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class DateRangeAvailability(BaseModel):
    """Represents availability for a specific date range"""
    id: Optional[str] = None
    sitter_id: str
    start_date: date
    end_date: date
    time_slots: List[TimeSlot]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class AvailabilityData(BaseModel):
    """Complete availability data for a sitter"""
    sitter_id: str
    recurring: List[RecurringSchedule]
    date_ranges: List[DateRangeAvailability]
```

## MongoDB Collections

### `sitter_recurring_schedules` Collection
```json
{
  "_id": "ObjectId",
  "sitter_id": "string",
  "day_schedules": [
    {
      "day": "Monday",
      "time_slots": [
        {
          "start_time": "09:00:00",
          "end_time": "15:00:00"
        }
      ]
    },
    {
      "day": "Tuesday",
      "time_slots": [
        {
          "start_time": "15:00:00",
          "end_time": "19:00:00"
        }
      ]
    }
  ],
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

### `sitter_date_range_availability` Collection
```json
{
  "_id": "ObjectId",
  "sitter_id": "string",
  "start_date": "2024-01-10",
  "end_date": "2024-01-15",
  "time_slots": [
    {
      "start_time": "10:00:00",
      "end_time": "16:00:00"
    }
  ],
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

## API Endpoints

### 1. Save/Update Sitter Availability
```
POST /api/v1/sitters/availability
```

**Request Body:**
```json
{
  "recurring": [
    {
      "day_schedules": [
        {
          "day": "Monday",
          "time_slots": [
            {
              "start_time": "09:00",
              "end_time": "15:00"
            }
          ]
        },
        {
          "day": "Tuesday",
          "time_slots": [
            {
              "start_time": "15:00",
              "end_time": "19:00"
            }
          ]
        }
      ]
    }
  ],
  "date_ranges": [
    {
      "start_date": "2024-01-10",
      "end_date": "2024-01-15",
      "time_slots": [
        {
          "start_time": "10:00",
          "end_time": "16:00"
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Availability saved successfully",
  "data": {
    "sitter_id": "sitter123",
    "recurring_count": 1,
    "date_range_count": 1
  }
}
```

### 2. Get Sitter Availability
```
GET /api/v1/sitters/{sitter_id}/availability
```

**Response:**
```json
{
  "sitter_id": "sitter123",
  "recurring": [...],
  "date_ranges": [...]
}
```

### 3. Check Sitter Availability for Specific Date/Time
```
POST /api/v1/sitters/{sitter_id}/check-availability
```

**Request Body:**
```json
{
  "date": "2024-01-15",
  "start_time": "10:00",
  "end_time": "14:00"
}
```

**Response:**
```json
{
  "available": true,
  "matching_slots": [
    {
      "type": "recurring",
      "days": ["Monday"],
      "time_slot": {
        "start_time": "09:00",
        "end_time": "17:00"
      }
    }
  ]
}
```

### 4. Find Available Sitters (for User Portal)
```
POST /api/v1/sitters/nearby-available
```

**Request Body:**
```json
{
  "zip_code": "21218",
  "start_date": "2024-01-15",
  "end_date": "2024-01-20",
  "required_time_slots": [
    {
      "start_time": "10:00",
      "end_time": "14:00"
    }
  ],
  "max_distance_miles": 5
}
```

**Response:**
```json
{
  "sitters": [
    {
      "id": "sitter123",
      "name": "John Doe",
      "distance_miles": 2.3,
      "rating": 4.8,
      "availability_match": {
        "all_dates_available": true,
        "available_dates": ["2024-01-15", "2024-01-16", ...],
        "matching_time_slots": [...]
      }
    }
  ],
  "total_found": 5
}
```

## Matching Algorithm Logic

### For User Searching Sitters:

1. **Get user's requirements:**
   - Start date and end date
   - Required time slots per day
   - Location (zip code)

2. **Find nearby sitters** (using existing geocoding)

3. **Check availability for each sitter:**
   ```python
   def is_sitter_available(sitter_id, start_date, end_date, time_slots):
       # Check recurring schedules
       for schedule in get_recurring_schedules(sitter_id):
           if date.weekday() in schedule.days_of_week:
               if any_time_slot_overlaps(schedule.time_slots, time_slots):
                   return True
       
       # Check specific date ranges
       for date_range in get_date_ranges(sitter_id):
           if date_range.start_date <= date <= date_range.end_date:
               if any_time_slot_overlaps(date_range.time_slots, time_slots):
                   return True
       
       return False
   ```

4. **Return only available sitters** sorted by:
   - Distance (closest first)
   - Rating (highest first)
   - Response time

## Implementation Steps

### Backend Tasks:

1. **Create Models** (`app/models/availability.py`)
   - RecurringSchedule model
   - DateRangeAvailability model

2. **Create CRUD Operations** (`app/crud/crud_availability.py`)
   - `create_recurring_schedule()`
   - `create_date_range_availability()`
   - `get_sitter_availability()`
   - `check_availability_for_date()`
   - `delete_recurring_schedule()`
   - `delete_date_range_availability()`

3. **Create API Endpoints** (`app/api/v1/endpoints/availability.py`)
   - POST `/sitters/availability` - Save availability
   - GET `/sitters/{id}/availability` - Get availability
   - POST `/sitters/{id}/check-availability` - Check specific date/time
   - DELETE `/sitters/availability/{id}` - Remove availability

4. **Update Nearby Sitters Endpoint** (`app/api/v1/endpoints/sitters.py`)
   - Modify `GET /sitters/nearby` to include availability filtering
   - Add query parameters: `start_date`, `end_date`, `time_slots`

### Frontend Integration:

1. **Create Service** (`frontend/src/api/services.ts`)
   ```typescript
   export const availabilityService = {
     saveAvailability: async (data: AvailabilityData) => {
       return apiClient.post('/sitters/availability', data);
     },
     getAvailability: async (sitterId: string) => {
       return apiClient.get(`/sitters/${sitterId}/availability`);
     }
   };
   ```

2. **Update Search Results** (`frontend/src/pages/SearchResults.tsx`)
   - Add date range picker
   - Add time slot selector
   - Filter results based on availability

## Example Usage Flow

### Sitter Setting Availability:

1. Sitter goes to `/sitter/availability`
2. Adds recurring schedule:
   - Days: Monday, Wednesday, Friday
   - Time: 9:00 AM - 5:00 PM
3. Adds specific date range:
   - Dates: Dec 20-25, 2024
   - Time: 10:00 AM - 4:00 PM
4. Clicks "Save All Availability"
5. Frontend sends POST to `/api/v1/sitters/availability`

### User Finding Available Sitters:

1. User searches for sitters in 21218
2. Selects dates: Jan 15-20, 2024
3. Selects time: 10:00 AM - 2:00 PM
4. Frontend sends request to `/api/v1/sitters/nearby-available`
5. Backend returns only sitters available during those dates/times
6. Results displayed sorted by distance

## Notes

- All times stored in UTC in database
- Convert to user's timezone for display
- Consider time zone handling for sitters and users
- Add validation: end_time must be after start_time
- Add validation: end_date must be after start_date
- Handle overlapping time slots (merge or warn)
- Consider blocking/unavailable dates feature

