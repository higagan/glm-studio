#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="/Users/gagandeep/.openclaw/workspace"
MEMORY_DIR="$WORKSPACE/memory"
DATE_STR="$(date +%Y-%m-%d)"
MEMORY_FILE="$MEMORY_DIR/$DATE_STR.md"
SECTION="## Daily Events Alert"
WHATSAPP="+917795374024"
OC="/Users/gagandeep/.npm-global/bin/openclaw"

fail_alert() {
    local msg="⚠️ Medibrick event alert failed on $(date '+%Y-%m-%d %H:%M %Z'). Check logs."
    "$OC" message send --channel whatsapp --target "$WHATSAPP" --message "$msg" >/dev/null 2>&1 || true
}
trap fail_alert ERR

echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] Running event alert..." >&2

OUTPUT="$(python3 "$SCRIPT_DIR/event_alert.py" 7)"

if [[ -z "${OUTPUT// }" ]]; then
    LOG_LINE="No upcoming events this week."
    echo "$LOG_LINE" >&2
else
    echo "$OUTPUT" >&2
    # Send WhatsApp alert
    "$OC" message send \
        --channel whatsapp \
        --target "$WHATSAPP" \
        --message "$OUTPUT" || echo "WhatsApp send failed (exit $?); continuing." >&2
    LOG_LINE="$OUTPUT"
fi

# Ensure memory file exists with date header
mkdir -p "$MEMORY_DIR"
if [[ ! -f "$MEMORY_FILE" ]]; then
    echo "# $DATE_STR" > "$MEMORY_FILE"
fi

# Append under section if not present, else append
if ! grep -qF "$SECTION" "$MEMORY_FILE"; then
    echo -e "\n$SECTION\n" >> "$MEMORY_FILE"
fi

{
    echo ""
    echo "$(date '+%H:%M') — $LOG_LINE"
} >> "$MEMORY_FILE"

trap - ERR
echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] Event alert done." >&2
