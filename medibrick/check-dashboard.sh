#!/bin/bash
# Medibrick Dashboard Quick View

echo "📊 Medibrick Dashboard"
echo "====================="
echo ""

# Website status
echo "🌐 Website:"
curl -s -o /dev/null -w "  Status: %{http_code}\n  Response: %{time_total}ms\n" https://medibrick.com

# Latest content
echo ""
echo "📝 Latest Content:"
ls -t /Users/gagandeep/.openclaw/workspace/medibrick/content/*.md 2>/dev/null | head -3 | while read file; do
    filename=$(basename "$file")
    echo "  • $filename ($(wc -l < "$file") lines)"
done

# Dashboard summary
echo ""
echo "📈 Summary:"
if [ -f "/Users/gagandeep/.openclaw/workspace/medibrick/dashboard/summary.md" ]; then
    echo "  Dashboard updated: $(stat -f %Sm /Users/gagandeep/.openclaw/workspace/medibrick/dashboard/summary.md)"
fi

# Active alerts
echo ""
echo "⚠️  Alerts:"
cat /Users/gagandeep/.openclaw/workspace/medibrick/dashboard/alerts.md 2>/dev/null || echo "  None active"

echo ""
echo "Commands:"
echo "  cat medibrick/dashboard/summary.md    # Full dashboard"
echo "  cat medibrick/content/blog-*.md         # Latest blog"
echo "  ./medibrick/check-notifications.sh    # Notifications"
