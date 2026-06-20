from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.challenge import Challenge, Question
from schemas.challenge import QuizCreateRequest, QuizCreateResponse
from services.quiz_creator import create_quiz_from_topic, is_appropriate_topic

router = APIRouter()


@router.post("/create")
async def create_custom_quiz(
    request: QuizCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a quiz from any user-provided topic."""
    
    # Moderation
    if not is_appropriate_topic(request.topic):
        raise HTTPException(status_code=400, detail="Topic not appropriate for quiz generation")
    
    # Check if quiz already exists
    from sqlalchemy import select
    existing = await db.execute(
        select(Challenge).where(Challenge.title == request.topic[:100])
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A quiz with this topic already exists")
    
    # Generate quiz
    quiz_data = await create_quiz_from_topic(
        topic=request.topic,
        category=request.category or "general",
        difficulty=request.difficulty or "medium",
    )
    
    if not quiz_data:
        raise HTTPException(status_code=500, detail="Failed to generate quiz from this topic. Try something more specific or well-known.")
    
    # Create challenge in database
    challenge = Challenge(
        title=quiz_data["title"],
        slug=quiz_data["slug"],
        description=f"User-created quiz: {quiz_data['title']}",
        category=quiz_data["category"],
        source_type="user_created",
        difficulty=quiz_data["difficulty"],
        play_count=0,
        share_count=0,
        avg_score=0,
        challenge_count=0,
        is_active=True,
        tags=quiz_data["tags"],
    )
    
    # Add questions
    for i, q in enumerate(quiz_data["questions"]):
        question = Question(
            question_text=q["question"],
            options=q["options"],
            correct_answer=q["correct_answer"],
            explanation=q.get("explanation", ""),
            difficulty=q.get("difficulty", "medium"),
            is_fun=q.get("is_fun", False),
            order=i,
        )
        challenge.questions.append(question)
    
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)
    
    return QuizCreateResponse(
        id=challenge.id,
        title=challenge.title,
        slug=challenge.slug,
        question_count=len(challenge.questions),
        message="Quiz created! Play first to set the score to beat.",
    )
