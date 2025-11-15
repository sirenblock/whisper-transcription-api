#!/bin/bash

# Launch first 4 Claude sessions with trust prompt handling

BASE_DIR="/Users/lsd/msclaude/projects/1-1"
PROMPTS_DIR="$BASE_DIR/prompts-ready-to-paste"

echo "🚀 Launching first 4 Claude sessions with FULL AUTOMATION..."
echo ""

# Get current window
CURRENT_WINDOW=$(osascript -e 'tell application "Terminal" to return id of front window')

echo "Preserving current terminal (window $CURRENT_WINDOW)"
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

sleep 1

# Array to store window IDs
WINDOW_IDS=()

# Function to launch Claude with trust handling and prompt submission
launch_claude() {
    local num=$1
    local prompt_file=$2
    local name=$3

    echo "Launching Task $num: $name"

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
    echo "  Window ID: $WINDOW_ID"
    sleep 1
}

echo ""
echo "Launching first 4 sessions..."
echo ""

launch_claude "01" "$PROMPTS_DIR/PROMPT_01_DATABASE_SCHEMA_COMPLETE.md" "Database Schema"
launch_claude "02" "$PROMPTS_DIR/PROMPT_02_S3_FILE_UPLOAD_COMPLETE.md" "S3 Upload"
launch_claude "03" "$PROMPTS_DIR/PROMPT_03_AUTH_MIDDLEWARE_COMPLETE.md" "Auth Middleware"
launch_claude "04" "$PROMPTS_DIR/PROMPT_04_RATE_LIMITING_COMPLETE.md" "Rate Limiting"

echo ""
echo "🔄 Pressing Enter again in all windows to ensure processing starts..."
echo ""

# Press Enter in each window again
for WINDOW_ID in "${WINDOW_IDS[@]}"; do
    echo "Pressing Enter in window $WINDOW_ID"
    osascript <<APPLESCRIPT
tell application "Terminal"
    do script "" in window id $WINDOW_ID
end tell
APPLESCRIPT
    sleep 1
done

echo ""
echo "✅ FIRST 4 CLAUDE SESSIONS LAUNCHED!"
echo "✅ Trust prompts handled automatically"
echo "✅ All prompts submitted"
echo "✅ Enter pressed again to ensure processing"
echo ""
echo "🤖 All 4 Claude instances are now processing in parallel!"
echo "⏱️  Expected completion: ~15-20 minutes"
echo ""
echo "📊 Monitor progress by checking each terminal window"
echo ""
