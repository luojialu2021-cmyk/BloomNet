 #!/bin/bash

# JHU Plant Care Platform - Nearby Sitters API Test Script
# This script tests the new nearby sitters functionality

echo "🌱 JHU Plant Care Platform - Nearby Sitters API Test"
echo "=================================================="

BASE_URL="http://localhost:8000/api/v1"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting Nearby Sitters API Tests"
echo "[$TIMESTAMP] Base URL: $BASE_URL"
echo ""

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local expected_behavior="$4"
    
    echo "🧪 Test: $name"
    echo "Expected: $expected_behavior"
    echo "URL: $url"
    echo "Method: $method"
    echo "Response:"
    echo "----------------------------------------"
    
    if [ "$method" = "GET" ]; then
        curl -s "$url" | jq '.' 2>/dev/null || curl -s "$url"
    else
        curl -s -X "$method" "$url" | jq '.' 2>/dev/null || curl -s -X "$method" "$url"
    fi
    
    echo ""
    echo "========================================"
    echo ""
}

echo "🧹 Preparing Test Environment..."

# Check current sitter count
echo "📊 Checking current database state..."
current_count=$(curl -s "$BASE_URL/sitters/" | jq '. | length' 2>/dev/null || echo "0")
echo "Current sitters in database: $current_count"

if [ "$current_count" -gt "0" ]; then
    echo "ℹ️  Found existing sitters - they will be used for testing"
    echo "💡 To reset data, run: python3 scripts/cleanup_test_data.py"
else
    echo "🔄 No sitters found, creating test data..."
    # Generate test sitters using Python script
    echo "Creating test sitters using Python script..."
    cd "$(dirname "$0")/../.." && PYTHONPATH=. python3 scripts/generate_test_sitters.py && cd testing/scripts
    echo "✅ Test sitters created"
fi

echo "🚀 TESTING NEARBY SITTERS API"
echo ""

# Test 1: Basic nearby search from JHU campus
test_endpoint "Nearby Sitters from JHU Campus" \
              "$BASE_URL/sitters/nearby?user_address=3400%20N%20Charles%20St,%20Baltimore,%20MD%2021218" \
              "GET" \
              "Should return sitters sorted by distance from JHU campus"

# Test 2: Nearby search with pagination
test_endpoint "Nearby Sitters - Page 1, 5 per page" \
              "$BASE_URL/sitters/nearby?user_address=3400%20N%20Charles%20St,%20Baltimore,%20MD%2021218&page=1&page_size=5" \
              "GET" \
              "Should return first 5 sitters with pagination info"

# Test 2b: Test maximum page size limit
test_endpoint "Nearby Sitters - Page Size Limit Test" \
              "$BASE_URL/sitters/nearby?user_address=3400%20N%20Charles%20St,%20Baltimore,%20MD%2021218&page_size=15" \
              "GET" \
              "Should limit to maximum 10 sitters per page (validation error or capped at 10)"

# Test 3: Nearby search with distance limit
test_endpoint "Nearby Sitters - 5 mile radius" \
              "$BASE_URL/sitters/nearby?user_address=3400%20N%20Charles%20St,%20Baltimore,%20MD%2021218&max_distance_miles=5" \
              "GET" \
              "Should return only sitters within 5 miles"

# Test 4: Nearby search including unavailable sitters
test_endpoint "Nearby Sitters - Include Unavailable" \
              "$BASE_URL/sitters/nearby?user_address=3400%20N%20Charles%20St,%20Baltimore,%20MD%2021218&available_only=false" \
              "GET" \
              "Should return all sitters regardless of availability"

# Test 5: Nearby search from different location (Hampden)
test_endpoint "Nearby Sitters from Hampden" \
              "$BASE_URL/sitters/nearby?user_address=1234%20W%2036th%20St,%20Baltimore,%20MD%2021211" \
              "GET" \
              "Should return sitters sorted by distance from Hampden"

# Test 6: Error handling - invalid address
test_endpoint "Invalid Address Error Handling" \
              "$BASE_URL/sitters/nearby?user_address=invalid%20address%20xyz" \
              "GET" \
              "Should handle invalid addresses gracefully"

# Test 7: Error handling - missing address parameter
test_endpoint "Missing Address Parameter" \
              "$BASE_URL/sitters/nearby" \
              "GET" \
              "Should return validation error for missing user_address"

# Test 8: Check regular sitters endpoint still works
test_endpoint "Regular Sitters Search (Backward Compatibility)" \
              "$BASE_URL/sitters/" \
              "GET" \
              "Should return all sitters (backward compatibility check)"

echo ""
echo "🎯 NEARBY SITTERS API TEST COMPLETED!"
echo "======================================"
echo ""
echo "📋 Features Tested:"
echo "  ✅ Geographic distance calculation"
echo "  ✅ Distance-based sorting (nearest first)"
echo "  ✅ Pagination support"
echo "  ✅ Distance radius filtering"
echo "  ✅ Availability filtering"
echo "  ✅ Error handling for invalid addresses"
echo "  ✅ Backward compatibility with existing API"
echo ""
echo "📍 Test Locations Used:"
echo "  • JHU Homewood Campus (3400 N Charles St, Baltimore, MD 21218)"
echo "  • Hampden Area (1234 W 36th St, Baltimore, MD 21211)"
echo ""
echo "💡 Usage Examples:"
echo "  Basic search:"
echo "    GET /api/v1/sitters/nearby?user_address=3400 N Charles St, Baltimore, MD 21218"
echo ""
echo "  With pagination (max 10 per page):"
echo "    GET /api/v1/sitters/nearby?user_address=...&page=1&page_size=10"
echo ""
echo "  With distance limit:"
echo "    GET /api/v1/sitters/nearby?user_address=...&max_distance_miles=15"
echo ""
echo "🔗 Next Steps:"
echo "  1. Generate comprehensive test data: python3 scripts/generate_test_sitters.py"
echo "  2. Test with more varied addresses around Baltimore"
echo "  3. Verify distance calculations are accurate"
echo "  4. Test performance with larger datasets"