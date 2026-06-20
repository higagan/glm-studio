# HEARTBEAT.md

## Quick Checks (rotate through these)

- [ ] **Calendar** — Upcoming events in next 24-48h?
- [ ] **Email** — Any urgent unread messages?
- [ ] **Weather** — Relevant if Gagan might go out?
- [ ] **News** — Any relevant updates?

## Cron Health Rules

- Check all cron jobs on every heartbeat (max 2 min)
- If any cron has 2+ consecutive errors → diagnose and fix immediately
- Common fixes:
  - DNS/provider errors → set payload model to `ollama/kimi-k2.6:cloud` or local fallback
  - Timeouts → reduce scope, add `timeoutSeconds`, switch to lighter model
- Never disable a cron without telling Gagan first
- Log every fix to heartbeat-state.json

## Last Run

2026-06-19T22:44+05:30 — Cron health rechecked. Fixed 2 of 3 failing jobs:
- ✅ `medibrick-daily-accelerators`: converted from research-heavy isolated agentTurn to tracker-based `systemEvent` reading `accelerator-tracker.md`, alerting on deadlines ≤14 days.
- ✅ `medibrick-daily-events`: converted to tracker-based `systemEvent` reading `event-tracker.md`, alerting on events in next 7 days.
- ⚠️ `medibrick-weekly-deep-dive`: still has 1× DNS error (last run Jun 12); next scheduled Jun 19 18:00 — monitor.

`quizcult-trending-pipeline` is a direct `curl` systemEvent; last run ok.

Checks: email not configured, calendar clear next 48h, Bengaluru weather 27°C partly cloudy.

**Next:** Set up email/IMAP skill; refresh event tracker (last updated 2026-05-29).
