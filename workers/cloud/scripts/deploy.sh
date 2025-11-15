#!/bin/bash

# Cloud Worker Deployment Script
# Deploys Modal worker and configures backend

set -e

echo "🚀 Cloud Worker Deployment Script"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Modal is installed
if ! command -v modal &> /dev/null; then
    echo -e "${RED}❌ Modal CLI not found${NC}"
    echo "Installing Modal..."
    pip install modal
fi

# Check if authenticated
echo -e "${YELLOW}Checking Modal authentication...${NC}"
if ! modal token check &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with Modal${NC}"
    echo "Please authenticate:"
    modal token new
fi

# Install Python dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
pip install -r requirements.txt

# Check for secrets
echo -e "${YELLOW}Checking Modal secrets...${NC}"
if ! modal secret list | grep -q "whisper-secrets"; then
    echo -e "${RED}❌ Secret 'whisper-secrets' not found${NC}"
    echo ""
    echo "Please create secrets in Modal dashboard:"
    echo "  1. Go to: https://modal.com/secrets"
    echo "  2. Create secret named: whisper-secrets"
    echo "  3. Add these variables:"
    echo "     - S3_ACCESS_KEY"
    echo "     - S3_SECRET_KEY"
    echo "     - S3_BUCKET"
    echo "     - S3_REGION"
    echo "     - S3_ENDPOINT (optional for R2)"
    echo ""
    read -p "Press enter when secrets are configured..."
fi

# Deploy worker
echo -e "${YELLOW}Deploying Modal worker...${NC}"
modal deploy modal_worker.py

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Worker deployed successfully!${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Get deployment URL
echo -e "${YELLOW}Getting deployment URL...${NC}"
WORKER_URL=$(modal function list --json 2>/dev/null | grep -o 'https://[^"]*whisper-transcription[^"]*' | head -1)

if [ -z "$WORKER_URL" ]; then
    echo -e "${YELLOW}⚠️  Could not auto-detect worker URL${NC}"
    echo "Please check Modal dashboard for your deployment URL"
else
    echo -e "${GREEN}Worker URL: $WORKER_URL${NC}"

    # Update backend .env if it exists
    BACKEND_ENV="../../../backend/.env"
    if [ -f "$BACKEND_ENV" ]; then
        echo -e "${YELLOW}Updating backend .env...${NC}"

        # Backup existing .env
        cp "$BACKEND_ENV" "$BACKEND_ENV.backup"

        # Update or add CLOUD_WORKER_URL
        if grep -q "CLOUD_WORKER_URL" "$BACKEND_ENV"; then
            sed -i.bak "s|CLOUD_WORKER_URL=.*|CLOUD_WORKER_URL=$WORKER_URL|" "$BACKEND_ENV"
        else
            echo "CLOUD_WORKER_URL=$WORKER_URL" >> "$BACKEND_ENV"
        fi

        # Update WORKER_MODE to cloud
        if grep -q "WORKER_MODE" "$BACKEND_ENV"; then
            sed -i.bak "s|WORKER_MODE=.*|WORKER_MODE=cloud|" "$BACKEND_ENV"
        else
            echo "WORKER_MODE=cloud" >> "$BACKEND_ENV"
        fi

        rm -f "$BACKEND_ENV.bak"
        echo -e "${GREEN}✅ Backend .env updated${NC}"
    else
        echo -e "${YELLOW}Backend .env not found at $BACKEND_ENV${NC}"
        echo "Please add to your backend .env:"
        echo "  WORKER_MODE=cloud"
        echo "  CLOUD_WORKER_URL=$WORKER_URL"
    fi
fi

# Test deployment
echo ""
echo -e "${YELLOW}Testing deployment...${NC}"
if modal run modal_worker.py::health_check; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
fi

# Summary
echo ""
echo "=================================="
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=================================="
echo ""
echo "Next steps:"
echo "  1. Test with: npm test"
echo "  2. View logs: npm run logs:follow"
echo "  3. Monitor at: https://modal.com"
echo ""
echo "To switch back to local worker:"
echo "  WORKER_MODE=local"
echo ""
