from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.user import User
from schemas.user import StreakInfo, UserCreate, UserOut, UserProfile
from services.gamification import get_level_title, xp_for_next_level

router = APIRouter()


@router.post("/register", response_model=UserOut)
async def register_user(request: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.username == request.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        username=request.username,
        display_name=request.display_name,
        email=request.email,
        is_anonymous=request.is_anonymous,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me", response_model=UserProfile)
async def get_current_user(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    xp_needed = xp_for_next_level(user.level)
    xp_progress = user.total_xp % xp_needed

    return UserProfile(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        is_anonymous=user.is_anonymous,
        total_xp=user.total_xp,
        level=user.level,
        current_streak=user.current_streak,
        longest_streak=user.longest_streak,
        total_plays=user.total_plays,
        total_challenges_sent=user.total_challenges_sent,
        total_challenges_accepted=user.total_challenges_accepted,
        badges=user.badges,
        last_played_at=user.last_played_at,
        preferred_categories=user.preferred_categories,
        level_title=get_level_title(user.level),
        xp_to_next_level=xp_needed,
        xp_progress=xp_progress,
    )


@router.get("/streak")
async def get_streak(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    last_played = user.last_played_at.replace(hour=0, minute=0, second=0, microsecond=0) if user.last_played_at else None

    streak_maintained = last_played == today if last_played else False

    return StreakInfo(
        current_streak=user.current_streak,
        longest_streak=user.longest_streak,
        last_played_at=user.last_played_at,
        streak_maintained_today=streak_maintained,
    )


@router.get("/{username}", response_model=UserOut)
async def get_user_by_username(username: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
