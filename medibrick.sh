#!/bin/bash
# Quick access to Medibrick content and dashboard

case "$1" in
  blog)
    cat /Users/gagandeep/.openclaw/workspace/medibrick/content/blog-*.md | head -50
    ;;
  linkedin)
    cat /Users/gagandeep/.openclaw/workspace/medibrick/content/linkedin-*.md | head -30
    ;;
  newsletter)
    cat /Users/gagandeep/.openclaw/workspace/medibrick/content/newsletter-*.md | head -40
    ;;
  dashboard|summary)
    cat /Users/gagandeep/.openclaw/workspace/medibrick/dashboard/summary.md
    ;;
  metrics)
    cat /Users/gagandeep/.openclaw/workspace/medibrick/dashboard/metrics.json | python3 -m json.tool 2>/dev/null || cat /Users/gagandeep/.openclaw/workspace/medibrick/dashboard/metrics.json
    ;;
  leads)
    ls /Users/gagandeep/.openclaw/workspace/medibrick/leads/ 2>/dev/null || echo "Leads folder: /Users/gagandeep/.openclaw/workspace/medibrick/leads/"
    ;;
  *)
    echo "Medibrick Quick Access"
    echo "====================="
    echo ""
    echo "Usage: ./medibrick.sh [command]"
    echo ""
    echo "Commands:"
    echo "  blog        - Show latest blog post"
    echo "  linkedin    - Show latest LinkedIn content"
    echo "  newsletter  - Show latest newsletter"
    echo "  dashboard   - Show dashboard summary"
    echo "  metrics     - Show raw metrics (JSON)"
    echo "  leads       - Show leads list"
    echo ""
    echo "Examples:"
    echo "  ./medibrick.sh blog"
    echo "  ./medibrick.sh dashboard"
    ;;
esac
