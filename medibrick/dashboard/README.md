# Medibrick Analytics Dashboard

## Metrics Tracked

### Website Performance
- [ ] Uptime percentage (last 30 days)
- [ ] Average response time
- [ ] SSL certificate expiry
- [ ] Vercel deployment status

### Traffic & Engagement
- [ ] Weekly visitors (if Google Analytics connected)
- [ ] Page views
- [ ] Bounce rate
- [ ] Top pages

### Competitor Tracking
- [ ] Jobizo.com status
- [ ] Jobizo feature changes
- [ ] New competitors identified
- [ ] Market share signals

### Content Performance
- [ ] Blog posts published
- [ ] LinkedIn posts scheduled
- [ ] Newsletter sent
- [ ] Engagement rates

### Lead Generation
- [ ] Hospital contacts added
- [ ] Outreach emails sent
- [ ] Responses received
- [ ] Meetings scheduled

## Dashboard Files

| File | Purpose |
|------|---------|
| `dashboard/metrics.json` | Raw data storage |
| `dashboard/summary.md` | Human-readable weekly summary |
| `dashboard/alerts.md` | Active alerts and issues |

## Data Collection

### Automated (via cron)
- Uptime checks (every 15 min)
- Competitor monitoring (weekly)
- Content generation tracking

### Manual (you update)
- Google Analytics data
- Outreach response rates
- Meeting outcomes
- Revenue/signups

## View Dashboard
```bash
# Quick stats
cat /Users/gagandeep/.openclaw/workspace/medibrick/dashboard/summary.md

# Check alerts
cat /Users/gagandeep/.openclaw/workspace/medibrick/dashboard/alerts.md
```

## WhatsApp Reports
Get weekly dashboard summary every Monday at 9am IST.

---
Last updated: 2026-05-22
