#!/bin/bash

# ULTIMATE ORCHESTRATION SCRIPT
# Launches all 12 Claude sessions, arranges them, and keeps them alive

BASE_DIR="/Users/lsd/msclaude/projects/1-1"
PROMPTS_DIR="$BASE_DIR/prompts-ready-to-paste"

echo "🚀 ULTIMATE CLAUDE ORCHESTRATION SCRIPT"
echo "========================================"
echo ""
echo "This will:"
echo "  1. Launch 12 Claude sessions"
echo "  2. Handle trust prompts"
echo "  3. Submit all task prompts"
echo "  4. Arrange windows in a 3x4 grid"
echo "  5. Start keep-alive monitor"
echo ""
echo "Starting in 3 seconds..."
sleep 3

# Get current window to preserve it
CURRENT_WINDOW=$(osascript -e 'tell application "Terminal" to return id of front window')

echo "Preserving control terminal (window $CURRENT_WINDOW)"
echo "Closing other terminals..."

# Close all terminals EXCEPT current one
osascript <<CLOSEOTHERS
tell application "Terminal"
    set currentID to $CURRENT_WINDOW
    repeat with w in windows
        if id of w is not equal to currentID then
            close w
        end if
    end repeat
end tell
CLOSEOTHERS

sleep 2

# Array to store window IDs
WINDOW_IDS=()

# Function to launch Claude with trust handling and prompt submission
launch_claude() {
    local num=$1
    local prompt_file=$2
    local name=$3

    echo "[$num/12] Launching: $name"

    WINDOW_ID=$(osascript <<APPLESCRIPT
tell application "Terminal"
    activate

    -- Create window and start Claude
    set newWindow to do script "cd '$BASE_DIR' && clear && echo '📋 Task $num: $name' && echo 'Starting Claude...' && echo '' && claude"

    -- Wait for trust prompt
    delay 5

    -- Press Enter to trust the folder
    do script "" in newWindow

    -- Wait for Claude to be ready
    delay 3

    -- Read and send the prompt
    set promptText to do shell script "cat '$prompt_file'"
    do script promptText in newWindow

    -- Wait a moment
    delay 1

    -- Press Enter to submit
    do script "" in newWindow

    -- Return the window ID
    return id of newWindow

end tell
APPLESCRIPT
)

    WINDOW_IDS+=($WINDOW_ID)
    echo "  ✓ Window ID: $WINDOW_ID"
    sleep 1
}

echo ""
echo "🔥 LAUNCHING ALL 12 CLAUDE SESSIONS..."
echo ""

# Launch all 12 tasks
launch_claude "01" "$PROMPTS_DIR/PROMPT_01_DATABASE_SCHEMA_COMPLETE.md" "Database Schema"
launch_claude "02" "$PROMPTS_DIR/PROMPT_02_S3_FILE_UPLOAD_COMPLETE.md" "S3 Upload"
launch_claude "03" "$PROMPTS_DIR/PROMPT_03_AUTH_MIDDLEWARE_COMPLETE.md" "Auth Middleware"
launch_claude "04" "$PROMPTS_DIR/PROMPT_04_RATE_LIMITING_COMPLETE.md" "Rate Limiting"
launch_claude "05" "$PROMPTS_DIR/PROMPT_05_JOB_QUEUE_COMPLETE.md" "Job Queue"
launch_claude "06" "$PROMPTS_DIR/PROMPT_06_LOCAL_WORKER_COMPLETE.md" "Mac Mini Worker"
launch_claude "07" "$PROMPTS_DIR/PROMPT_07_CLOUD_WORKER_COMPLETE.md" "Cloud GPU Worker"
launch_claude "08" "$PROMPTS_DIR/PROMPT_08_API_ROUTES_COMPLETE.md" "API Routes"
launch_claude "09" "$PROMPTS_DIR/PROMPT_09_STRIPE_INTEGRATION_COMPLETE.md" "Stripe Integration"
launch_claude "10" "$PROMPTS_DIR/PROMPT_10_FRONTEND_DASHBOARD_COMPLETE.md" "Frontend Dashboard"
launch_claude "11" "$PROMPTS_DIR/PROMPT_11_LANDING_PAGE_COMPLETE.md" "Landing Page"
launch_claude "12" "$PROMPTS_DIR/PROMPT_12_CONFIG_MANAGER_COMPLETE.md" "Config Manager"

echo ""
echo "🔄 PRESSING ENTER AGAIN IN ALL WINDOWS..."
echo ""

# Press Enter in each window again to ensure processing
for WINDOW_ID in "${WINDOW_IDS[@]}"; do
    osascript <<APPLESCRIPT 2>/dev/null
tell application "Terminal"
    try
        do script "" in window id $WINDOW_ID
    end try
end tell
APPLESCRIPT
done

echo "  ✓ All windows triggered"
sleep 2

echo ""
echo "📐 ARRANGING WINDOWS IN 3x4 GRID..."
echo ""

# Arrange windows in a grid
osascript <<APPLESCRIPT
tell application "Terminal"
    -- Get screen dimensions
    tell application "Finder"
        set screenBounds to bounds of window of desktop
        set screenWidth to item 3 of screenBounds
        set screenHeight to item 4 of screenBounds
    end tell

    -- Calculate grid dimensions (3 columns x 4 rows)
    set cols to 3
    set rows to 4
    set windowWidth to screenWidth / cols
    set windowHeight to screenHeight / rows

    -- Menu bar height offset
    set menuBarHeight to 25

    -- Window IDs
    set windowList to {$(echo "${WINDOW_IDS[@]}" | tr ' ' ',')}
    set windowCount to count of windowList

    repeat with i from 1 to windowCount
        set windowID to item i of windowList

        -- Calculate position (0-indexed for math)
        set idx to i - 1
        set col to idx mod cols
        set row to idx div cols

        -- Calculate bounds
        set x1 to col * windowWidth
        set y1 to (row * windowHeight) + menuBarHeight
        set x2 to x1 + windowWidth
        set y2 to y1 + windowHeight

        -- Set window bounds
        try
            set bounds of window id windowID to {x1, y1, x2, y2}
        end try
    end repeat
end tell
APPLESCRIPT

echo "  ✓ Windows arranged in grid"
sleep 1

echo ""
echo "⚡ CREATING KEEP-ALIVE SCRIPT..."
echo ""

# Create keep-alive script with current window IDs
cat > "$BASE_DIR/keep-alive-auto.sh" <<'KEEPALIVE_SCRIPT'
#!/bin/bash

echo "🔄 Keep-Alive Monitor Active"
echo "Pressing Enter every 3 seconds in all Claude windows"
echo "Press Ctrl+C to stop"
echo ""

WINDOWS=(WINDOW_IDS_PLACEHOLDER)
COUNTER=1

while true; do
    echo "[$COUNTER] Keeping Claude windows alive..."

    for WINDOW_ID in "${WINDOWS[@]}"; do
        osascript <<APPLESCRIPT 2>/dev/null
tell application "Terminal"
    try
        do script "" in window id $WINDOW_ID
    end try
end tell
APPLESCRIPT
    done

    sleep 3
    COUNTER=$((COUNTER + 1))
done
KEEPALIVE_SCRIPT

# Replace placeholder with actual window IDs
WINDOW_IDS_STRING=$(printf '%s ' "${WINDOW_IDS[@]}")
sed -i '' "s/WINDOW_IDS_PLACEHOLDER/$WINDOW_IDS_STRING/" "$BASE_DIR/keep-alive-auto.sh"
chmod +x "$BASE_DIR/keep-alive-auto.sh"

echo "  ✓ Keep-alive script created: keep-alive-auto.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL 12 CLAUDE SESSIONS LAUNCHED AND CONFIGURED!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Status:"
echo "   • 12 Claude sessions running in parallel"
echo "   • All windows arranged in 3x4 grid"
echo "   • All prompts submitted and processing"
echo ""
echo "🎯 Window IDs:"
for i in "${!WINDOW_IDS[@]}"; do
    echo "   Task $((i+1)): ${WINDOW_IDS[$i]}"
done
echo ""
echo "⏱️  Expected completion: ~15-20 minutes per task"
echo ""
echo "🔧 To start keep-alive monitor:"
echo "   ./keep-alive-auto.sh"
echo ""
echo "🎉 You're all set! Monitor the grid for progress."
echo ""
