# Nearby Sitters API Feature

## Overview

The Nearby Sitters API provides location-based sitter recommendations, allowing users to find plant sitters sorted by proximity to their address. This feature uses an offline pre-computed coordinate database for Baltimore/JHU area addresses to calculate distances efficiently without external API dependencies.

## New Endpoint

### `GET /api/v1/sitters/nearby`

Returns paginated list of sitters sorted by distance from user location.

**Query Parameters:**
- `user_address` (required): Full user address for distance calculation
- `page` (optional): Page number, starts from 1 (default: 1)
- `page_size` (optional): Number of sitters per page, 1-10 (default: 10, maximum: 10)
- `max_distance_miles` (optional): Maximum search radius in miles, 1-100 (default: 25)
- `available_only` (optional): Show only available sitters (default: true)

**Example Request:**
```
GET /api/v1/sitters/nearby?user_address=3400 N Charles St, Baltimore, MD 21218&page=1&page_size=10
```

**Response Format:**
```json
{
  "sitters": [
    {
      "sitter": {
        "id": "...",
        "name": "Emma Rodriguez",
        "address": {
          "address_1": "3400 N Charles St",
          "city": "Baltimore",
          "state": "MD",
          "zipcode": "21218"
        },
        "experience_level": "intermediate",
        "price_per_visit": 18.0,
        "specialties": ["tropical plants", "succulents"],
        "rating": 4.8,
        "is_available": true
      },
      "distance_miles": 0.2,
      "available_time_slots": [
        "2025-10-07 morning (9AM-12PM)",
        "2025-10-07 afternoon (1PM-5PM)",
        "2025-10-08 morning (9AM-12PM)",
        "2025-10-15 evening (6PM-8PM)",
        "Extended availability: 2025-10-20 to 2025-11-15"
      ]
    }
  ],
  "total_count": 15,
  "page": 1,
  "page_size": 10,
  "total_pages": 2,
  "has_next": true,
  "has_previous": false
}
```

## Model Updates

### Address Model
New `Address` model with standardized format:
```python
class Address(BaseModel):
    address_1: str          # Street address line 1
    address_2: Optional[str] # Apartment, suite, etc.
    city: str               # City name  
    state: str              # State abbreviation (MD, CA, etc.)
    zipcode: str            # ZIP code
```

### SitterProfile Updates
- Added `address: Address` field
- Added `service_radius_miles: float` field  
- Added `experience_level: str` field ("beginner", "intermediate", "expert")

## Test Data Generation

### Generate 15 Test Sitters
```bash
cd backend
python3 scripts/generate_test_sitters.py
```

This creates 15 realistic sitters with Baltimore/JHU area addresses for testing.

### Test the API
```bash
cd backend/testing/scripts
./test_nearby_sitters_api.sh
```

## Technical Implementation

### Geocoding Service
- Uses offline pre-computed coordinate database for Baltimore/JHU area addresses
- Implements multi-level address matching (exact → partial → postal code → street name)
- Implements Haversine formula for distance calculation
- Handles errors gracefully with fallback to Baltimore downtown coordinates
- Zero external API dependencies, no rate limits, millisecond-level performance

### Key Features
1. **Distance Calculation**: Accurate great-circle distance using coordinates
2. **Concurrent Processing**: Parallel geocoding for better performance  
3. **Controlled Pagination**: Maximum 10 sitters per page for optimal performance
4. **Error Handling**: Graceful handling of geocoding failures
5. **Extended Availability**: Supports long-term booking (30+ days in advance)
6. **Smart Time Slots**: Uses availability calendar when available, fallback to general availability

### Performance Considerations
- Offline database provides instant geocoding (no network latency)
- Distance calculations are done in-memory after geocoding
- Concurrent processing using asyncio.gather() for parallel distance calculations
- Pagination prevents large response payloads
- No rate limits or external API dependencies

## Example Usage Scenarios

### Basic Nearby Search
```bash
curl "http://localhost:8000/api/v1/sitters/nearby?user_address=3400 N Charles St, Baltimore, MD 21218"
```

### Search with Distance Limit  
```bash
curl "http://localhost:8000/api/v1/sitters/nearby?user_address=3400 N Charles St, Baltimore, MD 21218&max_distance_miles=10"
```

### Paginated Results (Max 10 per page)
```bash
curl "http://localhost:8000/api/v1/sitters/nearby?user_address=3400 N Charles St, Baltimore, MD 21218&page=2&page_size=10"
```

### Include Unavailable Sitters
```bash  
curl "http://localhost:8000/api/v1/sitters/nearby?user_address=3400 N Charles St, Baltimore, MD 21218&available_only=false"
```

## Integration with Frontend

The frontend can use this API to:
1. Show sitters on a map sorted by distance (max 10 per page)
2. Implement "Show More" pagination for long lists (controlled page size)
3. Filter by distance radius with a slider
4. Display estimated travel time/distance for each sitter
5. Show extended availability for advance booking (up to 30+ days)
6. Display both specific time slots and general availability periods

## Future Enhancements

1. **Caching**: Cache geocoding results to improve performance
2. **Real-time Availability**: Integration with calendar systems  
3. **Travel Time**: Use routing APIs for actual travel time estimates
4. **Batch Geocoding**: Process multiple addresses efficiently
5. **Location Preferences**: Save user locations for faster searches