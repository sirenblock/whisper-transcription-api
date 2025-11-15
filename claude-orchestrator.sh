#!/bin/bash

# CLAUDE ORCHESTRATOR - Universal Multi-Agent Task Manager
# Automatically breaks down any project into tasks and runs them in parallel

set -e

WORK_DIR="${1:-.}"
PROJECT_FILE="${2:-PROJECT.md}"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║      CLAUDE ORCHESTRATOR - Universal Multi-Agent System        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if PROJECT.md exists or create it
if [ ! -f "$WORK_DIR/$PROJECT_FILE" ]; then
    echo "❌ No $PROJECT_FILE found in $WORK_DIR"
    echo ""
    echo "Please create a $PROJECT_FILE with your project description."
    echo ""
    echo "Example format:"
    echo "-------------------------------------------"
    echo "# Project: My Awesome App"
    echo ""
    echo "## Description"
    echo "Build a full-stack web application with..."
    echo ""
    echo "## Requirements"
    echo "- Feature 1"
    echo "- Feature 2"
    echo "-------------------------------------------"
    echo ""
    exit 1
fi

echo "📋 Found project file: $PROJECT_FILE"
echo ""
echo "🤖 Step 1: Analyzing project and breaking down into tasks..."
echo ""

# Create temp directory for generated files
TEMP_DIR="$WORK_DIR/.claude-orchestrator"
mkdir -p "$TEMP_DIR/tasks"
mkdir -p "$TEMP_DIR/prompts"

# Use Claude to analyze the project and break it down
BREAKDOWN_PROMPT=$(cat <<'EOF'
You are a project planning expert. Analyze the project description below and break it down into independent, parallelizable tasks that can be executed by separate Claude instances simultaneously.

For each task, provide:
1. A short task ID (e.g., TASK_01, TASK_02)
2. A descriptive title
3. A complete, standalone prompt that includes all context needed

Rules:
- Tasks should be as independent as possible
- Each task should be completable in 15-20 minutes
- Optimal number of tasks: 4-12 (balance parallelization vs complexity)
- Include shared context in each task prompt
- Tasks can include: coding, documentation, configuration, testing, etc.

Output format (JSON):
{
  "project_name": "Short project name",
  "total_tasks": 5,
  "tasks": [
    {
      "id": "TASK_01",
      "title": "Task Title",
      "description": "Brief description",
      "prompt": "Complete prompt for Claude to execute this task..."
    }
  ]
}

Project to analyze:
---
EOF
)

BREAKDOWN_PROMPT="$BREAKDOWN_PROMPT
$(cat "$WORK_DIR/$PROJECT_FILE")
---

Output the JSON breakdown now:"

# Run Claude to get breakdown
echo "  Launching Claude to analyze project..."
BREAKDOWN_JSON=$(echo "$BREAKDOWN_PROMPT" | claude --no-input 2>/dev/null || echo "{}")

# Save the breakdown
echo "$BREAKDOWN_JSON" > "$TEMP_DIR/breakdown.json"

# Parse JSON (simple parsing - in production would use jq)
TASK_COUNT=$(echo "$BREAKDOWN_JSON" | grep -o '"total_tasks"[^,]*' | grep -o '[0-9]*' | head -1)

if [ -z "$TASK_COUNT" ] || [ "$TASK_COUNT" -eq 0 ]; then
    echo "❌ Failed to break down project. Check $TEMP_DIR/breakdown.json"
    exit 1
fi

echo "  ✓ Project broken down into $TASK_COUNT tasks"
echo ""

# Extract individual task prompts (simplified - would need proper JSON parsing)
# For now, we'll use a Python helper
python3 <<PYTHON_SCRIPT > "$TEMP_DIR/task_list.txt"
import json
import sys

try:
    with open('$TEMP_DIR/breakdown.json', 'r') as f:
        data = json.load(f)

    for task in data.get('tasks', []):
        task_id = task.get('id', 'UNKNOWN')
        title = task.get('title', 'Untitled')
        prompt = task.get('prompt', '')

        # Save individual prompt file
        with open(f'$TEMP_DIR/prompts/{task_id}.md', 'w') as pf:
            pf.write(f"# {task_id}: {title}\n\n")
            pf.write(prompt)

        # Output task info
        print(f"{task_id}|{title}")

except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
PYTHON_SCRIPT

if [ $? -ne 0 ]; then
    echo "❌ Failed to parse breakdown JSON"
    exit 1
fi

echo "✓ Generated $TASK_COUNT task prompts"
echo ""

# Calculate grid dimensions
calc_grid_dimensions() {
    local count=$1
    local cols=3
    local rows=$(( (count + cols - 1) / cols ))

    # Optimize grid shape
    if [ $count -le 4 ]; then
        cols=2
        rows=2
    elif [ $count -le 6 ]; then
        cols=3
        rows=2
    elif [ $count -le 9 ]; then
        cols=3
        rows=3
    else
        cols=3
        rows=4
    fi

    echo "$cols $rows"
}

read GRID_COLS GRID_ROWS <<< $(calc_grid_dimensions $TASK_COUNT)

echo "📐 Grid layout: ${GRID_COLS}x${GRID_ROWS}"
echo ""
echo "🚀 Step 2: Launching $TASK_COUNT Claude sessions..."
echo ""

# Get current window
CURRENT_WINDOW=$(osascript -e 'tell application "Terminal" to return id of front window')

# Close other terminals
osascript <<CLOSEOTHERS 2>/dev/null
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
TASK_COUNTER=1

# Launch each task
while IFS='|' read -r TASK_ID TASK_TITLE; do
    PROMPT_FILE="$TEMP_DIR/prompts/${TASK_ID}.md"

    if [ ! -f "$PROMPT_FILE" ]; then
        echo "  ⚠️  Skipping $TASK_ID - prompt file not found"
        continue
    fi

    echo "  [$TASK_COUNTER/$TASK_COUNT] Launching: $TASK_TITLE"

    WINDOW_ID=$(osascript <<APPLESCRIPT
tell application "Terminal"
    activate

    set newWindow to do script "cd '$WORK_DIR' && clear && echo '📋 $TASK_ID: $TASK_TITLE' && echo 'Starting Claude...' && echo '' && claude"

    delay 5
    do script "" in newWindow
    delay 3

    set promptText to do shell script "cat '$PROMPT_FILE'"
    do script promptText in newWindow
    delay 1
    do script "" in newWindow

    return id of newWindow
end tell
APPLESCRIPT
)

    WINDOW_IDS+=($WINDOW_ID)
    echo "    ✓ Window ID: $WINDOW_ID"

    TASK_COUNTER=$((TASK_COUNTER + 1))
    sleep 1
done < "$TEMP_DIR/task_list.txt"

echo ""
echo "🔄 Ensuring all tasks start processing..."
echo ""

# Press Enter again in all windows
for WINDOW_ID in "${WINDOW_IDS[@]}"; do
    osascript <<APPLESCRIPT 2>/dev/null
tell application "Terminal"
    try
        do script "" in window id $WINDOW_ID
    end try
end tell
APPLESCRIPT
done

sleep 2

echo "📐 Step 3: Arranging windows in ${GRID_COLS}x${GRID_ROWS} grid..."
echo ""

# Arrange windows
osascript <<APPLESCRIPT
tell application "Terminal"
    tell application "Finder"
        set screenBounds to bounds of window of desktop
        set screenWidth to item 3 of screenBounds
        set screenHeight to item 4 of screenBounds
    end tell

    set cols to $GRID_COLS
    set rows to $GRID_ROWS
    set windowWidth to screenWidth / cols
    set windowHeight to screenHeight / rows
    set menuBarHeight to 25

    set windowList to {$(echo "${WINDOW_IDS[@]}" | tr ' ' ',')}
    set windowCount to count of windowList

    repeat with i from 1 to windowCount
        set windowID to item i of windowList
        set idx to i - 1
        set col to idx mod cols
        set row to idx div cols

        set x1 to col * windowWidth
        set y1 to (row * windowHeight) + menuBarHeight
        set x2 to x1 + windowWidth
        set y2 to y1 + windowHeight

        try
            set bounds of window id windowID to {x1, y1, x2, y2}
        end try
    end repeat
end tell
APPLESCRIPT

echo "✓ Windows arranged"
echo ""
echo "⚡ Step 4: Creating keep-alive monitor..."
echo ""

# Create keep-alive script
cat > "$WORK_DIR/keep-alive-auto.sh" <<'KEEPALIVE_SCRIPT'
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

WINDOW_IDS_STRING=$(printf '%s ' "${WINDOW_IDS[@]}")
sed -i '' "s/WINDOW_IDS_PLACEHOLDER/$WINDOW_IDS_STRING/" "$WORK_DIR/keep-alive-auto.sh"
chmod +x "$WORK_DIR/keep-alive-auto.sh"

echo "✓ Keep-alive script created"
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ORCHESTRATION COMPLETE                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Summary:"
echo "   • Tasks: $TASK_COUNT"
echo "   • Grid: ${GRID_COLS}x${GRID_ROWS}"
echo "   • Windows: ${#WINDOW_IDS[@]}"
echo ""
echo "🎯 Window IDs:"
TASK_COUNTER=1
for WINDOW_ID in "${WINDOW_IDS[@]}"; do
    echo "   Task $TASK_COUNTER: $WINDOW_ID"
    TASK_COUNTER=$((TASK_COUNTER + 1))
done
echo ""
echo "📁 Generated files:"
echo "   • Task breakdown: $TEMP_DIR/breakdown.json"
echo "   • Task prompts: $TEMP_DIR/prompts/"
echo "   • Keep-alive: ./keep-alive-auto.sh"
echo ""
echo "🔧 To start keep-alive monitor:"
echo "   ./keep-alive-auto.sh"
echo ""
echo "⏱️  Estimated completion: ~15-20 minutes"
echo ""
echo "🎉 All tasks running in parallel!"
echo ""
