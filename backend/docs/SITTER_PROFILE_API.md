# Sitter Profile Management API

## Overview
This document describes the API for managing sitter profiles, including viewing and updating profile information.

## Data Model

### Sitter Profile Schema

```python
from pydantic import BaseModel
from typing import List, Optional

class SitterProfileUpdate(BaseModel):
    """Schema for updating sitter profile"""
    name: str
    email: str
    phone: str
    bio: str
    tagline: str
    price_per_visit: float
    price_per_day: float
    price_per_week: float
    service_areas: List[str]
    specialties: List[str]
    years_experience: int

class SitterProfileResponse(BaseModel):
    """Complete sitter profile response"""
    id: str
    user_id: str
    name: str
    email: str
    phone: str
    bio: str
    tagline: str
    price_per_visit: float
    price_per_day: float
    price_per_week: float
    service_areas: List[str]
    specialties: List[str]
    years_experience: int
    rating: float
    total_reviews: int
    is_verified: bool
    profile_image: Optional[str]
    created_at: str
    updated_at: str
```

## API Endpoints

### 1. Get Current Sitter's Profile
```
GET /api/v1/sitters/me/profile
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "sitter_123",
  "user_id": "user_456",
  "name": "John Smith",
  "email": "john.smith@jhu.edu",
  "phone": "(410) 123-4567",
  "bio": "Passionate about plant care with 5+ years of experience...",
  "tagline": "Experienced Plant Care Specialist",
  "price_per_visit": 25.00,
  "price_per_day": 15.00,
  "price_per_week": 80.00,
  "service_areas": ["Charles Village", "Homewood", "Roland Park"],
  "specialties": ["Indoor Plants", "Succulents", "Herbs"],
  "years_experience": 5,
  "rating": 4.8,
  "total_reviews": 24,
  "is_verified": true,
  "profile_image": "https://...",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-10-12T00:00:00Z"
}
```

### 2. Update Sitter Profile
```
PUT /api/v1/sitters/me/profile
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "john.smith@jhu.edu",
  "phone": "(410) 123-4567",
  "bio": "Updated bio text...",
  "tagline": "Experienced Plant Care Specialist",
  "price_per_visit": 30.00,
  "price_per_day": 20.00,
  "price_per_week": 100.00,
  "service_areas": ["Charles Village", "Homewood"],
  "specialties": ["Indoor Plants", "Succulents"],
  "years_experience": 6
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "sitter_123",
    "user_id": "user_456",
    // ... full profile object
  }
}
```

### 3. Get Sitter Profile by ID (Public)
```
GET /api/v1/sitters/{sitter_id}/profile
```

**Response:**
Same as endpoint #1, but publicly accessible.

## Frontend Integration

### Profile.tsx Integration

Current implementation uses `localStorage` for persistence. To integrate with backend:

```typescript
// 1. Fetch profile on component mount
useEffect(() => {
  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/v1/sitters/me/profile', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };
  
  fetchProfile();
}, []);

// 2. Save profile changes
const handleSave = async () => {
  try {
    const response = await fetch('/api/v1/sitters/me/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(editForm)
    });
    
    if (response.ok) {
      const data = await response.json();
      setProfile(data.data);
      setIsEditing(false);
      alert('Profile updated successfully!');
    }
  } catch (error) {
    console.error('Failed to save profile:', error);
    alert('Failed to save profile. Please try again.');
  }
};
```

## Compatibility with Registration Flow

### Registration Flow (from SitterRegister.tsx)

The registration process collects:
1. **Step 1**: Name, Email, Phone, Bio
2. **Step 2**: Address, Service Areas
3. **Step 3**: Experience, Specialties
4. **Step 4**: Pricing, Availability

### Profile Page Fields

The profile page manages the same data structure, ensuring compatibility:

**Matching Fields:**
- ✅ Name (Step 1)
- ✅ Email (Step 1)
- ✅ Phone (Step 1)
- ✅ Bio (Step 1)
- ✅ Tagline (derived from bio or separate field)
- ✅ Service Areas (Step 2)
- ✅ Specialties (Step 3)
- ✅ Years Experience (Step 3)
- ✅ Pricing (Step 4)
  - price_per_visit
  - price_per_day
  - price_per_week

### Data Flow

```
Registration (POST /sitters/register)
    ↓
Create Sitter Profile in DB
    ↓
Sitter can view at /sitter/profile
    ↓
Sitter can edit (PUT /sitters/me/profile)
    ↓
Updated profile saved to DB
```

## Backend Implementation Steps

### 1. Update Sitter Model (`app/models/sitter.py`)

```python
from sqlalchemy import Column, String, Float, Integer, JSON
from app.db.base_class import Base

class Sitter(Base):
    __tablename__ = "sitters"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String)
    bio = Column(String)
    tagline = Column(String)
    price_per_visit = Column(Float, default=25.0)
    price_per_day = Column(Float, default=15.0)
    price_per_week = Column(Float, default=80.0)
    service_areas = Column(JSON, default=list)  # Store as JSON array
    specialties = Column(JSON, default=list)    # Store as JSON array
    years_experience = Column(Integer, default=0)
    # ... other fields
```

### 2. Create CRUD Operations (`app/crud/crud_sitter.py`)

```python
from typing import Optional
from app.models.sitter import Sitter
from app.schemas.sitter import SitterProfileUpdate

class CRUDSitter:
    def get_by_user_id(self, db: Session, user_id: str) -> Optional[Sitter]:
        return db.query(Sitter).filter(Sitter.user_id == user_id).first()
    
    def update_profile(
        self, 
        db: Session, 
        sitter_id: str, 
        update_data: SitterProfileUpdate
    ) -> Sitter:
        sitter = db.query(Sitter).filter(Sitter.id == sitter_id).first()
        if not sitter:
            raise ValueError("Sitter not found")
        
        for field, value in update_data.dict(exclude_unset=True).items():
            setattr(sitter, field, value)
        
        db.commit()
        db.refresh(sitter)
        return sitter

sitter = CRUDSitter()
```

### 3. Create API Endpoints (`app/api/v1/endpoints/sitter_profile.py`)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import sitter
from app.schemas.sitter import SitterProfileUpdate, SitterProfileResponse

router = APIRouter()

@router.get("/me/profile", response_model=SitterProfileResponse)
def get_my_profile(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Get current sitter's profile"""
    sitter_profile = sitter.get_by_user_id(db, user_id=current_user.id)
    if not sitter_profile:
        raise HTTPException(404, "Sitter profile not found")
    return sitter_profile

@router.put("/me/profile", response_model=SitterProfileResponse)
def update_my_profile(
    update_data: SitterProfileUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Update current sitter's profile"""
    sitter_profile = sitter.get_by_user_id(db, user_id=current_user.id)
    if not sitter_profile:
        raise HTTPException(404, "Sitter profile not found")
    
    updated = sitter.update_profile(db, sitter_id=sitter_profile.id, update_data=update_data)
    return updated
```

### 4. Register Routes

In `app/api/v1/api.py`:

```python
from app.api.v1.endpoints import sitter_profile

api_router.include_router(
    sitter_profile.router,
    prefix="/sitters",
    tags=["sitter-profile"]
)
```

## Testing

### Manual Testing with cURL

```bash
# Get profile
curl -X GET http://localhost:8000/api/v1/sitters/me/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update profile
curl -X PUT http://localhost:8000/api/v1/sitters/me/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "john.smith@jhu.edu",
    "phone": "(410) 123-4567",
    "bio": "Updated bio",
    "tagline": "Plant Care Expert",
    "price_per_visit": 30.0,
    "price_per_day": 20.0,
    "price_per_week": 100.0,
    "service_areas": ["Charles Village"],
    "specialties": ["Indoor Plants"],
    "years_experience": 5
  }'
```

## Notes

- Current frontend uses localStorage for demo purposes
- Profile data structure matches registration flow
- All pricing fields are stored as floats
- Service areas and specialties stored as JSON arrays
- Frontend ready for backend integration (just uncomment API calls)
- Authentication required for profile endpoints

