# Test Results Directory

This directory stores all test execution results and logs.

## 📁 Directory Structure

- `manual_test_results/` - Output from curl-based manual tests
  - `nearby_api_test_results_20251006.md` - **Complete nearby API test report**
  - `listings_api_*.log` - Historical listings API test logs
  - `sitters_api_*.log` - Historical sitters API test logs  
  - `reservations_api_*.log` - Historical reservations API test logs
- `automated_test_results/` - Output from pytest automated tests
- `logs/` - Test execution logs

## 📝 File Naming Convention

### Manual Test Results
- Format: `{module}_{timestamp}.log`
- Example: `listings_20251003_084530.log`

### Automated Test Results
- HTML reports: `{module}_report_{timestamp}.html`
- Coverage reports: `coverage_report_{timestamp}/`
- JSON results: `{module}_results_{timestamp}.json`

## 🔍 Analyzing Results

### Manual Test Results
```bash
# View latest test results
cat manual_test_results/listings_*.log | tail -50

# View production-ready nearby API test report
less manual_test_results/nearby_api_test_results_20251006.md

# Search for errors across all logs
grep -i "error" manual_test_results/*.log

# Count successful API responses
grep -c "✅ PASSED" manual_test_results/*.log

# Check nearby API test results
grep -A 5 "JHU coordinates" manual_test_results/nearby_api_*.md
```

### Automated Test Results
```bash
# Open HTML report
open automated_test_results/listings_report_*.html

# View coverage summary
cat automated_test_results/coverage_report_*/index.html
```

## 🚨 Important Notes

- Test results contain sensitive API responses
- Do not commit actual test results to version control
- Archive old results periodically
- Review results for security implications before sharing