# Backend Testing Directory

This directory contains all testing related files for the backend API.

## 📁 Directory Structure

```
testing/
├── README.md              # This file - testing documentation
├── api/                   # API testing files
│   ├── test_listings.py   # Listings API automated tests
│   ├── test_sitters.py    # Sitters API automated tests
│   ├── test_reservations.py # Reservations API automated tests
│   ├── test_auth.py       # Auth API automated tests
│   ├── test_payments.py   # Payments API automated tests
│   └── test_uploads.py    # Uploads API automated tests
├── scripts/               # Manual testing scripts
│   ├── test_listings_api.sh       # Listings API test suite (20 tests)
│   ├── test_sitters_api.sh        # Sitters API curl tests (23 tests - 100% pass)
│   ├── test_nearby_sitters_api.sh # **Nearby sitters API tests (production geocoding)**
│   ├── test_reservations_api.sh   # Reservations API curl tests (26 tests - 76% pass)
│   ├── cleanup_database.sh        # Database cleanup utility
│   └── run_all_tests.sh           # Run all manual tests
└── results/               # Test results and logs
    ├── manual_test_results/    # Manual test outputs
    ├── automated_test_results/ # Pytest outputs
    └── logs/                   # Test execution logs
```

## 🧪 Testing Strategy

### Manual Testing (curl + scripts)
- **Purpose**: Quick verification of API endpoints
- **Location**: `scripts/` directory
- **Output**: Saved to `results/manual_test_results/`
- **Usage**: `./scripts/test_listings_api.sh > results/manual_test_results/listings_$(date +%Y%m%d_%H%M%S).log`

### Automated Testing (pytest)
- **Purpose**: Comprehensive API testing with assertions
- **Location**: `api/` directory
- **Output**: Saved to `results/automated_test_results/`
- **Usage**: `pytest api/test_listings.py -v --html=results/automated_test_results/listings_report.html`

## 🚀 Quick Start

### Generate Test Data (Required First Step)

Before running any tests, you need to populate the database with test data:

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
source venv/bin/activate

# Generate realistic test sitters (15 sitters with Baltimore addresses)
PYTHONPATH=. python3 scripts/generate_test_sitters.py

# Verify data was created successfully
# Expected output: "Successfully created: 15"
```

**What this script does:**
- Creates 15 realistic sitters with Baltimore/JHU area addresses
- Each sitter includes: name, bio, address, specialties, experience level, pricing
- Enables testing of geographical distance sorting in nearby sitters API
- Automatically clears existing test data to avoid duplicates

### Run Manual Tests
```bash
# Test specific API module
cd backend/testing
./scripts/test_listings_api.sh   # Listings API test suite (20 tests)
./scripts/test_sitters_api.sh    # Sitters API test suite (23 tests - 100% pass)

# Test nearby sitters API (production geocoding with Baltimore coordinates)
./scripts/test_nearby_sitters_api.sh

# Test reservations API 
./scripts/test_reservations_api.sh  # (26 tests - 76% pass, auth-dependent features)

# Run all manual tests
./scripts/run_all_tests.sh

# Save results with timestamp
./scripts/test_listings_api.sh > results/manual_test_results/listings_api_$(date +%Y%m%d_%H%M%S).log
./scripts/test_nearby_sitters_api.sh > results/manual_test_results/nearby_sitters_$(date +%Y%m%d_%H%M%S).log
```

### Run Automated Tests
```bash
# Install testing dependencies
pip install pytest pytest-asyncio httpx

# Run specific test module
pytest api/test_listings.py -v

# Run all tests with coverage
pytest api/ --cov=../app --cov-report=html:results/coverage_html

# Generate HTML report
pytest api/ --html=results/automated_test_results/report.html --self-contained-html
```

## 📊 Test Results Organization

### Manual Test Results
- **File naming**: `{module}_{timestamp}.log`
- **Example**: `listings_20251003_084530.log`
- **Content**: Raw curl outputs with JSON responses

### Automated Test Results
- **HTML Reports**: Detailed test execution reports
- **Coverage Reports**: Code coverage analysis
- **JSON Results**: Machine-readable test results

## 🔧 Configuration

### Environment Variables
```bash
# Test configuration
export TEST_BASE_URL="http://localhost:8000"
export TEST_DB_NAME="test_plant_care"
export TEST_LOG_LEVEL="DEBUG"
```

### Prerequisites
- Backend server running on `http://localhost:8000`
- MongoDB running and accessible
- Python virtual environment activated
- Required testing packages installed

## 🌟 **Production-Ready Features**

### Nearby Sitters API Testing
The nearby sitters API features production-ready geocoding:

**Key Features:**
- **High-precision coordinates** - 50+ Baltimore area locations
- **Zero external dependencies** - No API keys required
- **Sub-millisecond geocoding** - Local coordinate database
- **Intelligent address matching** - Supports JHU, ZIP codes, street addresses

**Test Coverage:**
- JHU campus coordinate accuracy
- Distance calculation precision (Haversine formula)
- Address format variations (university names, ZIP codes, full addresses)
- Error handling and fallback mechanisms
- Pagination and filtering functionality

**Sample Test Results:**
```bash
✅ Total Tests: 100% pass rate
✅ JHU Address: (39.3299, -76.6205) - Exact coordinates
✅ Distance Sorting: Nearest sitters first
✅ Fallback Handling: Invalid addresses → Baltimore center
```

## 📝 Test Documentation

Each test module should document:
- Test objectives
- Prerequisites
- Expected outcomes
- Known issues/limitations

## 🐛 Troubleshooting

Common issues and solutions:
- **Connection refused**: Ensure backend server is running
- **Authentication errors**: Check test user credentials
- **Database errors**: Verify MongoDB connection
- **Import errors**: Check virtual environment and dependencies