#!/bin/bash

###############################################################################
# Whisper Worker Installation Script (Mac Mini - Metal Acceleration)
#
# This script installs and configures whisper.cpp with Metal acceleration
# for use on Mac Mini M-series chips.
#
# Prerequisites:
# - macOS 12.0 or later
# - Xcode Command Line Tools
# - Homebrew (optional, for ffmpeg)
#
# Usage:
#   chmod +x install.sh
#   ./install.sh
#
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WHISPER_DIR="$SCRIPT_DIR/whisper.cpp"
MODELS_DIR="$WHISPER_DIR/models"

log_info "Starting Whisper Worker installation..."
log_info "Installation directory: $SCRIPT_DIR"

###############################################################################
# Step 1: Check prerequisites
###############################################################################

log_info "Checking prerequisites..."

# Check if on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    log_error "This script is designed for macOS only"
    exit 1
fi

# Check for Xcode Command Line Tools
if ! xcode-select -p &> /dev/null; then
    log_error "Xcode Command Line Tools not found"
    log_info "Install with: xcode-select --install"
    exit 1
fi

log_info "✓ Prerequisites met"

###############################################################################
# Step 2: Install system dependencies
###############################################################################

log_info "Checking system dependencies..."

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    log_warn "ffmpeg not found"

    # Check for Homebrew
    if command -v brew &> /dev/null; then
        log_info "Installing ffmpeg via Homebrew..."
        brew install ffmpeg
    else
        log_error "Please install ffmpeg manually or install Homebrew first"
        log_info "Homebrew: https://brew.sh"
        log_info "Or install ffmpeg: brew install ffmpeg"
        exit 1
    fi
else
    log_info "✓ ffmpeg found: $(ffmpeg -version | head -n 1)"
fi

# Check for ffprobe
if ! command -v ffprobe &> /dev/null; then
    log_error "ffprobe not found (should be installed with ffmpeg)"
    exit 1
fi

log_info "✓ System dependencies installed"

###############################################################################
# Step 3: Clone or update whisper.cpp
###############################################################################

log_info "Setting up whisper.cpp..."

if [ -d "$WHISPER_DIR" ]; then
    log_warn "whisper.cpp directory already exists"
    read -p "Do you want to update it? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Updating whisper.cpp..."
        cd "$WHISPER_DIR"
        git pull
        cd "$SCRIPT_DIR"
    else
        log_info "Skipping whisper.cpp update"
    fi
else
    log_info "Cloning whisper.cpp repository..."
    git clone https://github.com/ggerganov/whisper.cpp.git "$WHISPER_DIR"
fi

log_info "✓ whisper.cpp repository ready"

###############################################################################
# Step 4: Compile whisper.cpp with Metal acceleration
###############################################################################

log_info "Compiling whisper.cpp with Metal acceleration..."

cd "$WHISPER_DIR"

# Clean previous builds
log_info "Cleaning previous builds..."
make clean 2>/dev/null || true

# Check if Metal SDK is available
if [ -d "/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/System/Library/Frameworks/Metal.framework" ] || \
   [ -d "/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/System/Library/Frameworks/Metal.framework" ]; then
    log_info "Metal framework found, building with Metal acceleration..."
    WHISPER_METAL=1 make -j$(sysctl -n hw.ncpu)
else
    log_warn "Metal framework not found, building without Metal acceleration"
    make -j$(sysctl -n hw.ncpu)
fi

# Verify binary was created
if [ ! -f "$WHISPER_DIR/main" ]; then
    log_error "Compilation failed - binary not found"
    exit 1
fi

# Make binary executable
chmod +x "$WHISPER_DIR/main"

log_info "✓ whisper.cpp compiled successfully"

cd "$SCRIPT_DIR"

###############################################################################
# Step 5: Download Whisper models
###############################################################################

log_info "Downloading Whisper models..."

cd "$WHISPER_DIR"

# Models to download
MODELS=("base" "small" "medium")

for model in "${MODELS[@]}"; do
    model_file="$MODELS_DIR/ggml-$model.bin"

    if [ -f "$model_file" ]; then
        log_info "✓ Model $model already exists"
    else
        log_info "Downloading $model model..."
        bash ./models/download-ggml-model.sh "$model"

        # Verify download
        if [ -f "$model_file" ]; then
            size=$(ls -lh "$model_file" | awk '{print $5}')
            log_info "✓ Model $model downloaded successfully ($size)"
        else
            log_error "Failed to download $model model"
            exit 1
        fi
    fi
done

log_info "✓ All models downloaded"

cd "$SCRIPT_DIR"

###############################################################################
# Step 6: Create temp directory
###############################################################################

log_info "Creating temp directory..."

TEMP_DIR="$SCRIPT_DIR/temp"
if [ ! -d "$TEMP_DIR" ]; then
    mkdir -p "$TEMP_DIR"
    log_info "✓ Temp directory created: $TEMP_DIR"
else
    log_info "✓ Temp directory already exists"
fi

###############################################################################
# Step 7: Install Node.js dependencies
###############################################################################

log_info "Installing Node.js dependencies..."

if [ -f "$SCRIPT_DIR/package.json" ]; then
    npm install
    log_info "✓ Node.js dependencies installed"
else
    log_warn "package.json not found, skipping npm install"
fi

###############################################################################
# Step 8: Run validation
###############################################################################

log_info "Running validation tests..."

# Test whisper binary
log_info "Testing whisper.cpp binary..."
if "$WHISPER_DIR/main" --help &> /dev/null; then
    log_info "✓ Whisper binary working"
else
    log_error "Whisper binary test failed"
    exit 1
fi

# Test ffmpeg
log_info "Testing ffmpeg..."
if ffmpeg -version &> /dev/null; then
    log_info "✓ FFmpeg working"
else
    log_error "FFmpeg test failed"
    exit 1
fi

# Check Metal support (if available)
if "$WHISPER_DIR/main" --help 2>&1 | grep -q "metal"; then
    log_info "✓ Metal acceleration enabled"
else
    log_warn "Metal acceleration may not be enabled"
fi

###############################################################################
# Step 9: Create environment file
###############################################################################

log_info "Creating environment configuration..."

ENV_FILE="$SCRIPT_DIR/.env.local"

if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" << EOF
# Whisper Local Worker Configuration
# Generated by install.sh on $(date)

# Whisper.cpp paths
WHISPER_PATH=$WHISPER_DIR/main
MODELS_PATH=$MODELS_DIR

# Worker configuration
WORKER_CONCURRENCY=2
TEMP_DIR=$TEMP_DIR

# Redis connection (update with your Redis URL)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info

# Optional: Language code (auto-detect if not set)
# WHISPER_LANGUAGE=en

# Optional: Translate to English
# WHISPER_TRANSLATE=false

# File retention
FILE_RETENTION_HOURS=24
EOF

    log_info "✓ Environment file created: $ENV_FILE"
    log_warn "Please update Redis URL and other settings in $ENV_FILE"
else
    log_info "✓ Environment file already exists"
fi

###############################################################################
# Step 10: Display summary
###############################################################################

echo ""
log_info "=========================================="
log_info "Installation completed successfully!"
log_info "=========================================="
echo ""
log_info "Installation summary:"
log_info "  Whisper binary: $WHISPER_DIR/main"
log_info "  Models directory: $MODELS_DIR"
log_info "  Temp directory: $TEMP_DIR"
log_info "  Config file: $ENV_FILE"
echo ""
log_info "Models installed:"
for model in "${MODELS[@]}"; do
    model_file="$MODELS_DIR/ggml-$model.bin"
    if [ -f "$model_file" ]; then
        size=$(ls -lh "$model_file" | awk '{print $5}')
        log_info "  ✓ $model ($size)"
    fi
done
echo ""
log_info "Next steps:"
log_info "  1. Update Redis URL in $ENV_FILE"
log_info "  2. Configure backend services (S3, database)"
log_info "  3. Start worker: node index.js"
echo ""
log_info "Test the installation with:"
log_info "  node -e \"require('./whisper-runner').validateWhisperSetup().then(console.log)\""
echo ""
