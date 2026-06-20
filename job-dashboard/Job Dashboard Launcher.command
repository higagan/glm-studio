#!/bin/bash
# Job Application Dashboard Launcher
# Created: 2026-06-18
# This script ensures the dashboard is always running and opens it in browser

DASHBOARD_DIR="/Users/gagandeep/.openclaw/workspace/job-dashboard"
LOG_FILE="/tmp/dashboard.log"
PID_FILE="/tmp/dashboard.pid"
PORT=8765

# Function to check if server is running
check_server() {
    curl -s http://localhost:$PORT > /dev/null 2>&1
    return $?
}

# Function to kill existing server
kill_existing() {
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            kill -9 "$OLD_PID" 2>/dev/null
            sleep 1
        fi
        rm -f "$PID_FILE"
    fi
    # Also kill any other processes on the port
    lsof -ti :$PORT | xargs kill -9 2>/dev/null
    sleep 1
}

# Function to start server
start_server() {
    echo "🚀 Starting Job Application Dashboard..."
    
    # Clear old logs
    > "$LOG_FILE"
    
    # Start the server
    cd "$DASHBOARD_DIR"
    nohup python3 app.py >> "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    
    # Save PID
    echo "$SERVER_PID" > "$PID_FILE"
    
    # Wait for server to be ready
    echo "⏳ Waiting for server to start..."
    for i in {1..30}; do
        if check_server; then
            echo "✅ Dashboard is running!"
            return 0
        fi
        sleep 1
    done
    
    echo "❌ Failed to start dashboard"
    return 1
}

# Main execution
echo "========================================"
echo "   Job Application Dashboard"
echo "========================================"
echo ""

# Kill any existing server to prevent conflicts
kill_existing

# Start fresh server
if start_server; then
    # Open browser
    echo "🌐 Opening browser..."
    sleep 1
    open "http://localhost:$PORT"
    
    echo ""
    echo "========================================"
    echo "✅ Dashboard ready!"
    echo "   URL: http://localhost:$PORT"
    echo "   Log: $LOG_FILE"
    echo "========================================"
    echo ""
    echo "Press Cmd+W to close this window"
    echo "Dashboard continues running in background"
    
    # Keep window open so user can see status
    sleep 5
else
    echo "❌ Failed to start. Check logs: $LOG_FILE"
    sleep 3
fi
