#!/bin/bash

# Test Runner for Cloud Worker
# Runs all tests and generates coverage reports

set -e

echo "🧪 Running Cloud Worker Tests"
echo "============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

FAILED=0

# Python tests
echo -e "${YELLOW}Running Python tests...${NC}"
if pytest tests/test_modal_worker.py -v --cov --cov-report=term --cov-report=html; then
    echo -e "${GREEN}✅ Python tests passed${NC}"
else
    echo -e "${RED}❌ Python tests failed${NC}"
    FAILED=1
fi

echo ""

# JavaScript tests
echo -e "${YELLOW}Running JavaScript tests...${NC}"
if npm test; then
    echo -e "${GREEN}✅ JavaScript tests passed${NC}"
else
    echo -e "${RED}❌ JavaScript tests failed${NC}"
    FAILED=1
fi

echo ""

# Integration test (if Modal is configured)
if command -v modal &> /dev/null && modal token check &> /dev/null; then
    echo -e "${YELLOW}Running integration test...${NC}"

    if modal run modal_worker.py::health_check; then
        echo -e "${GREEN}✅ Integration test passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Integration test skipped (worker not deployed)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Integration test skipped (Modal not configured)${NC}"
fi

echo ""
echo "============================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "Coverage reports:"
    echo "  Python: htmlcov/index.html"
    echo "  JavaScript: coverage/lcov-report/index.html"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
