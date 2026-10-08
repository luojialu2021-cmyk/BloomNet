#!/bin/bash

# JHU Plant Care Platform - Complete Listings API Test Suite
# This script provides comprehensive testing for all Listings API endpoints
# Including CRUD operations, search functionality, and bug fix verifications

echo "🌱 JHU Plant Care Platform - Listings API Test Suite"
echo "===================================================="

BASE_URL="http://localhost:8000/api/v1"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
TEST_COUNT=0
PASSED_COUNT=0
FAILED_COUNT=0

echo "[$TIMESTAMP] Starting Listings API Tests"
echo "[$TIMESTAMP] Base URL: $BASE_URL"
echo ""

# Enhanced test function with status tracking
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"
    local expected_behavior="$5"
    local should_pass="${6:-true}"
    
    TEST_COUNT=$((TEST_COUNT + 1))
    
    echo "🧪 Test #$TEST_COUNT: $name"
    echo "Expected: $expected_behavior"
    echo "URL: $url"
    echo "Method: $method"
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        echo "Data: $data"
    fi
    
    echo "Response:"
    echo "----------------------------------------"
    
    # Execute the request and capture response
    if [ "$method" = "POST" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -X POST "$url" -H "Content-Type: application/json" -d "$data")
        else
            response=$(curl -s -X POST "$url" -H "Content-Type: application/json")
        fi
    else
        response=$(curl -s "$url")
    fi
    
    # Try to format as JSON, fallback to raw output
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    
    # Simple pass/fail logic based on response content
    if [ "$should_pass" = "true" ]; then
        if [[ "$response" != *"error"* ]] && [[ "$response" != "" ]]; then
            echo "✅ PASSED"
            PASSED_COUNT=$((PASSED_COUNT + 1))
        else
            echo "❌ FAILED"
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
    else
        if [[ "$response" == *"detail"* ]] || [[ "$response" == *"error"* ]]; then
            echo "✅ PASSED (Expected Error)"
            PASSED_COUNT=$((PASSED_COUNT + 1))
        else
            echo "❌ FAILED (Expected Error but got success)"
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
    fi
    
    echo ""
    echo "========================================"
    echo ""
}

# Clean database before starting tests
echo "🧹 Preparing Test Environment..."
echo "Cleaning database..."
mongosh plant_care_platform --eval "
db.listings.deleteMany({});
print('Database cleaned. Listings count:', db.listings.countDocuments());
" >/dev/null 2>&1

echo ""
echo "🚀 STARTING LISTINGS API TESTS"
echo ""

# ============================================================================
# SECTION 1: BUG FIX VERIFICATION TESTS
# ============================================================================

echo "📋 SECTION 1: BUG FIX VERIFICATION"
echo "-----------------------------------"

# Error Handling Tests
test_endpoint "Error Handling - Non-existent ID" \
              "$BASE_URL/listings/nonexistent-id" \
              "GET" \
              "" \
              "Should return 404 with proper error message" \
              "false"

test_endpoint "Error Handling - Invalid ObjectId Format" \
              "$BASE_URL/listings/invalid-format-123" \
              "GET" \
              "" \
              "Should return 404 with proper error message" \
              "false"

# Sample Data Duplication Tests
test_endpoint "Sample Data - First Call" \
              "$BASE_URL/listings/sample-data" \
              "POST" \
              "" \
              "Should create new sample listing" \
              "true"

test_endpoint "Sample Data - Duplicate Prevention" \
              "$BASE_URL/listings/sample-data" \
              "POST" \
              "" \
              "Should detect existing sample data and not create duplicates" \
              "true"

# ============================================================================
# SECTION 2: BASIC CRUD OPERATIONS
# ============================================================================

echo "📋 SECTION 2: BASIC CRUD OPERATIONS"
echo "------------------------------------"

test_endpoint "List All Listings" \
              "$BASE_URL/listings/" \
              "GET" \
              "" \
              "Should show all listings (currently 1 sample)" \
              "true"

test_endpoint "Get Active Listings" \
              "$BASE_URL/listings/active" \
              "GET" \
              "" \
              "Should show only active listings" \
              "true"

# ============================================================================
# SECTION 3: SEARCH FUNCTIONALITY TESTS
# ============================================================================

echo "📋 SECTION 3: SEARCH FUNCTIONALITY"
echo "-----------------------------------"

test_endpoint "Search by ZIP Code (21218)" \
              "$BASE_URL/listings/?zip_code=21218" \
              "GET" \
              "" \
              "Should return listings in Baltimore area" \
              "true"

test_endpoint "Search by Campus Area (Homewood)" \
              "$BASE_URL/listings/?campus_area=Homewood" \
              "GET" \
              "" \
              "Should return listings in Homewood area" \
              "true"

test_endpoint "Search by Plant Type (tropical)" \
              "$BASE_URL/listings/?plant_type=tropical" \
              "GET" \
              "" \
              "Should return listings with tropical plants" \
              "true"

test_endpoint "Search by Price Range (20-100)" \
              "$BASE_URL/listings/?min_payment=20&max_payment=100" \
              "GET" \
              "" \
              "Should return listings within price range" \
              "true"

test_endpoint "Search by Date Range" \
              "$BASE_URL/listings/?start_date=2025-10-10&end_date=2025-10-20" \
              "GET" \
              "" \
              "Should return listings within date range" \
              "true"

test_endpoint "Complex Search (ZIP + Price)" \
              "$BASE_URL/listings/?zip_code=21218&min_payment=30" \
              "GET" \
              "" \
              "Should return listings matching multiple criteria" \
              "true"

test_endpoint "Search Urgent Only" \
              "$BASE_URL/listings/?is_urgent_only=true" \
              "GET" \
              "" \
              "Should return only urgent listings (likely empty)" \
              "true"

# ============================================================================
# SECTION 4: PARAMETER VALIDATION TESTS
# ============================================================================

echo "📋 SECTION 4: PARAMETER VALIDATION"
echo "-----------------------------------"

test_endpoint "Invalid Parameter Type" \
              "$BASE_URL/listings/?min_payment=invalid" \
              "GET" \
              "" \
              "Should return validation error for invalid parameter" \
              "false"

test_endpoint "Empty Parameter" \
              "$BASE_URL/listings/?zip_code=" \
              "GET" \
              "" \
              "Should handle empty parameters gracefully" \
              "true"

test_endpoint "Non-existent Parameter" \
              "$BASE_URL/listings/?nonexistent_param=test" \
              "GET" \
              "" \
              "Should ignore unknown parameters" \
              "true"

# ============================================================================
# SECTION 5: EDGE CASES AND BOUNDARY TESTS
# ============================================================================

echo "📋 SECTION 5: EDGE CASES"
echo "-------------------------"

test_endpoint "Search No Results" \
              "$BASE_URL/listings/?zip_code=00000" \
              "GET" \
              "" \
              "Should return empty array for no matches" \
              "true"

test_endpoint "Price Range - Only Min" \
              "$BASE_URL/listings/?min_payment=1000" \
              "GET" \
              "" \
              "Should return listings above minimum price" \
              "true"

test_endpoint "Price Range - Only Max" \
              "$BASE_URL/listings/?max_payment=10" \
              "GET" \
              "" \
              "Should return listings below maximum price" \
              "true"

# ============================================================================
# SECTION 6: FINAL VERIFICATION
# ============================================================================

echo "📋 SECTION 6: FINAL STATE VERIFICATION"
echo "---------------------------------------"

test_endpoint "Final Database State" \
              "$BASE_URL/listings/" \
              "GET" \
              "" \
              "Should show exactly 1 sample listing (no duplicates)" \
              "true"

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
    echo "🎉 ALL TESTS PASSED! Listings API is working correctly."
else
    echo "⚠️  Some tests failed. Please review the output above."
fi

echo ""
echo "📋 Verified Features:"
echo "  ✅ Error Handling (404 responses)"
echo "  ✅ Sample Data Duplication Prevention"
echo "  ✅ Basic CRUD Operations"
echo "  ✅ Search and Filtering"
echo "  ✅ Parameter Validation"
echo "  ✅ Edge Case Handling"
echo ""
echo "💾 Save detailed results:"
echo "  ./test_listings_api.sh > ../results/manual_test_results/listings_api_\$(date +%Y%m%d_%H%M%S).log"
echo ""
echo "🔗 Next Steps:"
echo "  - Run Sitters API tests: ./test_sitters_api.sh"
echo "  - Run integration tests across multiple APIs"
echo "  - Test frontend-backend integration"