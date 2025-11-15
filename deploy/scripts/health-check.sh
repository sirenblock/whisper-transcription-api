#!/bin/bash

###############################################################################
# Health Check Script for WhisperAPI
#
# Validates all components of the deployment are running correctly
#
# Usage: bash health-check.sh [environment]
# Example: bash health-check.sh production
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${1:-production}
CONFIG_FILE="${2:-.env}"

# Load environment variables
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

# Print functions
print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

print_check() {
    echo -e "${BLUE}→${NC} Checking $1..."
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Health check function
check_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}

    print_check "$name"

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1)

    if [ "$response" = "$expected_status" ]; then
        print_success "$name is healthy (HTTP $response)"
        return 0
    else
        print_error "$name returned HTTP $response (expected $expected_status)"
        return 1
    fi
}

# Check JSON response
check_json_endpoint() {
    local name=$1
    local url=$2
    local expected_key=$3

    print_check "$name"

    response=$(curl -s "$url" 2>&1)

    if echo "$response" | grep -q "\"$expected_key\""; then
        print_success "$name is healthy"
        echo "    Response: $response"
        return 0
    else
        print_error "$name failed"
        echo "    Response: $response"
        return 1
    fi
}

# Track failures
FAILURES=0

###############################################################################
# Check API Backend
###############################################################################
print_header "API Backend Health Check"

if [ -z "$API_URL" ]; then
    print_warning "API_URL not set, using default"
    API_URL="http://localhost:3000"
fi

if check_json_endpoint "API Health Endpoint" "$API_URL/health" "status"; then
    :
else
    ((FAILURES++))
fi

if check_endpoint "API Root" "$API_URL" 200; then
    :
else
    ((FAILURES++))
fi

###############################################################################
# Check Database
###############################################################################
print_header "Database Health Check"

if [ -n "$DATABASE_URL" ]; then
    print_check "Database connection"

    # Extract host from DATABASE_URL
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

    if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
        if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
            print_success "Database is reachable at $DB_HOST:$DB_PORT"
        else
            print_error "Database is not reachable at $DB_HOST:$DB_PORT"
            ((FAILURES++))
        fi
    else
        print_warning "Could not parse database host/port"
    fi
else
    print_warning "DATABASE_URL not set, skipping database check"
fi

###############################################################################
# Check Redis
###############################################################################
print_header "Redis Health Check"

if [ -n "$REDIS_URL" ]; then
    print_check "Redis connection"

    # Extract host from REDIS_URL
    REDIS_HOST=$(echo "$REDIS_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    if [ -z "$REDIS_HOST" ]; then
        REDIS_HOST=$(echo "$REDIS_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    fi
    REDIS_PORT=$(echo "$REDIS_URL" | sed -n 's/.*:\([0-9]*\)$/\1/p')

    if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
        if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
            print_success "Redis is reachable at $REDIS_HOST:$REDIS_PORT"
        else
            print_error "Redis is not reachable at $REDIS_HOST:$REDIS_PORT"
            ((FAILURES++))
        fi
    else
        print_warning "Could not parse Redis host/port"
    fi
else
    print_warning "REDIS_URL not set, skipping Redis check"
fi

###############################################################################
# Check Worker
###############################################################################
print_header "Worker Health Check"

WORKER_URL=""
if [ "$WORKER_MODE" = "local" ] && [ -n "$LOCAL_WORKER_URL" ]; then
    WORKER_URL="$LOCAL_WORKER_URL"
elif [ "$WORKER_MODE" = "cloud" ] && [ -n "$CLOUD_WORKER_URL" ]; then
    WORKER_URL="$CLOUD_WORKER_URL"
fi

if [ -n "$WORKER_URL" ]; then
    if check_json_endpoint "Worker ($WORKER_MODE)" "$WORKER_URL/health" "status"; then
        :
    else
        print_warning "Worker is not responding (this may be normal if not running)"
    fi
else
    print_warning "WORKER_URL not configured, skipping worker check"
fi

###############################################################################
# Check S3/R2 Storage
###############################################################################
print_header "S3 Storage Health Check"

if [ -n "$S3_BUCKET" ] && [ -n "$S3_ACCESS_KEY" ]; then
    print_check "S3 bucket accessibility"

    # This is a basic check - in production, you'd use AWS CLI
    if [ -n "$S3_ENDPOINT" ]; then
        S3_HOST=$(echo "$S3_ENDPOINT" | sed 's|https\?://||' | sed 's|/.*||')
        if curl -s -I "$S3_ENDPOINT" > /dev/null 2>&1; then
            print_success "S3 endpoint is reachable"
        else
            print_warning "S3 endpoint returned an error (may need authentication)"
        fi
    else
        print_success "S3 configuration exists"
    fi
else
    print_warning "S3 not configured, skipping storage check"
fi

###############################################################################
# Check Frontend
###############################################################################
print_header "Frontend Health Check"

if [ -n "$DASHBOARD_URL" ]; then
    if check_endpoint "Dashboard" "$DASHBOARD_URL" 200; then
        :
    else
        print_warning "Dashboard is not accessible"
    fi
else
    print_warning "DASHBOARD_URL not set, skipping frontend check"
fi

if [ -n "$LANDING_URL" ]; then
    if check_endpoint "Landing Page" "$LANDING_URL" 200; then
        :
    else
        print_warning "Landing page is not accessible"
    fi
else
    print_warning "LANDING_URL not set, skipping landing page check"
fi

###############################################################################
# Check External Services
###############################################################################
print_header "External Services Health Check"

# Stripe
if [ -n "$STRIPE_SECRET_KEY" ]; then
    print_check "Stripe API"
    if curl -s -u "$STRIPE_SECRET_KEY:" https://api.stripe.com/v1/customers?limit=1 > /dev/null 2>&1; then
        print_success "Stripe API is accessible"
    else
        print_error "Stripe API is not accessible"
        ((FAILURES++))
    fi
else
    print_warning "STRIPE_SECRET_KEY not set, skipping Stripe check"
fi

###############################################################################
# Summary
###############################################################################
print_header "Health Check Summary"

echo "Environment: $ENVIRONMENT"
echo "Timestamp: $(date)"
echo ""

if [ $FAILURES -eq 0 ]; then
    print_success "All critical components are healthy!"
    echo ""
    exit 0
else
    print_error "Found $FAILURES critical issue(s)"
    echo ""
    exit 1
fi
