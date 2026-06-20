"""Analytics tracking API."""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db

router = APIRouter()


class AnalyticsEvent(BaseModel):
    event_type: str  # quiz_started, quiz_completed, challenge_created, challenge_opened, challenge_completed, share_clicked
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    challenge_id: Optional[str] = None
    play_id: Optional[str] = None
    share_token: Optional[str] = None
    metadata: Optional[dict] = None
    device_fingerprint: Optional[str] = None
    referrer: Optional[str] = None


# In-memory store for MVP (replace with DB table later)
_events_buffer = []


@router.post("/track")
async def track_event(event: AnalyticsEvent, request: Request, db: AsyncSession = Depends(get_db)):
    """Track an analytics event."""
    event_dict = event.model_dump()
    event_dict["timestamp"] = datetime.utcnow().isoformat()
    event_dict["ip_hash"] = hash(request.client.host) % 1000000 if request.client else None
    event_dict["user_agent"] = request.headers.get("user-agent", "")

    _events_buffer.append(event_dict)

    # Flush to stdout for now (can be sent to DB/warehouse later)
    print(f"[ANALYTICS] {event.event_type}: {event_dict}")

    return {"status": "tracked"}


@router.get("/stats")
async def get_stats():
    """Get simple analytics stats for admin dashboard."""
    from collections import Counter

    events = _events_buffer
    event_counts = Counter(e["event_type"] for e in events)

    # Challenge acceptance rate
    challenges_created = event_counts.get("challenge_created", 0)
    challenges_completed = event_counts.get("challenge_completed", 0)
    acceptance_rate = (challenges_completed / challenges_created * 100) if challenges_created > 0 else 0

    # Shares per user
    share_events = [e for e in events if e["event_type"] == "share_clicked"]
    unique_sharers = len(set(e.get("user_id") for e in share_events if e.get("user_id")))
    shares_per_user = (len(share_events) / unique_sharers) if unique_sharers > 0 else 0

    return {
        "quizzes_played": event_counts.get("quiz_completed", 0),
        "quizzes_started": event_counts.get("quiz_started", 0),
        "challenges_created": challenges_created,
        "challenges_opened": event_counts.get("challenge_opened", 0),
        "challenges_completed": challenges_completed,
        "challenge_acceptance_rate": round(acceptance_rate, 1),
        "shares": event_counts.get("share_clicked", 0),
        "shares_per_user": round(shares_per_user, 2),
        "total_events": len(events),
        "period": "session",
    }


@router.get("/events")
async def get_events(event_type: Optional[str] = None, limit: int = 100):
    """Get recent analytics events."""
    events = _events_buffer
    if event_type:
        events = [e for e in events if e["event_type"] == event_type]
    return events[-limit:]
