#!/bin/bash
# WhatsApp notification helper for medibrick
# Usage: ./notify-whatsapp.sh "Your message here"

MESSAGE="$1"
if [ -z "$MESSAGE" ]; then
    echo "Usage: $0 'Your message'"
    exit 1
fi

# Try to use the OpenClaw WhatsApp session via local API
# This requires the gateway to be running
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"$MESSAGE\"}" \
  "http://127.0.0.1:18789/api/v1/sessions/agent:main:whatsapp:direct:+917795374024/send" \
  2>/dev/null || echo "WhatsApp send failed - gateway may not be running"
