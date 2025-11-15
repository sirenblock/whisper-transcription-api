#!/bin/bash

# Launch tasks 5-8 Claude sessions with trust prompt handling

BASE_DIR="/Users/lsd/msclaude/projects/1-1"
PROMPTS_DIR="$BASE_DIR/prompts-ready-to-paste"

echo "🚀 Launching tasks 5-8 Claude sessions with FULL AUTOMATION..."
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
echo "Launching tasks 5-8 sessions..."
echo ""

launch_claude "05" "$PROMPTS_DIR/PROMPT_05_JOB_QUEUE_COMPLETE.md" "Job Queue"
launch_claude "06" "$PROMPTS_DIR/PROMPT_06_LOCAL_WORKER_COMPLETE.md" "Mac Mini Worker"
launch_claude "07" "$PROMPTS_DIR/PROMPT_07_CLOUD_WORKER_COMPLETE.md" "Cloud GPU Worker"
launch_claude "08" "$PROMPTS_DIR/PROMPT_08_API_ROUTES_COMPLETE.md" "API Routes"

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
echo "✅ TASKS 5-8 CLAUDE SESSIONS LAUNCHED!"
echo "✅ Trust prompts handled automatically"
echo "✅ All prompts submitted"
echo "✅ Enter pressed again to ensure processing"
echo ""
echo "🤖 All 4 Claude instances are now processing in parallel!"
echo "⏱️  Expected completion: ~15-20 minutes"
echo ""
echo "📊 Monitor progress by checking each terminal window"
echo ""
