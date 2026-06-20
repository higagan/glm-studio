#!/usr/bin/env python3
"""Read Medibrick accelerator tracker and emit a WhatsApp alert if any open
program has a deadline <= 14 days from today (or is rolling/open).

Usage: accelerator_alert.py [days]
- days: window in days (default 14)
- Prints formatted message to stdout if any matches, otherwise prints nothing.
"""

import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 14
TZ = "Asia/Kolkata"
TODAY = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
TRACKER = Path("/Users/gagandeep/.openclaw/workspace/medibrick/accelerator-tracker.md")

def parse_deadline(text):
    """Return (deadline_dt, is_rolling) for deadline text."""
    t = text.strip().lower()
    if any(w in t for w in ["rolling", "open now", "accepting", "twice/year", "cohort"]):
        return None, True
    # Common patterns: June 25, 2026 / Jun 25, 2026 / 25 June 2026
    patterns = [
        r"([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})",
        r"(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})",
        r"(\d{1,2})/([A-Za-z]{3,9}|\d{1,2})/(\d{4})",
    ]
    months = {m: i for i, m in enumerate(
        ["january","february","march","april","may","june","july","august",
         "september","october","november","december"], start=1)}
    for i, m in enumerate(["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"], start=1):
        months[m] = i

    for pat in patterns:
        m = re.search(pat, text, re.I)
        if not m:
            continue
        g = m.groups()
        try:
            if len(g[0]) > 2 and g[0][0].isalpha():
                month = months.get(g[0].lower())
                day = int(g[1])
                year = int(g[2])
            elif g[1][0].isalpha():
                month = months.get(g[1].lower())
                day = int(g[0])
                year = int(g[2])
            else:
                month = int(g[1])
                day = int(g[0])
                year = int(g[2])
            if not month:
                continue
            return datetime(year, month, day), False
        except Exception:
            continue
    return None, True  # unknown -> treat as rolling/open


def parse_table(lines, start_idx):
    """Parse a markdown table starting at start_idx. Return list of dict rows."""
    rows = []
    # header line
    header = [c.strip() for c in lines[start_idx].strip("|").split("|")]
    # skip separator line
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
    # find APPLY NOW section header line (the markdown table header)
    start = None
    for i, line in enumerate(lines):
        if "🚨 APPLY NOW" in line:
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
        prog = re.sub(r"\*\*", "", r.get("program", "")).strip()
        deadline_text = re.sub(r"\*\*", "", r.get("deadline", "")).strip()
        # remove redundant urgency emoji suffix like "⚠️ 9 DAYS"
        deadline_text = deadline_text.split("⚠️")[0].strip()
        link_md = r.get("link", "").strip()
        if not prog:
            continue
        _, link = extract_link(link_md)
        dt, rolling = parse_deadline(deadline_text)
        if rolling:
            matches.append((prog, deadline_text, link, None))
        elif dt:
            diff = (dt - TODAY).days
            if diff <= DAYS:
                matches.append((prog, deadline_text, link, diff))
        if len(matches) >= 5:
            break

    if not matches:
        return

    bullets = []
    for prog, deadline, link, diff in matches:
        if diff is None:
            note = deadline
        else:
            note = f"{deadline} ({diff} days)"
        if link:
            bullets.append(f"• {prog} — {note} — {link}")
        else:
            bullets.append(f"• {prog} — {note}")

    msg = "🚀 Medibrick Accelerator Alert\n\n" + "\n".join(bullets) + "\n\n⚡ Apply soon if relevant.\n\n— Star"
    print(msg)


if __name__ == "__main__":
    main()
