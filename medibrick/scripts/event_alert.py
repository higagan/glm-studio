#!/usr/bin/env python3
"""Read Medibrick event tracker and emit a WhatsApp alert for events in the
next N days (including today).

Usage: event_alert.py [days]
- days: window in days (default 7)
- Prints formatted message to stdout if any matches, otherwise prints nothing.
"""

import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 7
TODAY = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
YEAR = TODAY.year
TRACKER = Path("/Users/gagandeep/.openclaw/workspace/medibrick/event-tracker.md")

MONTHS = {m: i for i, m in enumerate(
    ["january","february","march","april","may","june","july","august",
     "september","october","november","december"], start=1)}
for i, m in enumerate(["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"], start=1):
    MONTHS[m] = i


def parse_event_date(text):
    """Return start date datetime or None. Handles 'Jun 26', 'Jul 10-11', 'Jan 29, 2027', 'Sep 5-7'."""
    t = text.strip().lower()
    # remove ordinal suffixes
    t = re.sub(r"(\d)(st|nd|rd|th)", r"\1", t)
    # Find first date expression
    m = re.search(r"([a-z]{3,9})\s+(\d{1,2})(?:\s*-\s*\d{1,2})?(?:\s*,?\s*(\d{4}))?", t, re.I)
    if not m:
        return None
    month_str = m.group(1).lower()
    day = int(m.group(2))
    year = int(m.group(3)) if m.group(3) else YEAR
    month = MONTHS.get(month_str)
    if not month:
        return None
    # If parsed date is far in the past, assume next year (e.g., Jan 2027 in a Jun year)
    try:
        dt = datetime(year, month, day)
    except ValueError:
        return None
    # If date is more than 6 months behind today, bump year
    if (TODAY - dt).days > 180:
        dt = datetime(year + 1, month, day)
    return dt


def parse_table(lines, start_idx):
    rows = []
    header = [c.strip() for c in lines[start_idx].strip("|").split("|")]
    idx = start_idx + 2
    while idx < len(lines):
        line = lines[idx].strip()
        if not line.startswith("|"):
            break
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 2:
            break
        row = {}
        for i, h in enumerate(header):
            key = h.lower().replace(" ","_").replace("/","_")
            row[key] = cells[i] if i < len(cells) else ""
        rows.append(row)
        idx += 1
    return rows


def extract_link(md):
    m = re.search(r"\[([^\]]+)\]\(([^)]+)\)", md)
    return (m.group(1), m.group(2)) if m else (md, "")


def main():
    if not TRACKER.exists():
        return
    text = TRACKER.read_text(encoding="utf-8")
    lines = text.splitlines()
    start = None
    for i, line in enumerate(lines):
        if "🗓️ UPCOMING EVENTS" in line:
            for j in range(i + 1, len(lines)):
                if lines[j].strip().startswith("|"):
                    start = j
                    break
            break
    if start is None:
        return
    rows = parse_table(lines, start)
    matches = []
    for r in rows:
        date_text = re.sub(r"\*\*", "", r.get("date", "")).strip()
        event = re.sub(r"\*\*", "", r.get("event", "")).strip()
        location = re.sub(r"\*\*", "", r.get("location", "")).strip()
        link_md = r.get("link", "").strip()
        if not event:
            continue
        dt = parse_event_date(date_text)
        if not dt:
            continue
        diff = (dt - TODAY).days
        if 0 <= diff <= DAYS:
            _, link = extract_link(link_md)
            matches.append((event, date_text, location, link))
        if len(matches) >= 5:
            break

    if not matches:
        return

    bullets = []
    for event, date_text, location, link in matches:
        parts = [p for p in [date_text, location, link] if p]
        bullets.append(f"• {event} — " + " — ".join(parts))

    msg = "📅 Medibrick Events This Week\n\n" + "\n".join(bullets) + "\n\n— Star"
    print(msg)


if __name__ == "__main__":
    main()
