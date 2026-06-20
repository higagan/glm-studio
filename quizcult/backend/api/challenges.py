from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.challenge import Challenge
from schemas.challenge import ChallengeDetail, ChallengeListItem, TrendingOut

router = APIRouter()


@router.get("/trending", response_model=TrendingOut)
async def get_trending(
    limit: int = Query(default=10, le=50),
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Challenge)
        .where(Challenge.is_active == True)
        .where(Challenge.source_type == "trending")
        .order_by(Challenge.play_count.desc())
        .limit(limit)
    )
    if category:
        query = query.where(Challenge.category == category)

    result = await db.execute(query)
    challenges = result.scalars().all()

    items = []
    for c in challenges:
        item = ChallengeListItem(
            id=c.id,
            title=c.title,
            slug=c.slug,
            category=c.category,
            subcategory=c.subcategory,
            source_type=c.source_type,
            difficulty=c.difficulty,
            thumbnail_url=c.thumbnail_url,
            play_count=c.play_count,
            share_count=c.share_count,
            avg_score=c.avg_score,
            created_at=c.created_at,
            tags=c.tags,
            question_count=len(c.questions),
        )
        items.append(item)

    return TrendingOut(challenges=items)


@router.get("/evergreen", response_model=List[ChallengeListItem])
async def get_evergreen(
    limit: int = Query(default=20, le=100),
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Challenge)
        .where(Challenge.is_active == True)
        .where(Challenge.source_type == "evergreen")
        .order_by(Challenge.play_count.desc())
        .limit(limit)
    )
    if category:
        query = query.where(Challenge.category == category)

    result = await db.execute(query)
    challenges = result.scalars().all()

    items = []
    for c in challenges:
        item = ChallengeListItem(
            id=c.id,
            title=c.title,
            slug=c.slug,
            category=c.category,
            subcategory=c.subcategory,
            source_type=c.source_type,
            difficulty=c.difficulty,
            thumbnail_url=c.thumbnail_url,
            play_count=c.play_count,
            share_count=c.share_count,
            avg_score=c.avg_score,
            created_at=c.created_at,
            tags=c.tags,
            question_count=len(c.questions),
        )
        items.append(item)

    return items


@router.get("/{challenge_id}", response_model=ChallengeDetail)
async def get_challenge(challenge_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Challenge).where(Challenge.id == challenge_id).where(Challenge.is_active == True)
    )
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return challenge


@router.get("/by-slug/{slug}", response_model=ChallengeDetail)
async def get_challenge_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Challenge).where(Challenge.slug == slug).where(Challenge.is_active == True)
    )
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return challenge


@router.get("/search")
async def search_challenges(
    q: str = Query(min_length=2),
    limit: int = Query(default=10, le=50),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Challenge)
        .where(Challenge.is_active == True)
        .where(
            (Challenge.title.ilike(f"%{q}%"))
            | (Challenge.tags.contains([q]))
            | (Challenge.category.ilike(f"%{q}%"))
        )
        .limit(limit)
    )
    challenges = result.scalars().all()
    return [c for c in challenges]
