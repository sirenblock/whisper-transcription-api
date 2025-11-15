#!/bin/bash

###############################################################################
# Environment Validation Script for WhisperAPI
#
# Validates all required environment variables are set correctly
#
# Usage: bash validate-env.sh [env-file]
# Example: bash validate-env.sh .env.production
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV_FILE=${1:-.env}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
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

# Validation counters
ERRORS=0
WARNINGS=0
REQUIRED_VARS=0
OPTIONAL_VARS=0

# Check if variable is set
check_var() {
    local var_name=$1
    local var_value=${!var_name}
    local required=${2:-true}
    local description=$3

    if [ -n "$var_value" ]; then
        print_success "$var_name is set"
        if [ "$required" = "true" ]; then
            ((REQUIRED_VARS++))
        else
            ((OPTIONAL_VARS++))
        fi
        return 0
    else
        if [ "$required" = "true" ]; then
            print_error "$var_name is MISSING (required) - $description"
            ((ERRORS++))
            return 1
        else
            print_warning "$var_name is not set (optional) - $description"
            ((WARNINGS++))
            return 0
        fi
    fi
}

# Validate URL format
validate_url() {
    local var_name=$1
    local var_value=${!var_name}
    local required=${2:-true}

    if [ -z "$var_value" ]; then
        if [ "$required" = "true" ]; then
            print_error "$var_name is required"
            ((ERRORS++))
            return 1
        fi
        return 0
    fi

    if [[ $var_value =~ ^https?:// ]]; then
        print_success "$var_name has valid URL format"
        return 0
    else
        print_error "$var_name has invalid URL format: $var_value"
        ((ERRORS++))
        return 1
    fi
}

# Validate PostgreSQL connection string
validate_postgres_url() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        print_error "$var_name is required"
        ((ERRORS++))
        return 1
    fi

    if [[ $var_value =~ ^postgres(ql)?:// ]]; then
        print_success "$var_name has valid PostgreSQL URL format"
        return 0
    else
        print_error "$var_name has invalid PostgreSQL URL format"
        ((ERRORS++))
        return 1
    fi
}

# Validate Redis connection string
validate_redis_url() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        print_error "$var_name is required"
        ((ERRORS++))
        return 1
    fi

    if [[ $var_value =~ ^redis:// ]]; then
        print_success "$var_name has valid Redis URL format"
        return 0
    else
        print_error "$var_name has invalid Redis URL format"
        ((ERRORS++))
        return 1
    fi
}

# Validate numeric value
validate_numeric() {
    local var_name=$1
    local var_value=${!var_name}
    local required=${2:-true}

    if [ -z "$var_value" ]; then
        if [ "$required" = "true" ]; then
            print_error "$var_name is required"
            ((ERRORS++))
            return 1
        fi
        return 0
    fi

    if [[ $var_value =~ ^[0-9]+$ ]]; then
        print_success "$var_name has valid numeric value: $var_value"
        return 0
    else
        print_error "$var_name has invalid numeric value: $var_value"
        ((ERRORS++))
        return 1
    fi
}

# Validate enum value
validate_enum() {
    local var_name=$1
    local var_value=${!var_name}
    shift 1
    local valid_values=("$@")

    if [ -z "$var_value" ]; then
        print_error "$var_name is required"
        ((ERRORS++))
        return 1
    fi

    for valid_value in "${valid_values[@]}"; do
        if [ "$var_value" = "$valid_value" ]; then
            print_success "$var_name has valid value: $var_value"
            return 0
        fi
    done

    print_error "$var_name has invalid value: $var_value (expected: ${valid_values[*]})"
    ((ERRORS++))
    return 1
}

###############################################################################
# Main Validation
###############################################################################
print_header "WhisperAPI Environment Validation"

print_info "Validating environment file: $ENV_FILE"
echo ""

# Load environment file
if [ -f "$ENV_FILE" ]; then
    print_success "Environment file found"
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    print_error "Environment file not found: $ENV_FILE"
    exit 1
fi

###############################################################################
# Database Configuration
###############################################################################
print_header "Database Configuration"

validate_postgres_url "DATABASE_URL"

###############################################################################
# Redis Configuration
###############################################################################
print_header "Redis Configuration"

validate_redis_url "REDIS_URL"

###############################################################################
# S3/R2 Storage Configuration
###############################################################################
print_header "S3/R2 Storage Configuration"

check_var "S3_BUCKET" true "S3 bucket name"
check_var "S3_REGION" true "S3 region (e.g., us-east-1)"
check_var "S3_ACCESS_KEY" true "S3 access key"
check_var "S3_SECRET_KEY" true "S3 secret key"

if [ -n "$S3_ENDPOINT" ]; then
    validate_url "S3_ENDPOINT" false
fi

###############################################################################
# Stripe Configuration
###############################################################################
print_header "Stripe Configuration"

check_var "STRIPE_SECRET_KEY" true "Stripe secret key (sk_live_xxx or sk_test_xxx)"
check_var "STRIPE_WEBHOOK_SECRET" true "Stripe webhook secret (whsec_xxx)"
check_var "STRIPE_PRICE_ID_PRO" true "Stripe Pro plan price ID"

# Validate Stripe key format
if [ -n "$STRIPE_SECRET_KEY" ]; then
    if [[ $STRIPE_SECRET_KEY =~ ^sk_(live|test)_ ]]; then
        if [[ $STRIPE_SECRET_KEY =~ ^sk_live_ ]]; then
            print_warning "Using LIVE Stripe keys - ensure this is production"
        else
            print_info "Using TEST Stripe keys"
        fi
    else
        print_error "STRIPE_SECRET_KEY has invalid format"
        ((ERRORS++))
    fi
fi

###############################################################################
# Worker Configuration
###############################################################################
print_header "Worker Configuration"

validate_enum "WORKER_MODE" "local" "cloud"

if [ "$WORKER_MODE" = "local" ]; then
    validate_url "LOCAL_WORKER_URL" true
    print_info "Using local worker mode"
elif [ "$WORKER_MODE" = "cloud" ]; then
    validate_url "CLOUD_WORKER_URL" true
    print_info "Using cloud worker mode"
fi

###############################################################################
# API Configuration
###############################################################################
print_header "API Configuration"

check_var "API_KEY_PREFIX" true "API key prefix (e.g., wtr_live_)"
validate_numeric "API_KEY_LENGTH" true
validate_numeric "PORT" false

validate_enum "NODE_ENV" "development" "production" "staging" "test"

###############################################################################
# Rate Limits
###############################################################################
print_header "Rate Limit Configuration"

validate_numeric "RATE_LIMIT_FREE" true
validate_numeric "RATE_LIMIT_PRO" true
validate_numeric "RATE_LIMIT_PAYG" true

###############################################################################
# Quotas
###############################################################################
print_header "Quota Configuration"

validate_numeric "QUOTA_FREE" true
validate_numeric "QUOTA_PRO" true

###############################################################################
# File Configuration
###############################################################################
print_header "File Upload Configuration"

validate_numeric "MAX_FILE_SIZE_MB" true

check_var "ALLOWED_FORMATS" true "Allowed file formats (comma-separated)"

if [ -n "$ALLOWED_FORMATS" ]; then
    print_info "Allowed formats: $ALLOWED_FORMATS"
fi

###############################################################################
# Cleanup Configuration
###############################################################################
print_header "Cleanup Configuration"

validate_numeric "FILE_RETENTION_HOURS" true

###############################################################################
# Security Checks
###############################################################################
print_header "Security Checks"

# Check for example/placeholder values
PLACEHOLDER_CHECKS=(
    "example.com"
    "xxx"
    "your-"
    "changeme"
    "password"
    "secret"
)

for placeholder in "${PLACEHOLDER_CHECKS[@]}"; do
    if grep -qi "$placeholder" "$ENV_FILE" 2>/dev/null; then
        print_warning "Found potential placeholder value: $placeholder"
        print_info "Please review $ENV_FILE for placeholder values"
    fi
done

# Check NODE_ENV
if [ "$NODE_ENV" = "production" ]; then
    print_info "Running in PRODUCTION mode"

    # Additional production checks
    if [[ $STRIPE_SECRET_KEY =~ ^sk_test_ ]]; then
        print_error "Using TEST Stripe key in PRODUCTION mode"
        ((ERRORS++))
    fi

    if [[ $DATABASE_URL =~ localhost ]]; then
        print_warning "Using localhost database in PRODUCTION mode"
        ((WARNINGS++))
    fi
else
    print_info "Running in ${NODE_ENV} mode"
fi

###############################################################################
# Summary
###############################################################################
print_header "Validation Summary"

echo "Environment file: $ENV_FILE"
echo "Required variables set: $REQUIRED_VARS"
echo "Optional variables set: $OPTIONAL_VARS"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
    print_success "Environment validation PASSED!"
    echo ""

    if [ $WARNINGS -gt 0 ]; then
        print_warning "Found $WARNINGS warning(s) - please review"
        echo ""
        exit 0
    fi

    print_info "Your environment is properly configured"
    echo ""
    exit 0
else
    print_error "Environment validation FAILED with $ERRORS error(s)"
    echo ""
    print_info "Please fix the errors above and run validation again"
    echo ""
    exit 1
fi
