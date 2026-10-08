#!/bin/bash

# Ensure the script has executable permissions
if [ ! -x "$0" ]; then
    echo "Setting executable permissions for the script..."
    chmod +x "$0"
fi

# Check if the script is being executed with the correct shell
if [ -z "$BASH_VERSION" ]; then
    echo "This script must be run with bash. Please use: bash $0"
    exit 1
fi

# =============================================================================
# JHU Plant Care Platform - Reviews API Test Suite
# =============================================================================
# 
# This comprehensive test suite validates all Reviews API endpoints
# including CRUD operations, error handling, and edge cases.
# 
# Note: Most Reviews API endpoints require authentication.
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

echo "🌱 JHU Plant Care Platform - Reviews API Test Suite"
echo "===================================================="
echo "[$TIMESTAMP] Starting Reviews API Tests"
echo "[$TIMESTAMP] Base URL: $BASE_URL"

# Store created review IDs for later use
CREATED_REVIEW_IDS=()

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
    
    # Store created review IDs for later use
    if [ "$method" = "POST" ] && [ "$should_succeed" = "true" ]; then
        new_id=$(echo "$body" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['_id']) if '_id' in data else ''" 2>/dev/null)
        if [ -n "$new_id" ]; then
            CREATED_REVIEW_IDS+=("$new_id")
            echo "Captured new review ID: $new_id"
        fi
    fi
    
    echo ""
    echo "========================================"
}

echo ""
echo "🚀 STARTING REVIEWS API TESTS"
echo ""

# =============================================================================
# SECTION 1: CREATE REVIEWS
# =============================================================================

echo "📋 SECTION 1: CREATE REVIEWS"
echo "----------------------------------"

# Update test data to match the ReviewCreate model

test_endpoint "Create Review - Valid Data" \
              "$BASE_URL/reviews/" \
              "POST" \
              '{"reviewer_id": "507f1f77bcf86cd799439011", "reviewee_id": "507f1f77bcf86cd799439012", "reservation_id": "507f1f77bcf86cd799439013", "rating": 5, "review_txt": "Great service!", "creator_identity": "user"}' \
              "Should create a new review successfully" \
              "true"

test_endpoint "Create Review - Missing Required Fields" \
              "$BASE_URL/reviews/" \
              "POST" \
              '{"rating": 5}' \
              "Should return 422 Validation Error" \
              "false"

# Add multiple reviews in a single test

echo "📋 SECTION 1.1: BULK CREATE REVIEWS"
echo "----------------------------------"

declare -a reviews=(
    '{"reviewer_id": "507f1f77bcf86cd799439011", "reviewee_id": "507f1f77bcf86cd799439012", "reservation_id": "507f1f77bcf86cd799439013", "rating": 5, "review_txt": "Excellent service!", "creator_identity": "user"}'
    '{"reviewer_id": "507f1f77bcf86cd799439014", "reviewee_id": "507f1f77bcf86cd799439015", "reservation_id": "507f1f77bcf86cd799439016", "rating": 4, "review_txt": "Good job!", "creator_identity": "sitter"}'
    '{"reviewer_id": "507f1f77bcf86cd799439017", "reviewee_id": "507f1f77bcf86cd799439018", "reservation_id": "507f1f77bcf86cd799439019", "rating": 3.5, "review_txt": "Average experience.", "creator_identity": "user"}'
)

for i in "${!reviews[@]}"; do
    test_endpoint "Bulk Create Review #$((i+1))" \
                  "$BASE_URL/reviews/" \
                  "POST" \
                  "${reviews[$i]}" \
                  "Should create review #$((i+1)) successfully" \
                  "true"
done

# Expand bulk creation with more diverse reviews

declare -a reviews=(
    '{"reviewer_id": "507f1f77bcf86cd799439020", "reviewee_id": "507f1f77bcf86cd799439021", "reservation_id": "507f1f77bcf86cd799439022", "rating": 2, "review_txt": "Not great.", "creator_identity": "user"}'
    '{"reviewer_id": "507f1f77bcf86cd799439023", "reviewee_id": "507f1f77bcf86cd799439024", "reservation_id": "507f1f77bcf86cd799439025", "rating": 4.5, "review_txt": "Very good!", "creator_identity": "sitter"}'
    '{"reviewer_id": "507f1f77bcf86cd799439026", "reviewee_id": "507f1f77bcf86cd799439027", "reservation_id": "507f1f77bcf86cd799439028", "rating": 1, "review_txt": "Terrible experience.", "creator_identity": "user"}'
)

for i in "${!reviews[@]}"; do
    test_endpoint "Bulk Create Review #$((i+4))" \
                  "$BASE_URL/reviews/" \
                  "POST" \
                  "${reviews[$i]}" \
                  "Should create review #$((i+4)) successfully" \
                  "true"
done

# =============================================================================
# SECTION 2: SEARCH REVIEWS
# =============================================================================

echo "📋 SECTION 2: SEARCH REVIEWS"
echo "----------------------------------"

# Ensure all GET requests include trailing slashes

test_endpoint "Get Review by Reservation ID" \
              "$BASE_URL/reviews/507f1f77bcf86cd799439013/" \
              "GET" \
              "" \
              "Should return the created review" \
              "true"

test_endpoint "Get Review - Non-existent Reservation ID" \
              "$BASE_URL/reviews/507f1f77bcf86cd799439099/" \
              "GET" \
              "" \
              "Should return 404 Review not found" \
              "false"

# Add bulk retrieval tests

declare -a reservation_ids=(
    "507f1f77bcf86cd799439022/"
    "507f1f77bcf86cd799439025/"
    "507f1f77bcf86cd799439028/"
)

for i in "${!reservation_ids[@]}"; do
    test_endpoint "Get Review by Reservation ID #$((i+1))" \
                  "$BASE_URL/reviews/${reservation_ids[$i]}" \
                  "GET" \
                  "" \
                  "Should return the created review for reservation_id ${reservation_ids[$i]}" \
                  "true"
done

# =============================================================================
# SECTION 3: DELETE REVIEWS
# =============================================================================

echo "📋 SECTION 3: DELETE REVIEWS"
echo "----------------------------------"

# Use stored IDs for DELETE tests
if [ ${#CREATED_REVIEW_IDS[@]} -gt 0 ]; then
    REVIEW_ID=${CREATED_REVIEW_IDS[0]}
else
    echo "❌ FAILED: No stored review IDs available for deletion."
    exit 1
fi

echo "Using stored review ID for deletion: $REVIEW_ID"

# Add debug information to verify stored IDs and DELETE request

# Debug: Print all stored review IDs
if [ ${#CREATED_REVIEW_IDS[@]} -gt 0 ]; then
    echo "Debug: Stored review IDs: ${CREATED_REVIEW_IDS[@]}"
else
    echo "Debug: No review IDs stored. Check POST requests."
fi

# Debug: Print the review ID being used for deletion
if [ -n "$REVIEW_ID" ]; then
    echo "Debug: Using review ID for deletion: $REVIEW_ID"
else
    echo "Debug: REVIEW_ID is empty."
fi

# Debug: Print DELETE request URL
DELETE_URL="$BASE_URL/reviews/delete/$REVIEW_ID/"
echo "Debug: DELETE request URL: $DELETE_URL"

# Debug: Print the HTTP method being used for the DELETE request
echo "Debug: HTTP Method: DELETE"

# Debug: Print the base URL being used
echo "Debug: Base URL: $BASE_URL"

# Debug: Print the full DELETE request command for manual verification
echo "Debug: Full DELETE Command: curl -X DELETE \"$DELETE_URL\""

test_endpoint "Delete Review - Valid ID" \
              "$BASE_URL/reviews/delete/$REVIEW_ID/" \
              "DELETE" \
              "" \
              "Should delete the review successfully" \
              "true"

test_endpoint "Delete Review - Non-existent ID" \
              "$BASE_URL/reviews/delete/507f1f77bcf86cd799439099/" \
              "DELETE" \
              "" \
              "Should return 404 Review not found" \
              "false"
              
# ==========================================================================
# TEST SUMMARY AND RESULTS
# ==========================================================================

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
    echo "🎉 ALL TESTS PASSED! Reviews API is working correctly."
else
    echo "⚠️  Some tests failed. Please review the output above."
fi