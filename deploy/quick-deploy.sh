#!/bin/bash

###############################################################################
# WhisperAPI Quick Deploy Script
#
# One-command deployment for the entire WhisperAPI stack
#
# Usage: bash quick-deploy.sh [environment]
# Example: bash quick-deploy.sh production
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

ENVIRONMENT=${1:-production}

print_banner() {
    echo ""
    echo -e "${MAGENTA}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║              WhisperAPI Quick Deploy                         ║"
    echo "║              Production Deployment Tool                      ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}→ Step $1:${NC} $2"
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

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Error handler
error_exit() {
    print_error "$1"
    exit 1
}

###############################################################################
# Display Banner
###############################################################################
print_banner

echo "Environment: ${ENVIRONMENT}"
echo "Timestamp: $(date)"
echo ""

###############################################################################
# Step 1: Pre-flight Checks
###############################################################################
print_step "1/8" "Pre-flight Checks"

# Check Node.js
if ! command -v node &> /dev/null; then
    error_exit "Node.js not found. Please install Node.js 20+"
fi
print_success "Node.js installed: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    error_exit "npm not found"
fi
print_success "npm installed: $(npm --version)"

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    print_warning "Railway CLI not found"
    read -p "Install Railway CLI now? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        npm install -g @railway/cli
        print_success "Railway CLI installed"
    else
        error_exit "Railway CLI required for deployment"
    fi
else
    print_success "Railway CLI installed"
fi

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found"
    read -p "Install Vercel CLI now? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        npm install -g vercel
        print_success "Vercel CLI installed"
    else
        print_warning "Skipping frontend deployment (Vercel CLI not available)"
    fi
else
    print_success "Vercel CLI installed"
fi

echo ""

###############################################################################
# Step 2: Validate Environment
###############################################################################
print_step "2/8" "Validate Environment Configuration"

if [ -f "backend/.env.${ENVIRONMENT}" ]; then
    ENV_FILE="backend/.env.${ENVIRONMENT}"
elif [ -f "backend/.env" ]; then
    ENV_FILE="backend/.env"
else
    error_exit "No environment file found. Please create backend/.env"
fi

print_info "Using environment file: $ENV_FILE"

# Run validation
if bash deploy/scripts/validate-env.sh "$ENV_FILE"; then
    print_success "Environment validation passed"
else
    error_exit "Environment validation failed. Please fix errors above."
fi

echo ""

###############################################################################
# Step 3: Run Tests
###############################################################################
print_step "3/8" "Run Deployment Tests"

cd deploy
if ! npm install &> /dev/null; then
    error_exit "Failed to install deployment dependencies"
fi

if npm test; then
    print_success "All deployment tests passed"
else
    error_exit "Deployment tests failed"
fi

cd ..
echo ""

###############################################################################
# Step 4: Deploy API to Railway
###############################################################################
print_step "4/8" "Deploy API to Railway"

read -p "Deploy API to Railway? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    if bash deploy/scripts/deploy-railway.sh "$ENVIRONMENT"; then
        print_success "API deployed to Railway"
    else
        error_exit "Railway deployment failed"
    fi
else
    print_warning "Skipped Railway deployment"
fi

echo ""

###############################################################################
# Step 5: Deploy Frontend to Vercel
###############################################################################
print_step "5/8" "Deploy Frontend to Vercel"

if command -v vercel &> /dev/null; then
    read -p "Deploy frontend to Vercel? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        if bash deploy/scripts/deploy-vercel.sh all; then
            print_success "Frontend deployed to Vercel"
        else
            print_warning "Frontend deployment had issues"
        fi
    else
        print_warning "Skipped Vercel deployment"
    fi
else
    print_warning "Skipped Vercel deployment (CLI not available)"
fi

echo ""

###############################################################################
# Step 6: Setup Worker
###############################################################################
print_step "6/8" "Setup Worker Connection"

echo ""
print_info "Choose worker setup method:"
echo "  1) Tailscale (Secure VPN - Recommended)"
echo "  2) Cloudflare Tunnel (Public HTTPS)"
echo "  3) Skip (already configured)"
echo ""

read -p "Enter choice [1-3]: " -n 1 -r
echo

case "$REPLY" in
    1)
        print_info "Setting up Tailscale..."
        bash deploy/tailscale-setup.sh
        ;;
    2)
        print_info "Setting up Cloudflare Tunnel..."
        bash deploy/cloudflare-tunnel-setup.sh
        ;;
    3)
        print_info "Skipping worker setup"
        ;;
    *)
        print_warning "Invalid choice, skipping worker setup"
        ;;
esac

echo ""

###############################################################################
# Step 7: Run Health Checks
###############################################################################
print_step "7/8" "Run Health Checks"

read -p "Run health checks? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    sleep 5  # Wait for services to stabilize

    if bash deploy/scripts/health-check.sh; then
        print_success "All health checks passed"
    else
        print_warning "Some health checks failed (this may be expected if worker is not running)"
    fi
else
    print_info "Skipped health checks"
fi

echo ""

###############################################################################
# Step 8: Summary
###############################################################################
print_header "Deployment Summary"

echo "Environment: ${ENVIRONMENT}"
echo "Timestamp: $(date)"
echo ""

print_success "Deployment process completed!"
echo ""

print_info "Next steps:"
echo ""
echo "1. Verify API deployment:"
echo "   ${GREEN}railway status${NC}"
echo "   ${GREEN}railway logs${NC}"
echo ""

echo "2. Verify frontend deployment:"
echo "   ${GREEN}vercel ls${NC}"
echo ""

echo "3. Test the application:"
echo "   ${GREEN}bash deploy/scripts/health-check.sh${NC}"
echo ""

echo "4. Configure custom domains (if needed)"
echo ""

echo "5. Monitor logs:"
echo "   • Railway: ${GREEN}railway logs --follow${NC}"
echo "   • Vercel: ${GREEN}vercel logs [url] --follow${NC}"
echo "   • Worker: ${GREEN}pm2 logs whisperapi-worker${NC}"
echo ""

print_info "Documentation:"
echo "  • Deployment Guide: README_DEPLOY.md"
echo "  • Integration Notes: TASK13_INTEGRATION_NOTES.md"
echo "  • Deliverables: TASK13_DELIVERABLES.md"
echo ""

print_success "🎉 WhisperAPI deployment complete!"
echo ""
