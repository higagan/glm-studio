#!/usr/bin/env python3
"""Combined weekly deep-dive alert for Medibrick.

Reads accelerator and event trackers, emits a WhatsApp alert for:
- Open accelerator programs with deadlines <= 14 days (or rolling/open)
- Events in the next 14 days

If nothing matches, prints nothing.
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import accelerator_alert as aa
import event_alert as ea

DAYS = 14


def clean(text):
    return re.sub(r"\*\*", "", text).strip()


def main():
    # Get accelerator matches
    aa_lines = aa.TRACKER.read_text(encoding="utf-8").splitlines()
    aa_start = None
    for i, line in enumerate(aa_lines):
        if "🚨 APPLY NOW" in line:
            for j in range(i + 1, len(aa_lines)):
                if aa_lines[j].strip().startswith("|"):
                    aa_start = j
                    break
            break
    accel_matches = []
    if aa_start is not None:
        rows = aa.parse_table(aa_lines, aa_start)
        for r in rows:
            prog = clean(r.get("program", ""))
            if not prog:
                continue
            deadline_text = clean(r.get("deadline", ""))
            deadline_text = deadline_text.split("⚠️")[0].strip()
            dt, rolling = aa.parse_deadline(deadline_text)
            if rolling:
                note = deadline_text
            elif dt and (dt - aa.TODAY).days <= DAYS:
                note = f"{deadline_text} ({(dt - aa.TODAY).days} days)"
            else:
                continue
            link = clean(aa.extract_link(r.get("link", "").strip())[1])
            accel_matches.append((prog, note, link))
            if len(accel_matches) >= 5:
                break

    # Get event matches
    ea_lines = ea.TRACKER.read_text(encoding="utf-8").splitlines()
    ea_start = None
    for i, line in enumerate(ea_lines):
        if "🗓️ UPCOMING EVENTS" in line:
            for j in range(i + 1, len(ea_lines)):
                if ea_lines[j].strip().startswith("|"):
                    ea_start = j
                    break
            break
    event_matches = []
    if ea_start is not None:
        rows = ea.parse_table(ea_lines, ea_start)
        for r in rows:
            event = clean(r.get("event", ""))
            if not event:
                continue
            date_text = clean(r.get("date", ""))
            location = clean(r.get("location", ""))
            dt = ea.parse_event_date(date_text)
            if dt and 0 <= (dt - ea.TODAY).days <= DAYS:
                link = clean(ea.extract_link(r.get("link", "").strip())[1])
                event_matches.append((event, date_text, location, link))
            if len(event_matches) >= 5:
                break

    if not accel_matches and not event_matches:
        return

    lines = ["📊 Medibrick Weekly Deep Dive"]
    if accel_matches:
        lines.append("")
        lines.append("🚀 Apply Soon:")
        for prog, note, link in accel_matches:
            lines.append(f"• {prog} — {note}" + (f" — {link}" if link else ""))
    if event_matches:
        lines.append("")
        lines.append("📅 Register Soon:")
        for event, date_text, location, link in event_matches:
            parts = [p for p in [date_text, location, link] if p]
            lines.append(f"• {event} — " + " — ".join(parts))
    lines.append("")
    lines.append("— Star")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
