#!/bin/bash
# Check Ollama cloud inference status and quota

LOG_FILE="/Users/gagandeep/.openclaw/workspace/logs/ollama-quota.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "$(date '+%Y-%m-%d %H:%M'): ❌ Ollama is not running" >> "$LOG_FILE"
    echo "OLLAMA_DOWN"
    exit 1
fi

# Try a small test with cloud model to check if quota is working
TEST_RESULT=$(curl -s http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"kimi-k2.6:cloud","prompt":"hi","options":{"num_predict":1}}' \
  2>/dev/null | head -c 500)

if echo "$TEST_RESULT" | grep -qi "error\|limit\|quota\|exceeded\|unauthorized"; then
    echo "$(date '+%Y-%m-%d %H:%M'): ⚠️ Quota/limit issue: $TEST_RESULT" >> "$LOG_FILE"
    echo "QUOTA_WARNING"
    exit 2
fi

echo "$(date '+%Y-%m-%d %H:%M'): ✅ Ollama cloud inference working" >> "$LOG_FILE"
echo "OK"
exit 0
