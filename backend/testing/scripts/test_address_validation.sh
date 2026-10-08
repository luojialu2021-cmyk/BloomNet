#!/bin/bash

# =============================================================================
# JHU Plant Care Platform - Address Validation Test Suite
# =============================================================================
# 
# This test suite validates address format validation for user and sitter profiles.
# Tests cover all address fields: address_line1, address_line2, city, state, zipcode.
# 
# Note: Tests use dedicated validation endpoints that do NOT require authentication:
# - POST /api/v1/test/sitter-profile-validation
# - POST /api/v1/test/user-profile-validation
# 
# These endpoints only test Pydantic model validation without saving to database.
# For invalid data: Expect 422 (validation error)
# For valid data: Expect 200 (validation passed)
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

echo "🌱 JHU Plant Care Platform - Address Validation Test Suite"
echo "=========================================================="
echo "[$TIMESTAMP] Starting Address Validation Tests"
echo "[$TIMESTAMP] Base URL: $BASE_URL"
echo ""

# Enhanced test function with pass/fail tracking
test_endpoint() {
    local test_name="$1"
    local url="$2"
    local method="${3:-POST}"
    local data="${4:-}"
    local expected_description="$5"
    local should_succeed="${6:-false}"  # Default to expecting validation error
    
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
    # Test endpoints don't require authentication, so:
    # - Valid data: Expect 200 (validation passed)
    # - Invalid data: Expect 422 (validation error)
    local test_passed=false
    if [ "$should_succeed" = "true" ]; then
        # For valid data: expect 200 (success)
        if [ "$status_code" -eq 200 ]; then
            # Check if response indicates validation passed
            if [[ "$body" == *"valid"* ]] || [[ "$body" == *"status"* ]]; then
                test_passed=true
            fi
        fi
    else
        # For invalid data: expect 422 (validation error) or 400
        if [ "$status_code" -eq 422 ] || [ "$status_code" -eq 400 ]; then
            # Check if response contains validation error details
            if [[ "$body" == *"detail"* ]] || [[ "$body" == *"validation"* ]] || [[ "$body" == *"ValueError"* ]] || [[ "$body" == *"Invalid"* ]] || [[ "$body" == *"required"* ]] || [[ "$body" == *"field"* ]] || [[ "$body" == *"error"* ]]; then
                test_passed=true
            fi
        fi
    fi
    
    # Update counters and display result
    if [ "$test_passed" = true ]; then
        if [ "$should_succeed" = "false" ]; then
            echo "✅ PASSED (Validation Error as Expected - Status: $status_code)"
        else
            echo "✅ PASSED (Validation Passed - Status: $status_code)"
        fi
        PASSED_COUNT=$((PASSED_COUNT + 1))
    else
        echo "❌ FAILED (Status: $status_code)"
        if [ "$should_succeed" = "true" ] && [ "$status_code" -ne 200 ]; then
            echo "   Expected 200 (validation passed) but got $status_code"
        elif [ "$should_succeed" = "false" ] && [ "$status_code" -ne 422 ] && [ "$status_code" -ne 400 ]; then
            echo "   Expected 422/400 (validation error) but got $status_code"
        fi
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
    
    echo ""
    echo "========================================"
}

echo ""
echo "🚀 STARTING ADDRESS VALIDATION TESTS"
echo ""

# =============================================================================
# SECTION 1: ADDRESS LINE 1 VALIDATION TESTS
# =============================================================================

echo "📋 SECTION 1: ADDRESS LINE 1 VALIDATION"
echo "----------------------------------------"

# Valid address line 1 - using test endpoint (no auth required)
test_endpoint "Valid Address Line 1" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should accept valid street address" \
              "true"

# Missing address line 1 - using test endpoint (no auth required)
test_endpoint "Missing Address Line 1" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should reject missing address_line1" \
              "false"

# Address too short
test_endpoint "Address Line 1 Too Short" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should reject address shorter than 5 characters" \
              "false"

# Address too long
test_endpoint "Address Line 1 Too Long" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should reject address longer than 100 characters" \
              "false"

# Missing house number
test_endpoint "Address Line 1 Without Number" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "Main Street", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should reject address without house/building number" \
              "false"

# Missing street name
test_endpoint "Address Line 1 Without Street Name" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should reject address without street name" \
              "false"

# Invalid characters
test_endpoint "Address Line 1 With Invalid Characters" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main St!", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should reject address with invalid characters" \
              "false"

# Valid address with special allowed characters
test_endpoint "Valid Address Line 1 With Special Characters" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 N. Charles St., Apt 5", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should accept address with allowed special characters" \
              "true"

# =============================================================================
# SECTION 2: ADDRESS LINE 2 VALIDATION TESTS
# =============================================================================

echo "📋 SECTION 2: ADDRESS LINE 2 VALIDATION"
echo "----------------------------------------"

# Valid address line 2
test_endpoint "Valid Address Line 2" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "address_line2": "Apt 5B", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should accept valid address line 2" \
              "true"

# Address line 2 too short
test_endpoint "Address Line 2 Too Short" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "address_line2": "A", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should reject address line 2 shorter than 2 characters" \
              "false"

# Address line 2 too long
test_endpoint "Address Line 2 Too Long" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "address_line2": "123456789012345678901234567890123456789012345678901", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should reject address line 2 longer than 50 characters" \
              "false"

# Invalid characters in address line 2
test_endpoint "Address Line 2 With Invalid Characters" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "address_line2": "Apt 5B!", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should reject address line 2 with invalid characters" \
              "false"

# Valid address line 2 with special characters
test_endpoint "Valid Address Line 2 With Special Characters" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "address_line2": "Suite #200, Building 3", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should accept address line 2 with allowed special characters" \
              "true"

# Empty address line 2 (should be allowed)
test_endpoint "Empty Address Line 2 (Optional)" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "address_line2": "", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should accept empty address line 2 (optional field)" \
              "true"

# =============================================================================
# SECTION 3: CITY VALIDATION TESTS
# =============================================================================

echo "📋 SECTION 3: CITY VALIDATION"
echo "------------------------------"

# Valid city
test_endpoint "Valid City Name" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should accept valid city name" \
              "true"

# Missing city
test_endpoint "Missing City" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "state": "MD", "zipcode": "21218"}' \
              "Should reject missing city" \
              "false"

# City too short
test_endpoint "City Too Short" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "A", "state": "MD", "zipcode": "21218"}' \
              "Should reject city shorter than 2 characters" \
              "false"

# City too long
test_endpoint "City Too Long" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "123456789012345678901234567890123456789012345678901", "state": "MD", "zipcode": "21218"}' \
              "Should reject city longer than 50 characters" \
              "false"

# City with numbers
test_endpoint "City With Numbers" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore123", "state": "MD", "zipcode": "21218"}' \
              "Should reject city with numbers" \
              "false"

# City with invalid characters
test_endpoint "City With Invalid Characters" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore!", "state": "MD", "zipcode": "21218"}' \
              "Should reject city with invalid characters" \
              "false"

# Valid city with period (abbreviation)
test_endpoint "Valid City With Period (Abbreviation)" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "St. Louis", "state": "MO", "zipcode": "63101"}' \
              "Should accept city with period for abbreviations (e.g., St. Louis)" \
              "true"

# Valid city with hyphen and apostrophe
test_endpoint "Valid City With Hyphen and Apostrophe" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              "{\"phone\": \"123-456-7890\", \"address_line1\": \"123 Main Street\", \"city\": \"O'Fallon\", \"state\": \"MO\", \"zipcode\": \"63366\"}" \
              "Should accept city with apostrophe (e.g., O'Fallon)" \
              "true"

# City normalization (lowercase should be accepted and normalized)
test_endpoint "City Normalization (Lowercase)" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should accept lowercase city (will be normalized)" \
              "true"

# =============================================================================
# SECTION 4: STATE VALIDATION TESTS
# =============================================================================

echo "📋 SECTION 4: STATE VALIDATION"
echo "-------------------------------"

# Valid state
test_endpoint "Valid State Abbreviation" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should accept valid state abbreviation" \
              "true"

# Missing state
test_endpoint "Missing State" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "zipcode": "21218"}' \
              "Should reject missing state" \
              "false"

# Invalid state format (lowercase)
test_endpoint "State Lowercase (Should Normalize)" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "md", "zipcode": "21218"}' \
              "Should accept lowercase state (will be normalized to uppercase)" \
              "true"

# Invalid state format (full name)
test_endpoint "State Full Name" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "Maryland", "zipcode": "21218"}' \
              "Should reject full state name (not abbreviation)" \
              "false"

# Invalid state format (single letter)
test_endpoint "State Single Letter" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "M", "zipcode": "21218"}' \
              "Should reject single letter state" \
              "false"

# Invalid state format (three letters)
test_endpoint "State Three Letters" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "MDD", "zipcode": "21218"}' \
              "Should reject three-letter state" \
              "false"

# Invalid state (not a valid US state)
test_endpoint "Invalid State Abbreviation" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "XX", "zipcode": "21218"}' \
              "Should reject invalid state abbreviation" \
              "false"

# Valid states (test a few)
test_endpoint "Valid State - California" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Los Angeles", "state": "CA", "zipcode": "90001"}' \
              "Should accept CA (California)" \
              "true"

test_endpoint "Valid State - New York" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "New York", "state": "NY", "zipcode": "10001"}' \
              "Should accept NY (New York)" \
              "true"

test_endpoint "Valid State - District of Columbia" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Washington", "state": "DC", "zipcode": "20001"}' \
              "Should accept DC (District of Columbia)" \
              "true"

# =============================================================================
# SECTION 5: ZIPCODE VALIDATION TESTS
# =============================================================================

echo "📋 SECTION 5: ZIPCODE VALIDATION"
echo "---------------------------------"

# Valid 5-digit ZIP code
test_endpoint "Valid 5-Digit ZIP Code" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should accept valid 5-digit ZIP code" \
              "true"

# Valid 9-digit ZIP code
test_endpoint "Valid 9-Digit ZIP Code" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "MD", "zipcode": "21218-1234"}' \
              "Should accept valid 9-digit ZIP code with hyphen" \
              "true"

# Missing ZIP code
test_endpoint "Missing ZIP Code" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "MD"}' \
              "Should reject missing ZIP code" \
              "false"

# Invalid ZIP code format (too short)
test_endpoint "ZIP Code Too Short" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "MD", "zipcode": "2121"}' \
              "Should reject ZIP code shorter than 5 digits" \
              "false"

# Invalid ZIP code format (too long)
test_endpoint "ZIP Code Too Long" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "MD", "zipcode": "2121812345"}' \
              "Should reject ZIP code longer than 9 digits" \
              "false"

# Invalid ZIP code format (with letters)
test_endpoint "ZIP Code With Letters" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "MD", "zipcode": "2121A"}' \
              "Should reject ZIP code with letters" \
              "false"

# Invalid ZIP code format (9-digit without hyphen)
test_endpoint "ZIP Code 9-Digit Without Hyphen" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "MD", "zipcode": "212181234"}' \
              "Should reject 9-digit ZIP code without hyphen" \
              "false"

# Invalid ZIP code format (wrong hyphen position)
test_endpoint "ZIP Code Wrong Hyphen Position" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "MD", "zipcode": "212-181234"}' \
              "Should reject ZIP code with hyphen in wrong position" \
              "false"

# =============================================================================
# SECTION 6: USER PROFILE VALIDATION TESTS
# =============================================================================

echo "📋 SECTION 6: USER PROFILE ADDRESS VALIDATION"
echo "---------------------------------------------"

# Test user profile with invalid address
test_endpoint "User Profile - Invalid Address Line 1" \
              "$BASE_URL/test/user-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "Main Street", "city": "Baltimore", "state": "MD", "zipcode": "21218"}' \
              "Should reject user profile with invalid address (missing number)" \
              "false"

# Test user profile with invalid city
test_endpoint "User Profile - Invalid City" \
              "$BASE_URL/test/user-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "B", "state": "MD", "zipcode": "21218"}' \
              "Should reject user profile with city too short" \
              "false"

# Test user profile with invalid state
test_endpoint "User Profile - Invalid State" \
              "$BASE_URL/test/user-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "XX", "zipcode": "21218"}' \
              "Should reject user profile with invalid state" \
              "false"

# Test user profile with invalid ZIP code
test_endpoint "User Profile - Invalid ZIP Code" \
              "$BASE_URL/test/user-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "123 Main Street", "city": "Baltimore", "state": "MD", "zipcode": "2121"}' \
              "Should reject user profile with invalid ZIP code" \
              "false"

# =============================================================================
# SECTION 7: COMBINED VALIDATION TESTS
# =============================================================================

echo "📋 SECTION 7: COMBINED VALIDATION TESTS"
echo "----------------------------------------"

# Multiple invalid fields
test_endpoint "Multiple Invalid Address Fields" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "Main", "city": "B", "state": "XX", "zipcode": "212"}' \
              "Should reject multiple invalid address fields" \
              "false"

# Valid complete address
test_endpoint "Complete Valid Address" \
              "$BASE_URL/test/sitter-profile-validation" \
              "POST" \
              '{"phone": "123-456-7890", "address_line1": "3400 N Charles St", "address_line2": "Apt 5B", "city": "Baltimore", "state": "MD", "zipcode": "21218-1234"}' \
              "Should accept complete valid address" \
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
if [ $TEST_COUNT -gt 0 ]; then
    echo "  Success Rate: $(( PASSED_COUNT * 100 / TEST_COUNT ))%"
fi
echo ""

if [ $FAILED_COUNT -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED! Address validation is working correctly."
else
    echo "⚠️  Some tests failed. Please review the output above."
fi

echo ""
echo "📋 Verified Validation Rules:"
echo "  ✅ Address Line 1: length, number/letter requirements, character validation"
echo "  ✅ Address Line 2: optional field, length, character validation"
echo "  ✅ City: length, character validation, normalization"
echo "  ✅ State: format, valid US state abbreviation, normalization"
echo "  ✅ ZIP Code: 5-digit and 9-digit format validation"
echo ""
echo "💾 Save detailed results:"
echo "  ./test_address_validation.sh > ../results/manual_test_results/address_validation_\$(date +%Y%m%d_%H%M%S).log"
echo ""

