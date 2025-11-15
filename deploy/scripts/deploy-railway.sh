#!/bin/bash

###############################################################################
# Railway Deployment Script for WhisperAPI
#
# Automates deployment to Railway with proper configuration
#
# Usage: bash deploy-railway.sh [environment]
# Example: bash deploy-railway.sh production
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVIRONMENT=${1:-production}

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

###############################################################################
# Pre-flight Checks
###############################################################################
print_header "Pre-flight Checks"

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI not found"
    print_info "Install with: npm install -g @railway/cli"
    exit 1
fi
print_success "Railway CLI installed"

# Check if logged in
if ! railway whoami &> /dev/null; then
    print_warning "Not logged in to Railway"
    print_info "Logging in..."
    railway login
fi
print_success "Logged in to Railway"

# Check if project is linked
if ! railway status &> /dev/null; then
    print_warning "No Railway project linked"
    print_info "Please link a project or create a new one:"
    echo "  1. Create new: railway init"
    echo "  2. Link existing: railway link"
    exit 1
fi
print_success "Railway project linked"

###############################################################################
# Environment Setup
###############################################################################
print_header "Environment Configuration"

# Check if .env file exists
if [ ! -f "backend/.env.${ENVIRONMENT}" ]; then
    print_warning ".env.${ENVIRONMENT} not found"
    if [ -f "backend/.env" ]; then
        print_info "Using backend/.env instead"
        ENV_FILE="backend/.env"
    else
        print_error "No environment file found"
        exit 1
    fi
else
    ENV_FILE="backend/.env.${ENVIRONMENT}"
fi

print_success "Using environment file: $ENV_FILE"

###############################################################################
# Database Setup
###############################################################################
print_header "Database Configuration"

# Check if PostgreSQL is added
SERVICES=$(railway service list 2>&1)

if echo "$SERVICES" | grep -q "postgres"; then
    print_success "PostgreSQL service found"
else
    print_warning "PostgreSQL not found"
    read -p "Add PostgreSQL now? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        railway add --plugin postgresql
        print_success "PostgreSQL added"
    else
        print_error "PostgreSQL required for deployment"
        exit 1
    fi
fi

###############################################################################
# Redis Setup
###############################################################################
print_header "Redis Configuration"

if echo "$SERVICES" | grep -q "redis"; then
    print_success "Redis service found"
else
    print_warning "Redis not found"
    read -p "Add Redis now? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        railway add --plugin redis
        print_success "Redis added"
    else
        print_error "Redis required for deployment"
        exit 1
    fi
fi

###############################################################################
# Environment Variables
###############################################################################
print_header "Setting Environment Variables"

print_info "Loading variables from $ENV_FILE"

# Read and set environment variables
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ ]] && continue
    [[ -z $key ]] && continue

    # Remove quotes from value
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

    # Skip DATABASE_URL and REDIS_URL (Railway provides these)
    if [[ $key == "DATABASE_URL" ]] || [[ $key == "REDIS_URL" ]]; then
        print_info "Skipping $key (Railway managed)"
        continue
    fi

    # Set variable
    if [ -n "$value" ]; then
        railway variables set "$key=$value" --environment "$ENVIRONMENT" 2>/dev/null || true
        print_success "Set $key"
    fi
done < "$ENV_FILE"

# Ensure NODE_ENV is set
railway variables set "NODE_ENV=$ENVIRONMENT" --environment "$ENVIRONMENT"
print_success "Set NODE_ENV=$ENVIRONMENT"

###############################################################################
# Build and Deploy
###############################################################################
print_header "Building and Deploying"

print_info "Running deployment..."

# Deploy using railway.json configuration
cd "$(dirname "$0")/../.."
railway up --detach

print_success "Deployment initiated"

###############################################################################
# Database Migration
###############################################################################
print_header "Database Migration"

print_info "Waiting for deployment to complete..."
sleep 10

print_info "Running Prisma migrations..."
railway run --environment "$ENVIRONMENT" "cd backend && npx prisma migrate deploy"

print_success "Migrations completed"

###############################################################################
# Health Check
###############################################################################
print_header "Health Check"

# Get deployment URL
RAILWAY_URL=$(railway domain 2>&1 | grep "https://" || echo "")

if [ -n "$RAILWAY_URL" ]; then
    print_info "Deployment URL: $RAILWAY_URL"

    print_info "Waiting for service to start..."
    sleep 15

    # Check health endpoint
    HEALTH_URL="${RAILWAY_URL}/health"
    print_info "Checking health endpoint: $HEALTH_URL"

    RESPONSE=$(curl -s "$HEALTH_URL" || echo "error")

    if echo "$RESPONSE" | grep -q "status"; then
        print_success "Health check passed!"
        echo "    Response: $RESPONSE"
    else
        print_warning "Health check returned unexpected response"
        echo "    Response: $RESPONSE"
        print_info "Check Railway logs: railway logs"
    fi
else
    print_warning "Could not get deployment URL"
    print_info "Run 'railway domain' to get your URL"
fi

###############################################################################
# Summary
###############################################################################
print_header "Deployment Summary"

echo "Environment: $ENVIRONMENT"
echo "Timestamp: $(date)"
echo ""

if [ -n "$RAILWAY_URL" ]; then
    echo "Deployment URL: $RAILWAY_URL"
    echo "Health Check: ${RAILWAY_URL}/health"
    echo ""
fi

print_success "Deployment completed successfully!"
echo ""

print_info "Next steps:"
echo "  1. Check logs: railway logs --follow"
echo "  2. View dashboard: railway open"
echo "  3. Test API: curl ${RAILWAY_URL}/health"
echo "  4. Configure custom domain (if needed)"
echo ""

print_info "To rollback if needed:"
echo "  railway rollback"
echo ""
