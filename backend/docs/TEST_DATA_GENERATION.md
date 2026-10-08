# Test Data Generation Guide

## Overview

This guide explains how to generate test data for the JHU Plant Care Platform backend, specifically for testing the nearby sitters functionality with realistic geographical data.

## Prerequisites

1. **MongoDB Running**: Ensure MongoDB is running locally or accessible via connection string
2. **Virtual Environment**: Python virtual environment activated with all dependencies installed
3. **Backend Directory**: Must be in the backend directory when running scripts

## Test Sitters Data Generation

### Script Location
```
backend/scripts/generate_test_sitters.py
```

### What It Does
- Creates 15 realistic plant sitters with Baltimore/JHU area addresses
- Each sitter includes complete profile information:
  - Personal details (name, bio, tagline)
  - Complete address (street, city, state, zipcode)
  - Service details (pricing, service radius, specialties)
  - Experience level (beginner, intermediate, expert)
- Automatically clears existing test data to prevent duplicates
- Validates all data before insertion

### Generated Sitters Overview

The script creates sitters distributed across Baltimore/JHU area including:

| Name | Location | Experience | Specialties | Service Radius |
|------|----------|------------|-------------|----------------|
| Emma Rodriguez | 3400 N Charles St (JHU) | Intermediate | Tropical plants, succulents | 8 miles |
| Marcus Thompson | 2901 N Charles St | Expert | Outdoor plants, herbs | 12 miles |
| Sarah Chen | 100 E 33rd St | Expert | Succulents, cacti | 10 miles |
| David Park | 3901 Keswick Rd | Beginner | Houseplants, low-maintenance | 15 miles |
| Jessica Wang | 600 N Wolfe St (Med Campus) | Intermediate | Medicinal plants, herbs | 20 miles |
| Alex Johnson | 1234 W 36th St (Hampden) | Expert | Plant recovery, pruning | 25 miles |
| Maria Santos | 1600 E North Ave | Intermediate | Orchids, flowering plants | 18 miles |
| Kevin Liu | 3101 St Paul St | Intermediate | Tech-assisted care | 12 miles |
| Ashley Brown | 615 N Wolfe St | Expert | Large houseplants, fiddle leaf figs | 15 miles |
| Ryan Mitchell | 2500 Druid Park Dr | Expert | Exotic plants, greenhouse care | 30 miles |
| Olivia Davis | 900 Fell St (Fells Point) | Intermediate | Herbs, edible plants | 20 miles |
| Daniel Kim | 1 E Chase St (Downtown) | Intermediate | Small spaces, apartment plants | 8 miles |
| Grace Taylor | 3505 N Charles St | Expert | Plant recovery, emergency care | 16 miles |
| Tyler Wilson | 2400 Boston St | Beginner | Weekend care, flexible scheduling | 22 miles |
| Sophia Martinez | 1700 E Lombard St | Expert | Organic care, sustainable methods | 14 miles |

## How to Run

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Activate Virtual Environment
```bash
source venv/bin/activate
```

### Step 3: Run the Test Data Generation Script
```bash
PYTHONPATH=. python3 scripts/generate_test_sitters.py
```

### Expected Output
```
🌱 JHU Plant Care Platform - Test Sitters Data Generator
============================================================
Connecting to MongoDB...
Connected to MongoDB at mongodb://localhost:27017
Clearing existing test data...
Removed 0 existing test sitters
Creating test sitters...
✅ Created sitter: Emma Rodriguez at 3400 N Charles St, Baltimore, MD, 21218
✅ Created sitter: Marcus Thompson at 2901 N Charles St, Baltimore, MD, 21218
[... more sitters ...]
✅ Created sitter: Sophia Martinez at 1700 E Lombard St, Baltimore, MD, 21231

============================================================
📊 SUMMARY:
   Cleared existing: 0
   Successfully created: 15
   Failed: 0
   Total test sitters: 15

✅ Test data generation completed successfully!
You can now test the nearby sitters API with:
GET /api/v1/sitters/nearby?user_address=3400 N Charles St, Baltimore, MD 21218
Disconnected from MongoDB
```

## Testing the Generated Data

### Test Nearby Sitters API
After generating test data, you can test the nearby sitters functionality:

```bash
# Find sitters near JHU Homewood Campus
curl "http://localhost:8000/api/v1/sitters/nearby?user_address=3400 N Charles St, Baltimore, MD 21218&limit=5"

# Find sitters near Downtown Baltimore
curl "http://localhost:8000/api/v1/sitters/nearby?user_address=100 Light St, Baltimore, MD 21202&limit=5"
```

### Run Comprehensive Tests
```bash
cd testing
./scripts/test_nearby_sitters_api.sh
```

## Troubleshooting

### Common Issues

1. **Module Not Found Error**
   ```
   ModuleNotFoundError: No module named 'app'
   ```
   **Solution**: Ensure you're in the backend directory and using `PYTHONPATH=.`

2. **MongoDB Connection Error**
   ```
   pymongo.errors.ServerSelectionTimeoutError
   ```
   **Solution**: Start MongoDB service or check connection string

3. **Invalid ObjectId Error**
   ```
   'xyz' is not a valid ObjectId
   ```
   **Solution**: The script handles this automatically with valid 24-character ObjectIds

4. **Permission Denied**
   ```
   PermissionError: [Errno 13] Permission denied
   ```
   **Solution**: Ensure virtual environment is activated and dependencies are installed

### Verification Steps

1. **Check Database**: Verify sitters were created
   ```bash
   mongosh
   use plant_care_platform
   db.sitters.countDocuments()  // Should return 15
   ```

2. **Check API Response**: Test one API call
   ```bash
   curl "http://localhost:8000/api/v1/sitters/nearby?user_address=JHU&limit=1"
   ```

## Data Cleanup

### Clear Test Data
If you need to remove all test sitters:

```javascript
// In mongosh
use plant_care_platform
db.sitters.deleteMany({})
```

### Regenerate Data
Simply run the script again - it automatically clears existing test data before creating new entries.

## Integration with CI/CD

For automated testing environments, you can integrate this script:

```bash
# In your test setup
source venv/bin/activate
PYTHONPATH=. python3 scripts/generate_test_sitters.py
pytest api/test_nearby_sitters.py
```

## Notes for Team Members

1. **Database State**: The script is idempotent - running it multiple times is safe
2. **Realistic Data**: All addresses are real Baltimore locations for accurate distance testing
3. **Geographical Spread**: Sitters are distributed across different neighborhoods for comprehensive testing
4. **Service Variations**: Different price points, service radii, and specialties for diverse test scenarios
5. **Experience Levels**: Mix of beginner, intermediate, and expert sitters for filtering tests

## Related Documentation

- [Backend README](../README.md) - General backend setup
- [Testing README](../testing/README.md) - Testing procedures
- [Nearby Sitters API Documentation](../docs/NEARBY_SITTERS_API.md) - API specification