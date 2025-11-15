#!/bin/bash

###############################################################################
# Database Backup Script for WhisperAPI
#
# Creates automated backups of the PostgreSQL database
#
# Usage: bash backup-db.sh [local|railway]
# Example: bash backup-db.sh railway
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MODE=${1:-railway}
BACKUP_DIR="backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/whisperapi_${MODE}_${DATE}.dump"

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
# Setup
###############################################################################
echo ""
print_info "WhisperAPI Database Backup"
echo "Timestamp: $(date)"
echo "Mode: $MODE"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

###############################################################################
# Backup
###############################################################################
case "$MODE" in
    railway)
        print_info "Backing up Railway database..."

        if ! command -v railway &> /dev/null; then
            print_error "Railway CLI not found"
            exit 1
        fi

        # Create backup using Railway CLI
        railway run pg_dump -Fc > "$BACKUP_FILE"

        if [ $? -eq 0 ]; then
            print_success "Backup created: $BACKUP_FILE"
        else
            print_error "Backup failed"
            exit 1
        fi
        ;;

    local)
        print_info "Backing up local database..."

        if ! command -v docker-compose &> /dev/null; then
            print_error "docker-compose not found"
            exit 1
        fi

        # Create backup using docker-compose
        docker-compose exec -T db pg_dump -U whisper -Fc whisperapi > "$BACKUP_FILE"

        if [ $? -eq 0 ]; then
            print_success "Backup created: $BACKUP_FILE"
        else
            print_error "Backup failed"
            exit 1
        fi
        ;;

    *)
        print_error "Invalid mode: $MODE"
        echo "Usage: $0 [local|railway]"
        exit 1
        ;;
esac

###############################################################################
# Verify Backup
###############################################################################
print_info "Verifying backup..."

if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_success "Backup verified (Size: $SIZE)"
else
    print_error "Backup file not found"
    exit 1
fi

###############################################################################
# Cleanup Old Backups
###############################################################################
print_info "Cleaning up old backups (keeping last 7 days)..."

find "$BACKUP_DIR" -name "whisperapi_${MODE}_*.dump" -mtime +7 -delete

REMAINING=$(find "$BACKUP_DIR" -name "whisperapi_${MODE}_*.dump" | wc -l)
print_success "Retained $REMAINING backup(s)"

###############################################################################
# Optional: Upload to S3
###############################################################################
if [ -n "$S3_BACKUP_BUCKET" ] && command -v aws &> /dev/null; then
    print_info "Uploading to S3..."

    aws s3 cp "$BACKUP_FILE" "s3://$S3_BACKUP_BUCKET/database-backups/"

    if [ $? -eq 0 ]; then
        print_success "Uploaded to S3"
    else
        print_warning "S3 upload failed"
    fi
fi

###############################################################################
# Summary
###############################################################################
echo ""
print_success "Backup completed successfully!"
echo ""
echo "Backup location: $BACKUP_FILE"
echo "Backup size: $SIZE"
echo ""

print_info "To restore from this backup:"
if [ "$MODE" = "railway" ]; then
    echo "  railway run pg_restore -d \$DATABASE_URL $BACKUP_FILE"
else
    echo "  docker-compose exec -T db pg_restore -U whisper -d whisperapi < $BACKUP_FILE"
fi
echo ""
