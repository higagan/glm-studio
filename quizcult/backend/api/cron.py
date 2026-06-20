"""Cron endpoints for automated tasks."""
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.database import get_db
from models.challenge import Challenge
from models.trending import TrendingTopic
from services.trending import TrendingPipeline

router = APIRouter()
settings = get_settings()


from services.trending_news import run_trending_pipeline as run_news_pipeline

@router.post("/trending/news")
async def run_trending_news(db: AsyncSession = Depends(get_db)):
    """Generate quizzes from today's trending news."""
    created = await run_news_pipeline(db, max_quizzes=5)
    return {
        "status": "success",
        "challenges_created": created,
        "message": f"Generated {created} trending news quizzes",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/cleanup/expired")
async def cleanup_expired(db: AsyncSession = Depends(get_db)):
    """Clean up expired trending challenges and topics."""
    now = datetime.utcnow()

    # Mark expired trending challenges as inactive
    from sqlalchemy import update
    result = await db.execute(
        update(Challenge)
        .where(Challenge.expires_at < now)
        .where(Challenge.source_type == "trending")
        .values(is_active=False)
    )

    # Clean up old trending topics
    old_topics = await db.execute(
        select(TrendingTopic)
        .where(TrendingTopic.expires_at < now - timedelta(days=7))
    )
    for topic in old_topics.scalars().all():
        await db.delete(topic)

    await db.commit()

    return {
        "status": "success",
        "deactivated_challenges": result.rowcount,
        "timestamp": now.isoformat(),
    }


@router.get("/status")
async def cron_status():
    """Check cron system status."""
    return {
        "trending_interval_minutes": settings.trending_refresh_interval_minutes,
        "max_challenges_per_day": settings.max_challenges_per_day,
        "timestamp": datetime.utcnow().isoformat(),
    }
