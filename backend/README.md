# JHU Plant Care Platform - Backend API

FastAPI backend for the JHU Plant Care Community Platform.

## Features

- **FastAPI** with automatic OpenAPI documentation
- **MongoDB** for data storage
- **Production-Ready Geocoding** - High-precision Baltimore coordinate database
- **Nearby Sitters API** - Distance-based sitter search and sorting  
- **Plant Care Listings** - Create and search plant care requests
- **Sitter Profiles** - Browse and book plant sitters
- **Reservations** - Complete booking workflow
- **Stub Authentication** (JHU SSO integration ready)
- **Payment Integration** (Stripe stub ready)
- **File Uploads** (S3 stub ready)

## Getting Started

### Prerequisites

- Python 3.9+
- MongoDB (local or cloud)
- Node.js (for frontend)

### Installation

1. **Clone and navigate to backend**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB connection string
   ```

5. **Start MongoDB** (if local)
   ```bash
   mongod
   ```

6. **Run the API server**
   ```bash
   python run.py
   ```

The API will be available at `http://localhost:8000`

### API Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/api/v1/openapi.json`

## API Endpoints

### Authentication (Stub)
- `POST /api/v1/auth/login` - Login (returns fake token)
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/auth/users/{user_id}` - Get user profile

### Sitters
- `GET /api/v1/sitters/` - Search sitters
- `GET /api/v1/sitters/nearby` - **Find nearby sitters with distance sorting**
- `GET /api/v1/sitters/{sitter_id}` - Get sitter details
- `GET /api/v1/sitters/{sitter_id}/availability` - Get availability
- Run `python scripts/generate_test_sitters.py` to create 15 test sitters

### Listings
- `GET /api/v1/listings/` - Search plant care listings
- `POST /api/v1/listings/` - Create new listing
- `GET /api/v1/listings/{listing_id}` - Get listing details
- `PUT /api/v1/listings/{listing_id}` - Update listing
- `POST /api/v1/listings/sample-data` - Create sample data

### Reservations
- `POST /api/v1/reservations/` - Create reservation
- `GET /api/v1/reservations/{reservation_id}` - Get details
- `GET /api/v1/reservations/me/reservations` - My reservations
- `POST /api/v1/reservations/{id}/confirm` - Confirm booking
- `POST /api/v1/reservations/{id}/complete` - Mark complete
- `POST /api/v1/reservations/{id}/care-updates` - Add care update

### Payments (Stub)
- `POST /api/v1/payments/` - Create payment intent
- `POST /api/v1/payments/reservations/{id}/capture` - Capture payment

### Uploads (Stub)
- `POST /api/v1/uploads/signed` - Get signed upload URL
- `POST /api/v1/uploads/direct` - Direct file upload

## Development

### Create Sample Data

#### Option 1: API Endpoints (Simple Sample Data)
```bash
# Create sample sitters
cd backend && python scripts/generate_test_sitters.py

# Create sample listings
curl -X POST "http://localhost:8000/api/v1/listings/sample-data"
```

#### Option 2: Test Data Script (Realistic Sitter Data)
For testing the nearby sitters functionality with realistic Baltimore/JHU addresses:

```bash
# Activate virtual environment
source venv/bin/activate

# Generate 15 test sitters with realistic Baltimore addresses
PYTHONPATH=. python3 scripts/generate_test_sitters.py
```

This script will:
- Clear any existing test sitters
- Create 15 sitters with realistic Baltimore/JHU area addresses
- Include various experience levels and specialties
- Enable testing of the nearby sitters API with geographical distance sorting

**Test the nearby sitters API:**
```bash
# Example: Find sitters near JHU Homewood Campus
curl "http://localhost:8000/api/v1/sitters/nearby?user_address=3400 N Charles St, Baltimore, MD 21218&limit=5"
```

### Database Schema

The application uses MongoDB with the following collections:
- `users` - User profiles and authentication
- `sitters` - Plant sitter profiles and availability
- `listings` - Plant care job listings
- `reservations` - Bookings and care tracking

### Authentication

Currently using stub authentication for development. The system is designed to integrate with JHU SSO in production.

## 🌟 Nearby Sitters API Usage

The nearby sitters API provides production-ready geocoding with high-precision Baltimore coordinates:

### Basic Usage
```bash
# Find sitters near JHU campus
curl "http://localhost:8000/api/v1/sitters/nearby?user_address=Johns%20Hopkins%20University"

# Find sitters within 2 miles
curl "http://localhost:8000/api/v1/sitters/nearby?user_address=21218&max_distance_miles=2"

# Paginated results
curl "http://localhost:8000/api/v1/sitters/nearby?user_address=3400%20N%20Charles%20St&page_size=5"
```

### Supported Address Formats
- **University Names**: "Johns Hopkins University", "JHU"
- **ZIP Codes**: "21218", "21211", "21287"
- **Street Addresses**: "3400 N Charles St", "600 N Wolfe St"
- **Neighborhoods**: "Charles Village", "Hampden", "Fell's Point"

### Features
- **High-Precision Coordinates**: 50+ Baltimore locations with exact coordinates
- **Distance Sorting**: Results sorted by distance (nearest first)
- **Intelligent Fallback**: Invalid addresses default to Baltimore center
- **Zero External Dependencies**: No API keys or external services required
- **Sub-millisecond Response**: Local coordinate database for instant results

## Deployment

For production deployment:

1. Set up MongoDB Atlas or managed MongoDB
2. Configure environment variables
3. Set up JHU SSO integration
4. Configure Stripe for payments
5. Set up S3 for file storage
6. Deploy to cloud platform (AWS, GCP, Azure)

## Contributing

1. Create feature branch
2. Make changes with tests
3. Submit pull request
4. Ensure all tests pass

## License

Private - JHU Plant Care Community Platform
