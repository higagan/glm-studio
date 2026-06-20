from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.gameplay import ChallengePlay
from models.user import LeaderboardEntry, User
from schemas.leaderboard import LeaderboardEntryOut, LeaderboardResponse

router = APIRouter()


def get_period_start(period: str) -> datetime:
    now = datetime.utcnow()
    if period == "daily":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "weekly":
        return now - timedelta(days=now.weekday())
    elif period == "monthly":
        return now.replace(day=1)
    else:
        return datetime(1970, 1, 1)


@router.get("/{period}/{category}")
async def get_leaderboard(
    period: str,
    category: str,
    limit: int = Query(default=50, le=100),
    user_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    period_start = get_period_start(period)

    query = (
        select(
            User.id,
            User.username,
            User.display_name,
            User.avatar_url,
            User.level,
            func.sum(ChallengePlay.score).label("total_score"),
            func.count(ChallengePlay.id).label("total_plays"),
            func.avg(ChallengePlay.accuracy).label("avg_accuracy"),
            func.max(ChallengePlay.streak_at_play).label("best_streak"),
        )
        .join(ChallengePlay, ChallengePlay.user_id == User.id)
        .where(ChallengePlay.created_at >= period_start)
        .group_by(User.id)
        .order_by(func.sum(ChallengePlay.score).desc())
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    entries = []
    for i, row in enumerate(rows):
        entries.append(
            LeaderboardEntryOut(
                rank=i + 1,
                user_id=row.id,
                username=row.username,
                display_name=row.display_name,
                avatar_url=row.avatar_url,
                score=row.total_score or 0,
                total_plays=row.total_plays or 0,
                avg_accuracy=row.avg_accuracy or 0,
                best_streak=row.best_streak or 0,
                level=row.level,
            )
        )

    user_rank = None
    if user_id:
        for e in entries:
            if e.user_id == user_id:
                user_rank = e
                break

    return LeaderboardResponse(
        period=period,
        category=category,
        entries=entries,
        user_rank=user_rank,
        total_players=len(entries),
        updated_at=datetime.utcnow(),
    )


@router.get("/user/{user_id}")
async def get_user_ranks(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return {"error": "User not found"}

    return {
        "global_rank": None,
        "category_ranks": {},
        "total_xp": user.total_xp,
        "level": user.level,
        "best_streak": user.longest_streak,
    }
