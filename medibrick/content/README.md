# Medibrick Content Pipeline

## Generated Content Types

### 1. Blog Posts (`content/blog-YYYY-MM-DD.md`)
- 800 words
- SEO optimized
- Healthcare staffing focus
- Published on medibrick.com/blog

### 2. LinkedIn Posts (`content/linkedin-YYYY-MM-DD.md`)
- 3 posts per week
- 150 words each
- Founder voice
- Engagement focused

### 3. Newsletter (`content/newsletter-YYYY-MM-DD.md`)
- Weekly digest
- Industry news + Medibrick updates
- Sent to subscribers

## Content Calendar (Auto-Generated)

| Week | Blog Topic | LinkedIn Themes | Newsletter Focus |
|------|-----------|----------------|-----------------|
| 1 | Staffing metrics | Founder journey, Industry trends, Pain points | Market overview |
| 2 | Hospital expansion | Case study, Funding news, Tips | Funding roundup |
| 3 | Compliance | NABH insights, Technology, ROI | Compliance guide |
| 4 | AI in staffing | Predictions, Tools, Growth | Monthly recap |

## SEO Keywords to Target
- healthcare staffing india
- hospital recruitment platform
- nurse staffing bangalore
- doctor locum india
- medical recruitment agency
- healthcare hr tech
- hospital workforce planning
- clinical staffing solutions

## Generation Schedule
- **Blog**: Every Monday 9am IST
- **LinkedIn**: Every Wednesday 9am IST  
- **Newsletter**: Every Friday 9am IST

## Manual Trigger
```bash
# Generate content now
ollama run kimi-k2.6:cloud "Generate blog post about [topic] for medibrick.com"
```

---
Last updated: 2026-05-22
