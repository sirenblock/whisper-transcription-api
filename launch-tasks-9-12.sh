#!/bin/bash

# Launch tasks 9-12 Claude sessions with trust prompt handling and window arrangement

BASE_DIR="/Users/lsd/msclaude/projects/1-1"
PROMPTS_DIR="$BASE_DIR/prompts-ready-to-paste"

echo "🚀 Launching tasks 9-12 Claude sessions with FULL AUTOMATION..."
echo ""

# Get current window
CURRENT_WINDOW=$(osascript -e 'tell application "Terminal" to return id of front window')

echo "Preserving current terminal (window $CURRENT_WINDOW)"

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
echo "Launching tasks 9-12 sessions..."
echo ""

launch_claude "09" "$PROMPTS_DIR/PROMPT_09_STRIPE_INTEGRATION_COMPLETE.md" "Stripe Integration"
launch_claude "10" "$PROMPTS_DIR/PROMPT_10_FRONTEND_DASHBOARD_COMPLETE.md" "Frontend Dashboard"
launch_claude "11" "$PROMPTS_DIR/PROMPT_11_LANDING_PAGE_COMPLETE.md" "Landing Page"
launch_claude "12" "$PROMPTS_DIR/PROMPT_12_CONFIG_MANAGER_COMPLETE.md" "Config Manager"

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
echo "📐 Arranging all windows in a grid layout..."
echo ""

# Get all Terminal windows (excluding current control window)
ALL_WINDOWS=$(osascript <<'APPLESCRIPT'
tell application "Terminal"
    set windowList to {}
    repeat with w in windows
        set windowID to id of w
        -- Exclude the control window
        if windowID is not equal to $CURRENT_WINDOW then
            set end of windowList to windowID
        end if
    end repeat
    return windowList
end tell
APPLESCRIPT
)

# Convert to array
IFS=', ' read -r -a WINDOW_ARRAY <<< "$ALL_WINDOWS"

echo "Found ${#WINDOW_ARRAY[@]} Claude windows to arrange"

# Arrange windows in a 3x4 grid
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

    set windowList to {${WINDOW_ARRAY[@]}}
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
        set bounds of window id windowID to {x1, y1, x2, y2}
    end repeat
end tell
APPLESCRIPT

echo ""
echo "✅ TASKS 9-12 CLAUDE SESSIONS LAUNCHED!"
echo "✅ Trust prompts handled automatically"
echo "✅ All prompts submitted"
echo "✅ Enter pressed again to ensure processing"
echo "✅ All windows arranged in grid layout"
echo ""
echo "🤖 All Claude instances are now processing in parallel!"
echo "⏱️  Expected completion: ~15-20 minutes"
echo ""
echo "📊 You can now see all windows arranged on your screen"
echo ""
