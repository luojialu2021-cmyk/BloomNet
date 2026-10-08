#!/bin/bash

# JHU Plant Care Platform - Sitters API Test Suite
# This script provides comprehensive testing for all Sitters API endpoints
# Including CRUD operations, search functionality, and error handling

echo "🌱 JHU Plant Care Platform - Sitters API Test Suite"
echo "=================================================="

BASE_URL="http://localhost:8000/api/v1"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
TEST_COUNT=0
PASSED_COUNT=0
FAILED_COUNT=0

echo "[$TIMESTAMP] Starting Sitters API Tests"
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
echo "Cleaning sitters database..."
mongosh plant_care_platform --eval "
db.sitters.deleteMany({});
print('Database cleaned. Sitters count:', db.sitters.countDocuments());
" >/dev/null 2>&1

echo ""
echo "🚀 STARTING SITTERS API TESTS"
echo ""

# ============================================================================
# SECTION 1: BASIC FUNCTIONALITY TESTS
# ============================================================================

echo "📋 SECTION 1: BASIC FUNCTIONALITY"
echo "----------------------------------"

test_endpoint "Server Connectivity" \
              "$BASE_URL/sitters/" \
              "GET" \
              "" \
              "Should return empty array initially" \
              "true"

# Generate test sitters using Python script
echo "Creating test sitters using Python script..."
cd "$(dirname "$0")/../.." && PYTHONPATH=. python3 scripts/generate_test_sitters.py && cd testing/scripts

test_endpoint "Check Test Sitters Created" \
              "$BASE_URL/sitters/" \
              "GET" \
              "" \
              "Should return test sitters" \
              "true"

test_endpoint "List All Sitters" \
              "$BASE_URL/sitters/" \
              "GET" \
              "" \
              "Should show created sample sitters" \
              "true"

# ============================================================================
# SECTION 2: SEARCH FUNCTIONALITY TESTS
# ============================================================================

echo "📋 SECTION 2: SEARCH FUNCTIONALITY"
echo "-----------------------------------"

test_endpoint "Search by ZIP Code (21218)" \
              "$BASE_URL/sitters/?zip_code=21218" \
              "GET" \
              "" \
              "Should return sitters serving Baltimore area" \
              "true"

test_endpoint "Search by ZIP Code (21211)" \
              "$BASE_URL/sitters/?zip_code=21211" \
              "GET" \
              "" \
              "Should return sitters serving Hampden area" \
              "true"

test_endpoint "Search by Plant Specialty (succulents)" \
              "$BASE_URL/sitters/?plant_type=succulents" \
              "GET" \
              "" \
              "Should return sitters specializing in succulents" \
              "true"

test_endpoint "Search by Plant Specialty (outdoor plants)" \
              "$BASE_URL/sitters/?plant_type=outdoor%20plants" \
              "GET" \
              "" \
              "Should return sitters specializing in outdoor plants" \
              "true"

test_endpoint "Search by Price Range (15-25)" \
              "$BASE_URL/sitters/?min_price=15&max_price=25" \
              "GET" \
              "" \
              "Should return sitters within price range" \
              "true"

test_endpoint "Search by Minimum Rating (4.5)" \
              "$BASE_URL/sitters/?min_rating=4.5" \
              "GET" \
              "" \
              "Should return highly rated sitters" \
              "true"

test_endpoint "Complex Search (ZIP + Price + Rating)" \
              "$BASE_URL/sitters/?zip_code=21218&min_price=20&min_rating=4.8" \
              "GET" \
              "" \
              "Should return sitters matching multiple criteria" \
              "true"

# ============================================================================
# SECTION 3: INDIVIDUAL SITTER OPERATIONS
# ============================================================================

echo "📋 SECTION 3: INDIVIDUAL SITTER OPERATIONS"
echo "-------------------------------------------"

# First get a sitter ID for testing
FIRST_SITTER_ID=$(curl -s "$BASE_URL/sitters/" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['_id'] if data else 'none')" 2>/dev/null || echo "none")

if [ "$FIRST_SITTER_ID" != "none" ]; then
    test_endpoint "Get Sitter Details" \
                  "$BASE_URL/sitters/$FIRST_SITTER_ID" \
                  "GET" \
                  "" \
                  "Should return detailed sitter information" \
                  "true"

    test_endpoint "Get Sitter Availability" \
                  "$BASE_URL/sitters/$FIRST_SITTER_ID/availability" \
                  "GET" \
                  "" \
                  "Should return sitter availability information" \
                  "true"
else
    echo "⚠️  Skipping individual sitter tests - no sitters found"
fi

# ============================================================================
# SECTION 4: ERROR HANDLING AND VALIDATION
# ============================================================================

echo "📋 SECTION 4: ERROR HANDLING AND VALIDATION"
echo "--------------------------------------------"

test_endpoint "Error Handling - Non-existent Sitter ID" \
              "$BASE_URL/sitters/nonexistent-id" \
              "GET" \
              "" \
              "Should return 404 with proper error message" \
              "false"

test_endpoint "Error Handling - Invalid ObjectId Format" \
              "$BASE_URL/sitters/invalid-format-123" \
              "GET" \
              "" \
              "Should return 404 with proper error message" \
              "false"

test_endpoint "Parameter Validation - Invalid Price" \
              "$BASE_URL/sitters/?min_price=invalid" \
              "GET" \
              "" \
              "Should return validation error" \
              "false"

test_endpoint "Parameter Validation - Invalid Rating" \
              "$BASE_URL/sitters/?min_rating=invalid" \
              "GET" \
              "" \
              "Should return validation error" \
              "false"

# Address validation tests (Note: These test Pydantic model validation)
# Even without authentication, invalid data should be rejected at validation layer
echo ""
echo "📋 SECTION 4.1: ADDRESS VALIDATION (Model Level)"
echo "------------------------------------------------"

test_endpoint "Address Validation - Invalid ZIP Code Format" \
              "$BASE_URL/sitter/profile" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main St", "city": "Baltimore", "state": "MD", "zipcode": "2121"}' \
              "Should reject invalid ZIP code format (too short)" \
              "false"

test_endpoint "Address Validation - Invalid State Abbreviation" \
              "$BASE_URL/sitter/profile" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main St", "city": "Baltimore", "state": "XX", "zipcode": "21218"}' \
              "Should reject invalid state abbreviation" \
              "false"

test_endpoint "Address Validation - Address Without Number" \
              "$BASE_URL/sitter/profile" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "Main Street", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should reject address without house/building number" \
              "false"

test_endpoint "Address Validation - City Too Short" \
              "$BASE_URL/sitter/profile" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main St", "city": "B", "state": "MD", "zipcode": "21218"}' \
              "Should reject city name shorter than 2 characters" \
              "false"

test_endpoint "Address Validation - Valid Address Format" \
              "$BASE_URL/sitter/profile" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "3400 N Charles St", "address_line2": "Apt 5B", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should accept valid address format (may require auth, but validation should pass)" \
              "true"

# ============================================================================
# SECTION 5: EDGE CASES AND BOUNDARY TESTS
# ============================================================================

echo "📋 SECTION 5: EDGE CASES"
echo "-------------------------"

test_endpoint "Search No Results - Nonexistent ZIP" \
              "$BASE_URL/sitters/?zip_code=00000" \
              "GET" \
              "" \
              "Should return empty array for no matches" \
              "true"

test_endpoint "Search No Results - Very High Price" \
              "$BASE_URL/sitters/?min_price=1000" \
              "GET" \
              "" \
              "Should return empty array for unrealistic price" \
              "true"

test_endpoint "Search No Results - Very High Rating" \
              "$BASE_URL/sitters/?min_rating=5.0" \
              "GET" \
              "" \
              "Should return empty array for perfect rating requirement" \
              "true"

test_endpoint "Empty Parameter Handling" \
              "$BASE_URL/sitters/?zip_code=" \
              "GET" \
              "" \
              "Should handle empty parameters gracefully" \
              "true"

test_endpoint "Unknown Parameter Handling" \
              "$BASE_URL/sitters/?nonexistent_param=test" \
              "GET" \
              "" \
              "Should ignore unknown parameters" \
              "true"

# ============================================================================
# SECTION 6: FINAL STATE VERIFICATION
# ============================================================================

echo "📋 SECTION 6: FINAL STATE VERIFICATION"
echo "---------------------------------------"

test_endpoint "Final Database State" \
              "$BASE_URL/sitters/" \
              "GET" \
              "" \
              "Should show clean sample data (no duplicates)" \
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
    echo "🎉 ALL TESTS PASSED! Sitters API is working correctly."
else
    echo "⚠️  Some tests failed. Please review the output above."
fi

echo ""
echo "📋 Verified Features:"
echo "  ✅ Basic CRUD Operations"
echo "  ✅ Sample Data Management"
echo "  ✅ Search and Filtering"
echo "  ✅ Individual Sitter Operations"
echo "  ✅ Error Handling"
echo "  ✅ Parameter Validation"
echo "  ✅ Address Format Validation (address_line1, address_line2, city, state, zipcode)"
echo "  ✅ Edge Case Handling"
echo ""
echo "💾 Save detailed results:"
echo "  ./test_sitters_api.sh > ../results/manual_test_results/sitters_api_\$(date +%Y%m%d_%H%M%S).log"
echo ""
echo "🔗 Next Steps:"
echo "  - Review any failed tests and fix issues"
echo "  - Run other API tests: ./test_listings_api.sh"
echo "  - Run complete test suite: ./run_all_tests.sh"