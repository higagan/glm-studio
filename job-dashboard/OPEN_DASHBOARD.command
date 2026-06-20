#!/bin/bash
# Open Job Application Dashboard

# Check if server is running
if ! curl -s http://localhost:8765 > /dev/null 2>&1; then
    echo "Starting dashboard server..."
    cd "$(dirname "$0")"
    nohup python3 app.py > /tmp/dashboard.log 2>&1 &
    sleep 2
fi

# Open in browser
open http://localhost:8765

echo "✅ Dashboard opened at http://localhost:8765"
