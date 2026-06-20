import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.challenge import Challenge, Question
from models.gameplay import ChallengePlay, QuestionResponse
from models.user import User
from schemas.gameplay import (
    AnswerSubmission,
    ChallengeAcceptRequest,
    ChallengeFriendRequest,
    ChallengeLinkInfo,
    PlayResult,
    PlayStartRequest,
    ScoreComparison,
)
from services.gamification import calculate_xp, update_streak
from services.llm import generate_ai_summary

router = APIRouter()


import uuid

@router.post("/start")
async def start_play(request: PlayStartRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Challenge).where(Challenge.id == request.challenge_id).where(Challenge.is_active == True)
    )
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    questions = [q for q in challenge.questions]
    if not questions:
        raise HTTPException(status_code=400, detail="Challenge has no questions")

    # Create a new play session
    play = ChallengePlay(
        id=str(uuid.uuid4()),
        challenge_id=request.challenge_id,
        score=0,
        total_questions=len(questions),
        correct_answers=0,
        accuracy=0.0,
        completion_time_seconds=0,
    )
    db.add(play)
    await db.commit()

    questions_sorted = sorted(questions, key=lambda q: q.order)

    return {
        "play_id": play.id,

        "challenge_id": challenge.id,
        "title": challenge.title,
        "total_questions": len(questions_sorted),
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "options": q.options,
                "order": q.order,
                "difficulty": q.difficulty,
                "is_fun": q.is_fun,
                "correct_answer": q.correct_answer,
                "explanation": q.explanation,
            }
            for q in questions_sorted
        ],
    }


@router.post("/{play_id}/submit")
async def submit_answers(
    play_id: str,
    answers: list[AnswerSubmission],
    user_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ChallengePlay).where(ChallengePlay.id == play_id))
    play = result.scalar_one_or_none()
    if not play:
        raise HTTPException(status_code=404, detail="Play not found")

    challenge_result = await db.execute(select(Challenge).where(Challenge.id == play.challenge_id))
    challenge = challenge_result.scalar_one()

    correct_count = 0
    total_time = 0

    for answer in answers:
        question_result = await db.execute(
            select(Question).where(Question.id == answer.question_id)
        )
        question = question_result.scalar_one_or_none()
        if not question:
            continue

        is_correct = answer.selected_answer == question.correct_answer
        if is_correct:
            correct_count += 1
        total_time += answer.time_taken_seconds

        response = QuestionResponse(
            play_id=play_id,
            question_id=answer.question_id,
            selected_answer=answer.selected_answer,
            is_correct=is_correct,
            time_taken_seconds=answer.time_taken_seconds,
            confidence=answer.confidence,
        )
        db.add(response)

    score = correct_count
    accuracy = correct_count / len(answers) if answers else 0

    # Calculate rank
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    rank_result = await db.execute(
        select(func.count())
        .where(ChallengePlay.challenge_id == play.challenge_id)
        .where(ChallengePlay.correct_answers > score)
        .where(ChallengePlay.created_at >= today)
    )
    rank = rank_result.scalar() + 1

    # Calculate percentile
    total_result = await db.execute(
        select(func.count())
        .where(ChallengePlay.challenge_id == play.challenge_id)
        .where(ChallengePlay.created_at >= today)
    )
    total_today = total_result.scalar()
    percentile = (1 - (rank - 1) / total_today) * 100 if total_today > 0 else 100

    # AI Summary (best effort, 5s timeout)
    import asyncio
    ai_summary = f"You scored {score}/{len(answers)}. Not bad!"
    try:
        ai_summary = await asyncio.wait_for(
            generate_ai_summary(
                challenge.title, score, len(answers), correct_count, [a.selected_answer for a in answers]
            ),
            timeout=5.0
        )
    except asyncio.TimeoutError:
        pass
    except Exception:
        pass

    # XP
    xp = calculate_xp(score, len(answers), total_time, play.streak_at_play)

    # Update play
    play.score = score
    play.correct_answers = correct_count
    play.accuracy = accuracy
    play.completion_time_seconds = total_time
    play.rank_today = rank
    play.percentile = percentile
    play.ai_summary = ai_summary
    play.xp_earned = xp
    play.share_token = secrets.token_urlsafe(16)

    # Update challenge stats
    challenge.play_count += 1
    challenge.challenge_count += 1
    challenge.avg_score = (
        (challenge.avg_score * (challenge.challenge_count - 1)) + score
    ) / challenge.challenge_count

    # Update user
    if play.user_id:
        user_result = await db.execute(select(User).where(User.id == play.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.total_xp += xp
            user.total_plays += 1
            user.last_played_at = datetime.utcnow()
            user.current_streak, user.longest_streak = update_streak(
                user.current_streak, user.longest_streak, user.last_played_at
            )
            play.streak_at_play = user.current_streak

    await db.commit()

    return PlayResult(
        id=play.id,
        challenge_id=play.challenge_id,
        score=score,
        total_questions=len(answers),
        correct_answers=correct_count,
        accuracy=accuracy,
        completion_time_seconds=total_time,
        rank_today=rank,
        percentile=percentile,
        ai_summary=ai_summary,
        streak_at_play=play.streak_at_play,
        xp_earned=xp,
        share_token=play.share_token,
        created_at=play.created_at,
    )


@router.get("/challenge/{share_token}")
async def get_challenge_link_info(share_token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ChallengePlay).where(ChallengePlay.share_token == share_token))
    play = result.scalar_one_or_none()
    if not play:
        raise HTTPException(status_code=404, detail="Challenge link not found or expired")

    challenge_result = await db.execute(select(Challenge).where(Challenge.id == play.challenge_id))
    challenge = challenge_result.scalar_one()

    user_result = await db.execute(select(User).where(User.id == play.user_id))
    user = user_result.scalar_one_or_none()

    return ChallengeLinkInfo(
        challenge_id=play.challenge_id,
        challenge_title=challenge.title,
        original_player_name=user.display_name if user else "Anonymous",
        original_score=play.score,
        original_total=play.total_questions,
        original_rank=play.rank_today,
        original_summary=play.ai_summary,
        total_plays=challenge.play_count,
        category=challenge.category,
    )


@router.post("/challenge/accept")
async def accept_challenge(request: ChallengeAcceptRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChallengePlay).where(ChallengePlay.share_token == request.share_token)
    )
    parent_play = result.scalar_one_or_none()
    if not parent_play:
        raise HTTPException(status_code=404, detail="Challenge not found")

    return {"challenge_id": parent_play.challenge_id, "parent_play_id": parent_play.id}


@router.get("/compare/{play_id}/{response_play_id}")
async def compare_scores(
    play_id: str, response_play_id: str, db: AsyncSession = Depends(get_db)
):
    original_result = await db.execute(select(ChallengePlay).where(ChallengePlay.id == play_id))
    original = original_result.scalar_one_or_none()

    response_result = await db.execute(
        select(ChallengePlay).where(ChallengePlay.id == response_play_id)
    )
    response = response_result.scalar_one_or_none()

    if not original or not response:
        raise HTTPException(status_code=404, detail="Plays not found")

    winner = "tie"
    if original.score > response.score:
        winner = "original"
    elif response.score > original.score:
        winner = "response"

    return {
        "original_play": {
            "id": original.id,
            "challenge_id": original.challenge_id,
            "score": original.score,
            "total_questions": original.total_questions,
            "correct_answers": original.correct_answers,
            "accuracy": original.accuracy,
            "completion_time_seconds": original.completion_time_seconds,
            "rank_today": original.rank_today,
            "percentile": original.percentile,
            "ai_summary": original.ai_summary,
            "streak_at_play": original.streak_at_play,
            "xp_earned": original.xp_earned,
            "share_token": original.share_token,
            "created_at": original.created_at.isoformat() if original.created_at else None,
        },
        "response_play": {
            "id": response.id,
            "challenge_id": response.challenge_id,
            "score": response.score,
            "total_questions": response.total_questions,
            "correct_answers": response.correct_answers,
            "accuracy": response.accuracy,
            "completion_time_seconds": response.completion_time_seconds,
            "rank_today": response.rank_today,
            "percentile": response.percentile,
            "ai_summary": response.ai_summary,
            "streak_at_play": response.streak_at_play,
            "xp_earned": response.xp_earned,
            "share_token": response.share_token,
            "created_at": response.created_at.isoformat() if response.created_at else None,
        },
        "winner": winner,
        "score_diff": abs(original.score - response.score),
    }
