#!/bin/bash

###############################################################################
# Cloudflare Tunnel Setup Script for WhisperAPI Mac Mini Worker
#
# This script sets up a Cloudflare Tunnel to expose the local Mac Mini worker
# to the Railway API over HTTPS with built-in DDoS protection
#
# Usage: bash cloudflare-tunnel-setup.sh
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
# Step 1: Check System Requirements
###############################################################################
print_header "Checking System Requirements"

if [[ "$OSTYPE" != "darwin"* ]]; then
    print_warning "This script is optimized for macOS but may work on Linux"
fi

print_success "System check passed"

###############################################################################
# Step 2: Check/Install Homebrew (macOS only)
###############################################################################
if [[ "$OSTYPE" == "darwin"* ]]; then
    print_header "Checking Homebrew"

    if ! command -v brew &> /dev/null; then
        print_warning "Homebrew not found. Installing..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        print_success "Homebrew installed"
    else
        print_success "Homebrew already installed"
    fi
fi

###############################################################################
# Step 3: Install cloudflared
###############################################################################
print_header "Installing cloudflared"

if ! command -v cloudflared &> /dev/null; then
    print_info "Installing cloudflared..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS installation
        brew install cloudflare/cloudflare/cloudflared
    else
        # Linux installation
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O cloudflared
        sudo mv cloudflared /usr/local/bin/
        sudo chmod +x /usr/local/bin/cloudflared
    fi

    print_success "cloudflared installed"
else
    print_success "cloudflared already installed"
    CURRENT_VERSION=$(cloudflared version | head -n 1)
    print_info "Current version: $CURRENT_VERSION"
fi

###############################################################################
# Step 4: Authenticate with Cloudflare
###############################################################################
print_header "Cloudflare Authentication"

print_warning "You need a Cloudflare account to continue"
print_info "Opening browser for authentication..."
echo ""

# Check if already authenticated
if [ -f "$HOME/.cloudflared/cert.pem" ]; then
    print_success "Already authenticated with Cloudflare"
    read -p "Do you want to re-authenticate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cloudflared tunnel login
    fi
else
    cloudflared tunnel login
    print_success "Authentication complete"
fi

###############################################################################
# Step 5: Create Tunnel
###############################################################################
print_header "Creating Cloudflare Tunnel"

TUNNEL_NAME="whisperapi-worker-$(date +%s)"
DEFAULT_TUNNEL_NAME="whisperapi-worker"

echo ""
read -p "Enter tunnel name [$DEFAULT_TUNNEL_NAME]: " INPUT_TUNNEL_NAME
TUNNEL_NAME="${INPUT_TUNNEL_NAME:-$DEFAULT_TUNNEL_NAME}"

# Check if tunnel already exists
EXISTING_TUNNEL=$(cloudflared tunnel list --output json | grep -o "\"name\":\"$TUNNEL_NAME\"" || echo "")

if [ -n "$EXISTING_TUNNEL" ]; then
    print_warning "Tunnel '$TUNNEL_NAME' already exists"
    read -p "Use existing tunnel? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        print_info "Using existing tunnel"
    else
        print_error "Please choose a different tunnel name"
        exit 1
    fi
else
    print_info "Creating new tunnel: $TUNNEL_NAME"
    cloudflared tunnel create "$TUNNEL_NAME"
    print_success "Tunnel created successfully"
fi

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list --output json | grep -B2 "\"name\":\"$TUNNEL_NAME\"" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -n 1)

if [ -z "$TUNNEL_ID" ]; then
    print_error "Failed to get tunnel ID"
    exit 1
fi

print_success "Tunnel ID: $TUNNEL_ID"

###############################################################################
# Step 6: Configure DNS
###############################################################################
print_header "DNS Configuration"

echo ""
print_info "Enter your domain name (e.g., example.com):"
read -p "Domain: " DOMAIN

if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

SUBDOMAIN="worker"
print_info "Enter subdomain for worker (default: worker):"
read -p "Subdomain: " INPUT_SUBDOMAIN
SUBDOMAIN="${INPUT_SUBDOMAIN:-worker}"

FULL_DOMAIN="$SUBDOMAIN.$DOMAIN"

print_info "Configuring DNS for: $FULL_DOMAIN"

# Create DNS route
cloudflared tunnel route dns "$TUNNEL_NAME" "$FULL_DOMAIN"

print_success "DNS configured: $FULL_DOMAIN -> Tunnel"

###############################################################################
# Step 7: Create Tunnel Configuration
###############################################################################
print_header "Creating Tunnel Configuration"

CONFIG_DIR="$HOME/.cloudflared"
CONFIG_FILE="$CONFIG_DIR/config.yml"

mkdir -p "$CONFIG_DIR"

cat > "$CONFIG_FILE" << EOF
# Cloudflare Tunnel Configuration for WhisperAPI Worker
# Generated on $(date)

tunnel: $TUNNEL_ID
credentials-file: $CONFIG_DIR/$TUNNEL_ID.json

ingress:
  # Route to local worker
  - hostname: $FULL_DOMAIN
    service: http://localhost:3001
    originRequest:
      connectTimeout: 30s
      noTLSVerify: false

  # Health check endpoint
  - hostname: $FULL_DOMAIN
    path: /health
    service: http://localhost:3001

  # Catch-all rule (required)
  - service: http_status:404

# Logging
loglevel: info
logfile: $HOME/.cloudflared/tunnel.log

# Metrics server (optional)
metrics: localhost:8099
EOF

print_success "Configuration saved to: $CONFIG_FILE"

###############################################################################
# Step 8: Create systemd/launchd Service
###############################################################################
print_header "Creating System Service"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS launchd
    PLIST_FILE="$HOME/Library/LaunchAgents/com.cloudflare.tunnel.whisperapi.plist"

    cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cloudflare.tunnel.whisperapi</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/cloudflared</string>
        <string>tunnel</string>
        <string>run</string>
        <string>$TUNNEL_NAME</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>$HOME/.cloudflared/stdout.log</string>

    <key>StandardErrorPath</key>
    <string>$HOME/.cloudflared/stderr.log</string>
</dict>
</plist>
EOF

    print_success "LaunchAgent created: $PLIST_FILE"

    # Load the service
    launchctl unload "$PLIST_FILE" 2>/dev/null || true
    launchctl load "$PLIST_FILE"

    print_success "Service loaded and started"
else
    # Linux systemd
    print_info "To install as systemd service, run as root:"
    echo "  ${GREEN}sudo cloudflared service install${NC}"
fi

###############################################################################
# Step 9: Create Environment Configuration
###############################################################################
print_header "Creating Environment Configuration"

ENV_FILE="$HOME/.whisperapi-cloudflare.env"

cat > "$ENV_FILE" << EOF
# WhisperAPI Cloudflare Tunnel Configuration
# Generated on $(date)

# Tunnel Information
TUNNEL_NAME=$TUNNEL_NAME
TUNNEL_ID=$TUNNEL_ID
TUNNEL_DOMAIN=$FULL_DOMAIN

# Worker URL for Railway (use this in Railway environment variables)
LOCAL_WORKER_URL=https://$FULL_DOMAIN

# Cloudflare Configuration
CLOUDFLARE_CONFIG=$CONFIG_FILE
EOF

print_success "Environment configuration saved to: $ENV_FILE"

###############################################################################
# Step 10: Display Summary
###############################################################################
print_header "Setup Complete!"

echo ""
print_success "Cloudflare Tunnel is configured successfully"
echo ""
print_info "Tunnel Information:"
echo "  • Name: $TUNNEL_NAME"
echo "  • ID: $TUNNEL_ID"
echo "  • Domain: $FULL_DOMAIN"
echo "  • Worker URL: https://$FULL_DOMAIN"
echo ""

print_warning "NEXT STEPS:"
echo ""
echo "1️⃣  Ensure the local worker is running on port 3001:"
echo "   ${GREEN}cd workers/local && node index.js${NC}"
echo ""
echo "2️⃣  Test the tunnel locally:"
echo "   ${GREEN}curl https://$FULL_DOMAIN/health${NC}"
echo ""
echo "3️⃣  Set Railway environment variables:"
echo "   ${GREEN}LOCAL_WORKER_URL=https://$FULL_DOMAIN${NC}"
echo "   ${GREEN}WORKER_MODE=local${NC}"
echo ""
echo "4️⃣  Monitor tunnel status:"
echo "   ${GREEN}cloudflared tunnel info $TUNNEL_NAME${NC}"
echo ""
echo "5️⃣  View tunnel logs:"
echo "   ${GREEN}tail -f $HOME/.cloudflared/tunnel.log${NC}"
echo ""

print_info "Configuration saved to: $ENV_FILE"
print_info "Source it in your shell: source $ENV_FILE"
echo ""

###############################################################################
# Useful Commands
###############################################################################
print_header "Useful Commands"

echo "• Check tunnel status:"
echo "  ${BLUE}cloudflared tunnel info $TUNNEL_NAME${NC}"
echo ""
echo "• List all tunnels:"
echo "  ${BLUE}cloudflared tunnel list${NC}"
echo ""
echo "• Delete this tunnel:"
echo "  ${BLUE}cloudflared tunnel delete $TUNNEL_NAME${NC}"
echo ""
echo "• View metrics:"
echo "  ${BLUE}curl http://localhost:8099/metrics${NC}"
echo ""
echo "• Restart service (macOS):"
echo "  ${BLUE}launchctl kickstart -k gui/\$(id -u)/com.cloudflare.tunnel.whisperapi${NC}"
echo ""

print_success "Setup script completed successfully!"
echo ""
print_info "For troubleshooting, visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/"
echo ""
