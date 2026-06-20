# QuizCult - Social Quiz Game

**Prove You Know It.**

A viral social quiz game where people prove they know more than their friends about what's happening right now.

## Quick Start

```bash
# 1. Start the backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 2. Start the frontend (new terminal)
cd frontend
npm install
npm run dev

# 3. Open http://localhost:3000
```

## Architecture

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 + TypeScript + Tailwind + Framer Motion |
| Backend | FastAPI + Python |
| Database | SQLite (dev) / PostgreSQL (prod) |
| LLM | Ollama (Qwen 2.5 7B) |

## Features

- **Trending Challenges** - Auto-generated from Reddit, Hacker News
- **Quiz Playing** - 10 questions, multiple choice, instant feedback
- **Score + Rank** - Percentile ranking, AI-generated summaries
- **Challenge Friends** - Share links, compare scores
- **Leaderboards** - Daily, weekly, category-based
- **Streaks + XP** - Gamification to drive retention
- **Share Cards** - Auto-generated PNG images for social sharing
- **Analytics** - Track viral loop metrics

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/challenges/trending` | Trending challenges |
| `GET /api/challenges/evergreen` | Evergreen challenges |
| `POST /api/gameplay/start` | Start a quiz |
| `POST /api/gameplay/{play_id}/submit` | Submit answers |
| `GET /api/gameplay/challenge/{token}` | Challenge link info |
| `GET /api/leaderboard/{period}/{category}` | Leaderboard |
| `GET /api/share/card/{token}.png` | Share card image |
| `POST /api/analytics/track` | Track events |
| `GET /api/analytics/stats` | Analytics dashboard |
| `POST /api/cron/trending/run` | Run trending pipeline |

## Viral Loop

1. User opens app → sees trending challenges
2. Plays quiz → gets score + rank + AI roast
3. Taps "Challenge Friend" → generates share link
4. Friend opens link → sees challenge preview
5. Friend plays same quiz → scores compared
6. Leaderboard updates → both want to play again

## Metrics (Primary KPI)

**Challenge Invitations Sent Per User**

Secondary:
- DAU
- Challenge Acceptance Rate
- Session Length
- 7-Day Retention
- Shares Per User

## License

MIT
