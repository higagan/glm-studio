#!/bin/bash
# Auto-cleanup script for medibrick workspace
# Prevents context overflow by managing file sizes

LOG_FILE="/Users/gagandeep/.openclaw/workspace/medibrick/scripts/cleanup.log"
WORKSPACE="/Users/gagandeep/.openclaw/workspace"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting cleanup..." >> "$LOG_FILE"

# 1. Truncate old session transcripts (keep last 7 days)
find ~/.openclaw/agents/main/sessions/ -name "*.jsonl" -mtime +7 -exec sh -c 'echo "Truncating old session: {}"; cat {} | tail -100 > {}.tmp; mv {}.tmp {}' \; 2>> "$LOG_FILE"

# 2. Clean temp/cache files (safe)
rm -f ~/.openclaw/tmp/*.tmp 2>> "$LOG_FILE"
rm -f ~/.openclaw/cache/*.cache 2>> "$LOG_FILE"

# 3. Archive old notification files (keep last 14 days)
find "$WORKSPACE/medibrick/notifications/" -name "*.md" -mtime +14 -exec sh -c 'echo "Archiving old notification: {}"; mkdir -p "$WORKSPACE/medibrick/notifications/archive"; mv {} "$WORKSPACE/medibrick/notifications/archive/"' \; 2>> "$LOG_FILE"

# 4. Archive old content (keep last 30 days)
find "$WORKSPACE/medibrick/content/" -name "*.md" -mtime +30 -exec sh -c 'echo "Archiving old content: {}"; mkdir -p "$WORKSPACE/medibrick/content/archive"; mv {} "$WORKSPACE/medibrick/content/archive/"' \; 2>> "$LOG_FILE"

# 5. Compress logs older than 7 days
find "$WORKSPACE/medibrick/scripts/" -name "*.log" -mtime +7 -exec gzip {} \; 2>> "$LOG_FILE"

# 6. Check and clean session files
SESSION_DIR=~/.openclaw/agents/main/sessions/
for file in "$SESSION_DIR"*.jsonl; do
    if [ -f "$file" ]; then
        SIZE=$(du -h "$file" | cut -f1)
        LINES=$(wc -l < "$file")
        echo "  Session $(basename "$file"): $SIZE, $LINES lines" >> "$LOG_FILE"
        
        # Clean up large trajectory files (keep last 100 entries)
        if [[ "$file" == *"trajectory"* ]] && [ "$LINES" -gt 500 ]; then
            echo "  🧹 Truncating large trajectory file" >> "$LOG_FILE"
            cp "$file" "$file.backup"
            tail -n 100 "$file" > "$file.tmp"
            mv "$file.tmp" "$file"
        fi
    fi
done

# 7. Session token count check (approximate)
CURRENT_SESSION=$(ls -t ~/.openclaw/agents/main/sessions/*.jsonl | grep -v trajectory | grep -v checkpoint | head -1)
if [ -f "$CURRENT_SESSION" ]; then
    SESSION_SIZE=$(wc -c < "$CURRENT_SESSION")
    # Rough estimate: 1 token ≈ 4 bytes
    ESTIMATED_TOKENS=$((SESSION_SIZE / 4))
    echo "  Estimated session tokens: ~$ESTIMATED_TOKENS" >> "$LOG_FILE"
    
    if [ "$ESTIMATED_TOKENS" -gt 80000 ]; then
        echo "  ⚠️  WARNING: Session approaching context limit. Consider /reset" >> "$LOG_FILE"
    fi
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleanup complete" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
