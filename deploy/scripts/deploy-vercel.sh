#!/bin/bash

###############################################################################
# Vercel Deployment Script for WhisperAPI Frontend
#
# Deploys both Dashboard and Landing pages to Vercel
#
# Usage: bash deploy-vercel.sh [dashboard|landing|all]
# Example: bash deploy-vercel.sh all
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TARGET=${1:-all}

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

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI not found"
    print_info "Install with: npm install -g vercel"
    exit 1
fi
print_success "Vercel CLI installed"

# Check if logged in
if ! vercel whoami &> /dev/null; then
    print_warning "Not logged in to Vercel"
    print_info "Logging in..."
    vercel login
fi
print_success "Logged in to Vercel"

###############################################################################
# Deploy Dashboard
###############################################################################
deploy_dashboard() {
    print_header "Deploying Dashboard"

    cd frontend/dashboard

    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        print_warning ".env.production not found"
        if [ ! -f ".env" ]; then
            print_error "No environment file found"
            return 1
        fi
    fi

    # Build locally first to catch errors
    print_info "Building dashboard..."
    npm install
    npm run build

    print_success "Build successful"

    # Deploy to Vercel
    print_info "Deploying to Vercel..."

    if vercel --prod --yes; then
        print_success "Dashboard deployed successfully"

        # Get deployment URL
        DASHBOARD_URL=$(vercel ls --json 2>/dev/null | grep -o '"url":"[^"]*"' | head -n 1 | cut -d'"' -f4 || echo "")

        if [ -n "$DASHBOARD_URL" ]; then
            print_info "Dashboard URL: https://$DASHBOARD_URL"
        fi
    else
        print_error "Dashboard deployment failed"
        return 1
    fi

    cd ../..
}

###############################################################################
# Deploy Landing
###############################################################################
deploy_landing() {
    print_header "Deploying Landing Page"

    cd frontend/landing

    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        print_warning ".env.production not found"
        if [ ! -f ".env" ]; then
            print_error "No environment file found"
            return 1
        fi
    fi

    # Build locally first to catch errors
    print_info "Building landing page..."
    npm install
    npm run build

    print_success "Build successful"

    # Deploy to Vercel
    print_info "Deploying to Vercel..."

    if vercel --prod --yes; then
        print_success "Landing page deployed successfully"

        # Get deployment URL
        LANDING_URL=$(vercel ls --json 2>/dev/null | grep -o '"url":"[^"]*"' | head -n 1 | cut -d'"' -f4 || echo "")

        if [ -n "$LANDING_URL" ]; then
            print_info "Landing URL: https://$LANDING_URL"
        fi
    else
        print_error "Landing page deployment failed"
        return 1
    fi

    cd ../..
}

###############################################################################
# Main Deployment
###############################################################################
print_header "WhisperAPI Frontend Deployment"

case "$TARGET" in
    dashboard)
        deploy_dashboard
        ;;
    landing)
        deploy_landing
        ;;
    all)
        deploy_dashboard
        echo ""
        deploy_landing
        ;;
    *)
        print_error "Invalid target: $TARGET"
        print_info "Usage: $0 [dashboard|landing|all]"
        exit 1
        ;;
esac

###############################################################################
# Summary
###############################################################################
print_header "Deployment Summary"

echo "Timestamp: $(date)"
echo ""

if [ "$TARGET" = "dashboard" ] || [ "$TARGET" = "all" ]; then
    if [ -n "$DASHBOARD_URL" ]; then
        echo "Dashboard: https://$DASHBOARD_URL"
    fi
fi

if [ "$TARGET" = "landing" ] || [ "$TARGET" = "all" ]; then
    if [ -n "$LANDING_URL" ]; then
        echo "Landing: https://$LANDING_URL"
    fi
fi

echo ""
print_success "Deployment completed successfully!"
echo ""

print_info "Next steps:"
echo "  1. Test deployments in browser"
echo "  2. Configure custom domains in Vercel dashboard"
echo "  3. Set up production environment variables"
echo "  4. Enable analytics (optional)"
echo ""

print_info "Useful commands:"
echo "  • View deployments: vercel ls"
echo "  • View logs: vercel logs [url]"
echo "  • Rollback: vercel rollback [url]"
echo ""
