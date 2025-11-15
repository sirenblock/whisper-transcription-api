#!/bin/bash

# Periodically press Enter in all Claude windows to keep them processing

echo "🔄 Starting keep-alive monitor..."
echo "Will press Enter in all Claude windows every 3 seconds"
echo "Press Ctrl+C to stop"
echo ""

# All Claude windows (excluding control window 12963)
WINDOWS=(13098 13096 13094 13092 12996 13047 13002 13051 12998 13041 13049 13000)

COUNTER=1

while true; do
    echo "[$COUNTER] Pressing Enter in all ${#WINDOWS[@]} Claude windows..."

    for WINDOW_ID in "${WINDOWS[@]}"; do
        osascript <<APPLESCRIPT 2>/dev/null
tell application "Terminal"
    try
        do script "" in window id $WINDOW_ID
    end try
end tell
APPLESCRIPT
    done

    echo "  ✓ Done. Waiting 3 seconds..."
    sleep 3

    COUNTER=$((COUNTER + 1))
done
