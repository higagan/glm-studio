#!/bin/bash
# Check medibrick notifications

echo "📬 Medibrick Notifications"
echo "========================"
echo ""

if [ -d "/Users/gagandeep/.openclaw/workspace/medibrick/notifications" ]; then
    NOTIFICATIONS=$(ls -t /Users/gagandeep/.openclaw/workspace/medibrick/notifications/*.md 2>/dev/null)
    
    if [ -z "$NOTIFICATIONS" ]; then
        echo "No notifications yet."
        echo ""
        echo "Jobs run:"
        echo "  • Weekly summary: Mondays 9am IST"
        echo "  • Content ideas: Wednesdays 9am IST"
        echo "  • Uptime check: Every hour (if down, alert here)"
    else
        echo "Recent notifications:"
        echo ""
        for file in $NOTIFICATIONS; do
            filename=$(basename "$file")
            echo "  📄 $filename"
            echo "     Created: $(stat -f %Sm "$file")"
            echo ""
        done
        echo "To read latest: cat $(ls -t /Users/gagandeep/.openclaw/workspace/medibrick/notifications/*.md 2>/dev/null | head -1)"
    fi
else
    echo "Notification folder not found. Create it first."
fi
