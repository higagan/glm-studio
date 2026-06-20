#!/bin/bash
# Start the Job Application Dashboard

echo "🚀 Starting Job Application Dashboard..."
echo ""

# Check if server is already running
if lsof -i :8765 > /dev/null 2>&1; then
    echo "✅ Dashboard already running at http://localhost:8765"
else
    echo "📡 Starting server..."
    cd /Users/gagandeep/.openclaw/workspace/job-dashboard
    python3 server.py &
echo ""
    sleep 2
    echo "✅ Dashboard ready at http://localhost:8765"
fi

echo ""
echo "📊 Dashboard URLs:"
echo "   Local:    http://localhost:8765"
echo "   Network:  http://$(ifconfig en0 | awk '/inet / {print $2}'):8765"
echo ""
echo "Press Cmd+Click the URL to open in browser"
echo ""

# Open browser
open http://localhost:8765
