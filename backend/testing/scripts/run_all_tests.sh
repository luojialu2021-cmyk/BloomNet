#!/bin/bash

# Master test runner script
# Location: backend/testing/scripts/run_all_tests.sh
# Usage: ./run_all_tests.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="../results/manual_test_results"
SCRIPTS_DIR="."

# Create results directory
mkdir -p "$RESULTS_DIR"

echo "🧪 JHU Plant Care Platform - Complete API Backend Testing"
echo "========================================================="
echo "Timestamp: $(date)"
echo "Results will be saved to: $RESULTS_DIR"
echo ""

# Function to run a test script
run_test_script() {
    local script_name="$1"
    local module_name="$2"
    
    if [ -f "$SCRIPTS_DIR/$script_name" ]; then
        echo "🚀 Running $module_name API tests..."
        echo "------------------------------------"
        
        # Make script executable
        chmod +x "$SCRIPTS_DIR/$script_name"
        
        # Run the test and save results
        "$SCRIPTS_DIR/$script_name" > "$RESULTS_DIR/${module_name}_${TIMESTAMP}.log" 2>&1
        
        if [ $? -eq 0 ]; then
            echo "✅ $module_name tests completed successfully"
        else
            echo "❌ $module_name tests failed"
        fi
        
        echo "📄 Results saved to: $RESULTS_DIR/${module_name}_${TIMESTAMP}.log"
        echo ""
    else
        echo "⚠️  $script_name not found, skipping $module_name tests"
        echo ""
    fi
}

# Test server connectivity first
echo "🔍 Testing server connectivity..."
if curl -s "http://localhost:8000/docs" > /dev/null; then
    echo "✅ Backend server is running"
else
    echo "❌ Backend server is not running or not accessible"
    echo "Please start the backend server: python run.py"
    exit 1
fi
echo ""

# Run individual test scripts
run_test_script "test_listings_api.sh" "listings"
run_test_script "test_sitters_api.sh" "sitters"
run_test_script "test_reservations_api.sh" "reservations"
run_test_script "test_reviews_api.sh" "reviews"
run_test_script "test_address_validation.sh" "address_validation"
run_test_script "test_auth_api.sh" "auth"
run_test_script "test_payments_api.sh" "payments"
run_test_script "test_uploads_api.sh" "uploads"

# Generate summary report
SUMMARY_FILE="$RESULTS_DIR/test_summary_${TIMESTAMP}.txt"
echo "📋 Generating test summary report..."

{
    echo "JHU Plant Care Platform - API Testing Summary"
    echo "=============================================="
    echo "Test Run Timestamp: $(date)"
    echo "Results Directory: $RESULTS_DIR"
    echo ""
    echo "Test Results:"
    
    for log_file in "$RESULTS_DIR"/*_${TIMESTAMP}.log; do
        if [ -f "$log_file" ]; then
            filename=$(basename "$log_file")
            module_name=${filename%_${TIMESTAMP}.log}
            echo "- $module_name: $(wc -l < "$log_file") lines of output"
        fi
    done
    
    echo ""
    echo "Next Steps:"
    echo "1. Review individual test result files"
    echo "2. Check for any error responses"
    echo "3. Verify API functionality meets requirements"
    echo "4. Document any issues found"
    
} > "$SUMMARY_FILE"

echo "📊 Test summary saved to: $SUMMARY_FILE"
echo ""
echo "🎉 All API backend tests completed!"
echo "Results location: $RESULTS_DIR"
echo ""
echo "📖 To review results:"
echo "- Summary: cat $SUMMARY_FILE"
echo "- Individual tests: ls -la $RESULTS_DIR/*_${TIMESTAMP}.log"