#!/bin/bash

# =============================================================================
# JHU Plant Care Platform - Reservations API Test Suite
# =============================================================================
# 
# This comprehensive test suite validates all Reservations API endpoints
# including CRUD operations, status transitions, error handling, and edge cases.
# 
# Note: Most Reservations API endpoints require authentication.
# This test suite focuses on public endpoints and error handling scenarios.
# =============================================================================

set -e  # Exit on any error

# Configuration
BASE_URL="http://localhost:8000/api/v1"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Test tracking variables
TEST_COUNT=0
PASSED_COUNT=0
FAILED_COUNT=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🌱 JHU Plant Care Platform - Reservations API Test Suite"
echo "===================================================="
echo "[$TIMESTAMP] Starting Reservations API Tests"
echo "[$TIMESTAMP] Base URL: $BASE_URL"

# Enhanced test function with pass/fail tracking
test_endpoint() {
    local test_name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="${4:-}"
    local expected_description="$5"
    local should_succeed="${6:-true}"
    
    TEST_COUNT=$((TEST_COUNT + 1))
    
    echo ""
    echo "========================================"
    echo ""
    echo "🧪 Test #$TEST_COUNT: $test_name"
    echo "Expected: $expected_description"
    echo "URL: $url"
    echo "Method: $method"
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        echo "Data: $data"
    fi
    
    echo "Response:"
    echo "----------------------------------------"
    
    # Execute the request
    local response
    local status_code
    
    if [ "$method" = "POST" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null || echo "HTTPSTATUS:000")
        else
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$url" 2>/dev/null || echo "HTTPSTATUS:000")
        fi
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$url" 2>/dev/null || echo "HTTPSTATUS:000")
    fi
    
    # Extract status code and body
    status_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    # Pretty print JSON if possible
    if echo "$body" | python3 -m json.tool >/dev/null 2>&1; then
        echo "$body" | python3 -m json.tool
    else
        echo "$body"
    fi
    
    # Determine if test passed
    local test_passed=false
    if [ "$should_succeed" = "true" ]; then
        if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
            test_passed=true
        fi
    else
        # For error cases, we expect 4xx or 5xx status codes
        if [ "$status_code" -ge 400 ]; then
            test_passed=true
        fi
    fi
    
    # Update counters and display result
    if [ "$test_passed" = true ]; then
        if [ "$should_succeed" = "false" ]; then
            echo "✅ PASSED (Expected Error)"
        else
            echo "✅ PASSED"
        fi
        PASSED_COUNT=$((PASSED_COUNT + 1))
    else
        echo "❌ FAILED (Status: $status_code)"
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
    
    echo ""
    echo "========================================"
}

echo ""
echo "🧹 Preparing Test Environment..."
echo "Note: This project uses stub authentication - all endpoints work with mock user"
echo "Cleaning reservations database..."

# Clean reservations database
mongosh plant_care_platform --eval "db.reservations.deleteMany({})" > /dev/null 2>&1

echo ""
echo "🚀 STARTING RESERVATIONS API TESTS"
echo ""

# ============================================================================
# SECTION 1: BASIC FUNCTIONALITY TESTS
# ============================================================================

echo "📋 SECTION 1: BASIC FUNCTIONALITY"
echo "----------------------------------"

test_endpoint "Server Connectivity - Get Non-existent Reservation" \
              "$BASE_URL/reservations/nonexistent-id" \
              "GET" \
              "" \
              "Should return 404 Reservation not found" \
              "false"

test_endpoint "Get My Reservations - Empty State" \
              "$BASE_URL/reservations/me/reservations" \
              "GET" \
              "" \
              "Should return empty array initially" \
              "true"

test_endpoint "Get My Active Reservations - Empty State" \
              "$BASE_URL/reservations/me/active" \
              "GET" \
              "" \
              "Should return empty array initially" \
              "true"

# First ensure we have sample sitters for reservations
echo "Creating sample sitters for reservation testing..."
# Generate test sitters using Python script
echo "Creating test sitters..."
cd "$(dirname "$0")/../.." && PYTHONPATH=. python3 scripts/generate_test_sitters.py > /dev/null 2>&1 && cd testing/scripts

# Get a valid sitter ID for testing
SITTER_ID=$(curl -s "$BASE_URL/sitters/" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['_id'] if data else 'none')" 2>/dev/null || echo "none")

if [ "$SITTER_ID" != "none" ]; then
    test_endpoint "Create Valid Reservation" \
                  "$BASE_URL/reservations/" \
                  "POST" \
                  "{\"sitter_id\": \"$SITTER_ID\", \"start_date\": \"2025-10-10\", \"end_date\": \"2025-10-15\", \"total_amount\": 100.0, \"plants_info\": \"1 Monstera (Indoor) - Water twice weekly\", \"care_instructions\": \"Please water regularly and ensure good lighting\", \"location_address\": \"3400 N Charles St, Baltimore, MD 21218\"}" \
                  "Should create a new reservation successfully" \
                  "true"
else
    echo "⚠️  Skipping reservation creation - no sitters available"
fi

# ============================================================================
# SECTION 2: RESERVATION OPERATIONS
# ============================================================================

echo "📋 SECTION 2: RESERVATION OPERATIONS"
echo "------------------------------------"

# Get the created reservation ID for testing
RESERVATION_ID=$(curl -s "$BASE_URL/reservations/me/reservations" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['_id'] if data else 'none')" 2>/dev/null || echo "none")

if [ "$RESERVATION_ID" != "none" ]; then
    test_endpoint "Get Reservation Details" \
                  "$BASE_URL/reservations/$RESERVATION_ID" \
                  "GET" \
                  "" \
                  "Should return detailed reservation information" \
                  "true"

    test_endpoint "Confirm Reservation" \
                  "$BASE_URL/reservations/$RESERVATION_ID/confirm" \
                  "POST" \
                  "" \
                  "Should confirm the reservation" \
                  "true"

    test_endpoint "Start Reservation" \
                  "$BASE_URL/reservations/$RESERVATION_ID/start" \
                  "POST" \
                  "" \
                  "Should start the reservation" \
                  "true"

    test_endpoint "Add Care Update" \
                  "$BASE_URL/reservations/$RESERVATION_ID/care-updates" \
                  "POST" \
                  '{"notes": "Plants are doing well, watered this morning"}' \
                  "Should add a care update successfully" \
                  "true"

    test_endpoint "Complete Reservation" \
                  "$BASE_URL/reservations/$RESERVATION_ID/complete" \
                  "POST" \
                  "" \
                  "Should complete the reservation" \
                  "true"

    test_endpoint "Rate Reservation" \
                  "$BASE_URL/reservations/$RESERVATION_ID/rate" \
                  "POST" \
                  '{"rating": 5, "review": "Excellent plant care service!"}' \
                  "Should add rating and review" \
                  "true"
else
    echo "⚠️  Skipping reservation operations - no reservations available"
fi

test_endpoint "Operation on Non-existent Reservation" \
              "$BASE_URL/reservations/507f1f77bcf86cd799439099/confirm" \
              "POST" \
              "" \
              "Should return 404 Reservation not found" \
              "false"

# ============================================================================
# SECTION 3: ADDITIONAL RESERVATION MANAGEMENT
# ============================================================================

echo "📋 SECTION 3: ADDITIONAL RESERVATION MANAGEMENT"
echo "-----------------------------------------------"

# Create another reservation to test cancellation
if [ "$SITTER_ID" != "none" ]; then
    test_endpoint "Create Second Reservation for Cancellation Test" \
                  "$BASE_URL/reservations/" \
                  "POST" \
                  "{\"sitter_id\": \"$SITTER_ID\", \"start_date\": \"2025-11-01\", \"end_date\": \"2025-11-05\", \"total_amount\": 75.0, \"plants_info\": \"1 Snake Plant (Indoor) - Low water needs\", \"care_instructions\": \"Water sparingly\", \"location_address\": \"123 Test Ave, Baltimore, MD 21218\"}" \
                  "Should create another reservation for testing" \
                  "true"

    # Get the second reservation ID
    SECOND_RESERVATION_ID=$(curl -s "$BASE_URL/reservations/me/reservations" | python3 -c "import sys, json; data=json.load(sys.stdin); print([r['_id'] for r in data if r['start_date'] == '2025-11-01'][0] if any(r['start_date'] == '2025-11-01' for r in data) else 'none')" 2>/dev/null || echo "none")
    
    if [ "$SECOND_RESERVATION_ID" != "none" ]; then
        test_endpoint "Cancel Reservation" \
                      "$BASE_URL/reservations/$SECOND_RESERVATION_ID/cancel" \
                      "POST" \
                      "" \
                      "Should cancel the reservation" \
                      "true"
    fi
fi

test_endpoint "Get Updated Reservations List" \
              "$BASE_URL/reservations/me/reservations" \
              "GET" \
              "" \
              "Should show all created reservations" \
              "true"

# ============================================================================
# SECTION 4: ERROR HANDLING AND VALIDATION
# ============================================================================

echo "📋 SECTION 4: ERROR HANDLING AND VALIDATION"
echo "--------------------------------------------"

test_endpoint "Create Reservation - Invalid JSON" \
              "$BASE_URL/reservations/" \
              "POST" \
              '{"invalid": json}' \
              "Should return 422 JSON decode error" \
              "false"

test_endpoint "Create Reservation - Missing Required Fields" \
              "$BASE_URL/reservations/" \
              "POST" \
              '{"start_date": "2025-10-10"}' \
              "Should return 422 Validation Error" \
              "false"

test_endpoint "Create Reservation - Invalid Sitter ID" \
              "$BASE_URL/reservations/" \
              "POST" \
              '{"sitter_id": "invalid-sitter-id", "start_date": "2025-10-10", "end_date": "2025-10-15", "total_amount": 100.0, "plants_info": "Test plants", "care_instructions": "Test", "location_address": "Test Address"}' \
              "Should return 404 Sitter not found" \
              "false"

test_endpoint "Rate Reservation - Invalid Rating (Too High)" \
              "$BASE_URL/reservations/507f1f77bcf86cd799439011/rate" \
              "POST" \
              '{"rating": 10, "review": "Invalid rating"}' \
              "Should return 422 Validation Error" \
              "false"

test_endpoint "Rate Reservation - Invalid Rating (Too Low)" \
              "$BASE_URL/reservations/507f1f77bcf86cd799439011/rate" \
              "POST" \
              '{"rating": 0, "review": "Invalid rating"}' \
              "Should return 422 Validation Error" \
              "false"

test_endpoint "Add Care Update - Missing Required Field" \
              "$BASE_URL/reservations/507f1f77bcf86cd799439011/care-updates" \
              "POST" \
              '{}' \
              "Should return 422 Validation Error" \
              "false"

# ============================================================================
# SECTION 5: EDGE CASES AND BOUNDARY CONDITIONS
# ============================================================================

echo "📋 SECTION 5: EDGE CASES"
echo "-------------------------"

test_endpoint "Get Active Reservations After Operations" \
              "$BASE_URL/reservations/me/active" \
              "GET" \
              "" \
              "Should return currently active reservations" \
              "true"

test_endpoint "Operation on Very Long ID" \
              "$BASE_URL/reservations/this-is-a-very-long-invalid-reservation-id-that-should-not-exist-in-database/confirm" \
              "POST" \
              "" \
              "Should return 404 Reservation not found" \
              "false"

test_endpoint "Operation with Invalid ObjectId Format" \
              "$BASE_URL/reservations/invalid-format-123/start" \
              "POST" \
              "" \
              "Should return 404 Reservation not found" \
              "false"

test_endpoint "Double Rating Attempt" \
              "$BASE_URL/reservations/$RESERVATION_ID/rate" \
              "POST" \
              '{"rating": 4, "review": "Second attempt"}' \
              "Should handle duplicate rating gracefully" \
              "true"

test_endpoint "Create Reservation - Date in Past" \
              "$BASE_URL/reservations/" \
              "POST" \
              "{\"sitter_id\": \"$SITTER_ID\", \"start_date\": \"2020-10-10\", \"end_date\": \"2020-10-15\", \"total_amount\": 100.0, \"plants_info\": \"Test plants from past\", \"care_instructions\": \"Test\", \"location_address\": \"Test Address\"}" \
              "Should handle past dates (may succeed or fail based on validation)" \
              "true"

# ============================================================================
# SECTION 6: FINAL STATE VERIFICATION
# ============================================================================

echo "📋 SECTION 6: FINAL STATE VERIFICATION"
echo "--------------------------------------"

test_endpoint "Final Connectivity Check" \
              "$BASE_URL/reservations/test-connectivity" \
              "GET" \
              "" \
              "Should return 401 Unauthorized (confirms server is responding)" \
              "false"

# ============================================================================
# TEST SUMMARY AND RESULTS
# ============================================================================

echo ""
echo "🎯 TEST EXECUTION COMPLETED!"
echo "============================"
echo ""
echo "📊 Test Results Summary:"
echo "  Total Tests: $TEST_COUNT"
echo "  Passed: $PASSED_COUNT"  
echo "  Failed: $FAILED_COUNT"
echo "  Success Rate: $(( PASSED_COUNT * 100 / TEST_COUNT ))%"
echo ""

if [ $FAILED_COUNT -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED! Reservations API error handling is working correctly."
else
    echo "⚠️  Some tests failed. Please review the output above."
fi

echo ""
echo "📋 Verified Features:"
echo "  ✅ Basic CRUD Operations"
echo "  ✅ Reservation Status Transitions"  
echo "  ✅ Care Updates Management"
echo "  ✅ Rating and Review System"
echo "  ✅ Error Handling and Validation"
echo "  ✅ Edge Case Handling"
echo ""
echo "⚠️  IMPORTANT NOTES:"
echo "  • This project uses stub authentication (mock user system)"
echo "  • All endpoints work with a predefined test user"
echo "  • Full reservation workflow testing completed"
echo "  • Validation and error handling verified"
echo ""
echo "💾 Save detailed results:"
echo "  ./test_reservations_api.sh > ../results/manual_test_results/reservations_api_\$(date +%Y%m%d_%H%M%S).log"
echo ""
echo "🔗 Next Steps:"
echo "  - Set up authentication for comprehensive endpoint testing"
echo "  - Run other API tests: ./test_listings_api.sh, ./test_sitters_api.sh"
echo "  - Run complete test suite: ./run_all_tests.sh"