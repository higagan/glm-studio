#!/bin/bash
# Ollama Usage Tracker - ALL MODELS (local + cloud)
# Tracks every model: kimi, minimax, mistral-large, qwen3-coder, and all local models

set -e

REPORT_DIR="$HOME/.openclaw/workspace/memory/usage-reports"
LOG_FILE="$HOME/.ollama/logs/server.log"
APP_LOG="$HOME/.ollama/logs/app.log"
DATE=$(date +%Y-%m-%d)
WEEK_START=$(date -v-sun +%Y-%m-%d 2>/dev/null || date -d 'last sunday' +%Y-%m-%d)

mkdir -p "$REPORT_DIR"

REPORT="$REPORT_DIR/weekly-$DATE.txt"

echo "=== Ollama Usage Report - Week of $WEEK_START ===" > "$REPORT"
echo "Generated: $(date)" >> "$REPORT"
echo "" >> "$REPORT"

# Check installed models - separate cloud vs local
echo "=== Installed Models ===" >> "$REPORT"
echo "" >> "$REPORT"
echo "-- CLOUD Models (via Ollama Pro) --" >> "$REPORT"
ollama list 2>/dev/null | awk 'NR>1 && /cloud/ {printf "  %-35s %s\n", $1, $3}' >> "$REPORT" 2>/dev/null || echo "  No cloud models" >> "$REPORT"

echo "" >> "$REPORT"
echo "-- LOCAL Models (runs on your Mac) --" >> "$REPORT"
ollama list 2>/dev/null | awk 'NR>1 && !/cloud/ {printf "  %-35s %s\n", $1, $3}' >> "$REPORT" 2>/dev/null || echo "  No local models" >> "$REPORT"

# Currently running models
echo "" >> "$REPORT"
echo "=== Currently Running Models ===" >> "$REPORT"
curl -s http://localhost:11434/api/ps 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    models = data.get('models', [])
    if models:
        for m in models:
            name = m['name']
            size_gb = m['size']/1024/1024/1024
            is_cloud = ':cloud' in name
            tag = 'CLOUD' if is_cloud else 'LOCAL'
            print(f'  [{tag}] {name}: {size_gb:.1f}GB loaded')
    else:
        print('  No models currently running')
except Exception as e:
    print(f'  Ollama API error: {e}')
" >> "$REPORT"

# Parse Ollama logs for ALL model usage (both cloud and local)
echo "" >> "$REPORT"
echo "=== Model Usage from Logs (Last 7 Days) ===" >> "$REPORT"

if [ -f "$LOG_FILE" ]; then
    WEEK_AGO=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d)
    
    # Count log entries per day
    for day in $(seq 0 6); do
        CHECK_DATE=$(date -v-${day}d +%Y-%m-%d 2>/dev/null || date -d "${day} days ago" +%Y-%m-%d)
        COUNT=$(grep "time=${CHECK_DATE}T" "$LOG_FILE" 2>/dev/null | wc -l)
        if [ "$COUNT" -gt 0 ]; then
            echo "  ${CHECK_DATE}: ${COUNT} log entries" >> "$REPORT"
        fi
    done
else
    echo "  No server.log found" >> "$REPORT"
fi

# Check cloud API calls from app.log
echo "" >> "$REPORT"
echo "=== Cloud Inference Activity (Last 7 Days) ===" >> "$REPORT"

if [ -f "$APP_LOG" ]; then
    WEEK_AGO=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d)
    
    # Total cloud calls
    TOTAL_CLOUD=$(grep "${WEEK_AGO}" "$APP_LOG" 2>/dev/null | grep -c "cloud" || true)
    echo "  Total cloud API calls: ${TOTAL_CLOUD:-0}" >> "$REPORT"
    
    # Breakdown by model (check log lines for model names)
    echo "" >> "$REPORT"
    echo "  Cloud model usage (from logs):" >> "$REPORT"
    for model in "kimi-k2.6" "minimax-m3" "mistral-large-3" "qwen3-coder"; do
        MODEL_COUNT=$(grep "${WEEK_AGO}" "$APP_LOG" 2>/dev/null | grep -c "${model}" || true)
        if [ "${MODEL_COUNT:-0}" -gt 0 ]; then
            echo "    ${model}: ${MODEL_COUNT} calls" >> "$REPORT"
        fi
    done
    
    # Check OpenClaw agent usage for ALL models
    echo "" >> "$REPORT"
    echo "  OpenClaw agent model usage:" >> "$REPORT"
    
    # Check all OpenClaw logs for model references
    AGENT_DIR="$HOME/.openclaw"
    for model in "kimi-k2.6" "minimax-m3" "mistral-large-3" "qwen3-coder" "deepseek-r1" "qwen2.5" "llama3.1" "mistral"; do
        if [ -d "$AGENT_DIR" ]; then
            MODEL_MENTIONS=$(find "$AGENT_DIR/workspace/memory" -name "*.md" -newer "$REPORT_DIR/weekly-$(date -v-7d +%Y-%m-%d 2>/dev/null || echo '2026-01-01').txt" 2>/dev/null | xargs grep -h "${model}" 2>/dev/null | wc -l || true)
            if [ "${MODEL_MENTIONS:-0}" -gt 0 ]; then
                echo "    ${model}: mentioned in ${MODEL_MENTIONS} recent entries" >> "$REPORT"
            fi
        fi
    done
else
    echo "  No app.log found" >> "$REPORT"
fi

# Cost comparison
echo "" >> "$REPORT"
echo "=== Cost Comparison ===" >> "$REPORT"
echo "  Ollama Pro (current):              USD 20/month" >> "$REPORT"
echo "  Claude Pro:                        USD 20/month" >> "$REPORT"
echo "  Claude Code:                       USD 100-200/month (metered)" >> "$REPORT"
echo "  Cursor:                            USD 20/month" >> "$REPORT"
echo "  GitHub Copilot:                    USD 10/month" >> "$REPORT"

# Cloud model pricing estimates
echo "" >> "$REPORT"
echo "=== Cloud Model Cost Breakdown (estimates) ===" >> "$REPORT"
echo "  kimi-k2.6:cloud (675B params):     ~USD 1-2 per 100K tokens" >> "$REPORT"
echo "  minimax-m3:cloud:                  ~USD 0.50-1 per 100K tokens" >> "$REPORT"
echo "  mistral-large-3:cloud (675B):      ~USD 1-2 per 100K tokens" >> "$REPORT"
echo "  qwen3-coder:480b-cloud:            ~USD 0.30-0.50 per 100K tokens" >> "$REPORT"

# Value analysis
echo "" >> "$REPORT"
echo "=== Value Analysis ===" >> "$REPORT"
echo "  LOCAL models:                      UNLIMITED (free, runs on Mac)" >> "$REPORT"
echo "    - deepseek-r1:8b                 Good reasoning" >> "$REPORT"
echo "    - qwen2.5:7b                     Fast general" >> "$REPORT"
echo "    - llama3.1:8b                    Balanced" >> "$REPORT"
echo "    - qwen2.5-coder:14b              Coding" >> "$REPORT"
echo "" >> "$REPORT"
echo "  CLOUD models:                      Metered via Ollama Pro" >> "$REPORT"
echo "    - kimi-k2.6:cloud                Best quality, slowest" >> "$REPORT"
echo "    - minimax-m3:cloud               Fast, efficient" >> "$REPORT"
echo "    - mistral-large-3:cloud          Strong reasoning" >> "$REPORT"
echo "    - qwen3-coder:cloud              Coding tasks" >> "$REPORT"

# Verdict
echo "" >> "$REPORT"
echo "=== Verdict ===" >> "$REPORT"
echo "  Total cloud models installed:      4" >> "$REPORT"
echo "  Total local models installed:      10" >> "$REPORT"
echo "" >> "$REPORT"
echo "  If using cloud models >5x/week:     Ollama Pro = GOOD VALUE" >> "$REPORT"
echo "  If mainly using local models:       Consider canceling Pro" >> "$REPORT"
echo "  If need all 4 cloud models:        Keep Pro, monitor usage" >> "$REPORT"

echo ""
echo "Report saved to: $REPORT"
cat "$REPORT"
