#!/bin/bash

# =============================================================================
# WHISPER API - Quick Start Script
# =============================================================================
# This script helps you get the entire system running quickly

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     WHISPER TRANSCRIPTION API - Quick Start Setup             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "${BLUE}▶${NC} $1"
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

# Check prerequisites
print_step "Checking prerequisites..."

command -v node >/dev/null 2>&1 || { print_error "Node.js is required but not installed. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { print_error "npm is required but not installed. Aborting."; exit 1; }
command -v psql >/dev/null 2>&1 || print_warning "PostgreSQL client not found. Make sure PostgreSQL is installed."
command -v redis-cli >/dev/null 2>&1 || print_warning "Redis client not found. Make sure Redis is installed."

print_success "Prerequisites check complete"
echo ""

# Step 1: Install dependencies
print_step "Step 1: Installing dependencies..."
echo ""

print_step "Installing backend dependencies..."
cd backend
npm install
print_success "Backend dependencies installed"
echo ""

print_step "Installing frontend dashboard dependencies..."
cd ../frontend/dashboard
npm install
print_success "Dashboard dependencies installed"
echo ""

print_step "Installing frontend landing dependencies..."
cd ../landing
npm install
print_success "Landing dependencies installed"
echo ""

print_step "Installing local worker dependencies..."
cd ../../workers/local
npm install
print_success "Worker dependencies installed"
cd ../..
echo ""

# Step 2: Environment configuration
print_step "Step 2: Setting up environment..."

if [ ! -f backend/.env ]; then
    print_step "Copying environment template..."
    cp .env.master.example backend/.env
    print_warning "Please edit backend/.env with your configuration"
    print_warning "Required: DATABASE_URL, REDIS_URL, AWS credentials"
    echo ""
    read -p "Press Enter once you've configured backend/.env..."
else
    print_success "Environment file already exists"
fi
echo ""

# Step 3: Database setup
print_step "Step 3: Setting up database..."

cd backend

print_step "Running database migrations..."
npx prisma migrate dev --name init || print_error "Migration failed. Check your DATABASE_URL"

print_step "Seeding database with test data..."
npx prisma db seed || print_warning "Seeding failed. You can run 'npx prisma db seed' later"

print_success "Database setup complete"
cd ..
echo ""

# Step 4: Build frontend
print_step "Step 4: Building frontend applications..."

print_step "Building dashboard..."
cd frontend/dashboard
npm run build || print_warning "Dashboard build failed"
cd ../..

print_step "Building landing page..."
cd frontend/landing
npm run build || print_warning "Landing build failed"
cd ../..

print_success "Frontend build complete"
echo ""

# Step 5: Start services
print_step "Step 5: Starting services..."
echo ""

print_warning "You'll need to start these services in separate terminals:"
echo ""
echo "  Terminal 1 - PostgreSQL:"
echo "    ${GREEN}brew services start postgresql@14${NC}"
echo "    or: ${GREEN}docker run -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:14${NC}"
echo ""
echo "  Terminal 2 - Redis:"
echo "    ${GREEN}redis-server${NC}"
echo "    or: ${GREEN}docker run -p 6379:6379 redis:7${NC}"
echo ""
echo "  Terminal 3 - Backend API:"
echo "    ${GREEN}cd backend && npm run dev${NC}"
echo ""
echo "  Terminal 4 - Frontend Dashboard:"
echo "    ${GREEN}cd frontend/dashboard && npm run dev${NC}"
echo ""
echo "  Terminal 5 - Frontend Landing:"
echo "    ${GREEN}cd frontend/landing && npm run dev${NC}"
echo ""
echo "  Terminal 6 - Local Worker:"
echo "    ${GREEN}cd workers/local && npm run dev${NC}"
echo ""

print_success "Setup complete!"
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                     NEXT STEPS                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "1. Start PostgreSQL and Redis (see commands above)"
echo "2. Start the backend API"
echo "3. Start the frontend applications"
echo "4. Start the worker"
echo ""
echo "📖 Full documentation: ./MASTER_PROJECT_README.md"
echo "🔑 Test API key: wtr_live_test_key_12345678901234567890"
echo "🌐 Dashboard: http://localhost:5173"
echo "🌐 Landing: http://localhost:5174"
echo "🔗 API: http://localhost:3000"
echo ""
print_success "Ready to go!"
