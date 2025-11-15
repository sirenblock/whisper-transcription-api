#!/bin/bash

###############################################################################
# Tailscale Setup Script for WhisperAPI Mac Mini Worker
#
# This script sets up Tailscale for secure connection between Railway API
# and local Mac Mini worker running Whisper.cpp
#
# Usage: bash tailscale-setup.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

###############################################################################
# Step 1: Check if running on macOS
###############################################################################
print_header "Checking System Requirements"

if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script is designed for macOS (Mac Mini)"
    print_info "For other platforms, visit: https://tailscale.com/download"
    exit 1
fi

print_success "Running on macOS"

###############################################################################
# Step 2: Check/Install Homebrew
###############################################################################
print_header "Checking Homebrew"

if ! command -v brew &> /dev/null; then
    print_warning "Homebrew not found. Installing..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    print_success "Homebrew installed"
else
    print_success "Homebrew already installed"
fi

###############################################################################
# Step 3: Install Tailscale
###############################################################################
print_header "Installing Tailscale"

if ! command -v tailscale &> /dev/null; then
    print_info "Installing Tailscale via Homebrew..."
    brew install tailscale
    print_success "Tailscale installed"
else
    print_success "Tailscale already installed"
    CURRENT_VERSION=$(tailscale version | head -n 1)
    print_info "Current version: $CURRENT_VERSION"
fi

###############################################################################
# Step 4: Start Tailscale
###############################################################################
print_header "Starting Tailscale"

# Check if Tailscale is already running
if tailscale status &> /dev/null; then
    print_success "Tailscale is already running"
else
    print_info "Starting Tailscale daemon..."
    sudo tailscale up --accept-routes
    print_success "Tailscale started"
fi

###############################################################################
# Step 5: Get Tailscale IP
###############################################################################
print_header "Getting Tailscale Network Information"

# Wait for Tailscale to fully initialize
sleep 2

TAILSCALE_IP=$(tailscale ip -4)
TAILSCALE_HOSTNAME=$(tailscale status --json | grep -o '"HostName":"[^"]*"' | cut -d'"' -f4 | head -n 1)

if [ -z "$TAILSCALE_IP" ]; then
    print_error "Failed to get Tailscale IP address"
    print_info "Please ensure Tailscale is properly authenticated"
    print_info "Run: sudo tailscale up"
    exit 1
fi

print_success "Tailscale IP: $TAILSCALE_IP"
print_success "Hostname: $TAILSCALE_HOSTNAME"

###############################################################################
# Step 6: Test Network Connectivity
###############################################################################
print_header "Testing Network Connectivity"

# Enable IP forwarding for subnet routing (optional)
print_info "Configuring IP forwarding..."
sudo sysctl -w net.inet.ip.forwarding=1 2>/dev/null || true

print_success "Network configuration complete"

###############################################################################
# Step 7: Create Environment Configuration
###############################################################################
print_header "Creating Configuration"

CONFIG_FILE="$HOME/.whisperapi-tailscale.env"

cat > "$CONFIG_FILE" << EOF
# WhisperAPI Tailscale Configuration
# Generated on $(date)

# Mac Mini Tailscale IP
TAILSCALE_IP=$TAILSCALE_IP

# Worker URL for Railway
LOCAL_WORKER_URL=http://$TAILSCALE_IP:3001

# Hostname
TAILSCALE_HOSTNAME=$TAILSCALE_HOSTNAME
EOF

print_success "Configuration saved to: $CONFIG_FILE"

###############################################################################
# Step 8: Display Next Steps
###############################################################################
print_header "Setup Complete!"

echo ""
print_success "Tailscale is configured successfully"
echo ""
print_info "Your Mac Mini Tailscale Information:"
echo "  • IP Address: $TAILSCALE_IP"
echo "  • Hostname: $TAILSCALE_HOSTNAME"
echo "  • Worker URL: http://$TAILSCALE_IP:3001"
echo ""

print_warning "NEXT STEPS:"
echo ""
echo "1️⃣  Install Tailscale on Railway:"
echo "   ${BLUE}https://railway.app/template/tailscale${NC}"
echo ""
echo "2️⃣  Set Railway environment variable:"
echo "   ${GREEN}LOCAL_WORKER_URL=http://$TAILSCALE_IP:3001${NC}"
echo "   ${GREEN}WORKER_MODE=local${NC}"
echo ""
echo "3️⃣  Start the local worker on this Mac Mini:"
echo "   ${GREEN}cd workers/local && node index.js${NC}"
echo ""
echo "4️⃣  Test the connection from Railway:"
echo "   ${GREEN}curl http://$TAILSCALE_IP:3001/health${NC}"
echo ""

print_info "Configuration has been saved to: $CONFIG_FILE"
print_info "Source it in your shell: source $CONFIG_FILE"
echo ""

###############################################################################
# Step 9: Optional - Configure Firewall
###############################################################################
print_header "Firewall Configuration (Optional)"

print_info "To allow connections to the worker port (3001):"
echo "  ${YELLOW}sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node${NC}"
echo "  ${YELLOW}sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node${NC}"
echo ""

print_info "Tailscale typically handles firewall rules automatically"
echo ""

###############################################################################
# Step 10: Verification Test
###############################################################################
print_header "Running Verification"

# Check Tailscale status
STATUS=$(tailscale status --json)
ONLINE=$(echo "$STATUS" | grep -o '"Online":true' || echo "")

if [ -n "$ONLINE" ]; then
    print_success "Tailscale connection is active"
else
    print_warning "Tailscale may not be fully connected"
    print_info "Run 'tailscale status' to check"
fi

# Save detailed status
STATUS_FILE="$HOME/.whisperapi-tailscale-status.json"
tailscale status --json > "$STATUS_FILE"
print_info "Detailed status saved to: $STATUS_FILE"

echo ""
print_success "Setup script completed successfully!"
echo ""
print_info "For troubleshooting, visit: https://tailscale.com/kb/"
echo ""
