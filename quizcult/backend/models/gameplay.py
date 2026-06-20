import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base, TimestampMixin


class ChallengePlay(Base, TimestampMixin):
    __tablename__ = "challenge_plays"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    challenge_id: Mapped[str] = mapped_column(String(36), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)  # nullable for anonymous
    session_id: Mapped[str] = mapped_column(String(36), nullable=True)  # for anonymous tracking
    score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    correct_answers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    accuracy: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)  # 0.0 to 1.0
    completion_time_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rank_today: Mapped[int] = mapped_column(Integer, nullable=True)
    percentile: Mapped[float] = mapped_column(Float, nullable=True)  # 0.0 to 100.0
    ai_summary: Mapped[str] = mapped_column(Text, nullable=True)
    streak_at_play: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    xp_earned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_challenge_response: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # true if responding to a friend's challenge
    parent_play_id: Mapped[str] = mapped_column(String(36), ForeignKey("challenge_plays.id"), nullable=True)  # the original play being responded to
    share_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=True, index=True)  # unique link for sharing
    device_fingerprint: Mapped[str] = mapped_column(String(64), nullable=True)

    challenge: Mapped["Challenge"] = relationship("Challenge", back_populates="plays")
    user: Mapped["User"] = relationship("User", back_populates="plays")
    question_responses: Mapped[list["QuestionResponse"]] = relationship("QuestionResponse", back_populates="play", lazy="selectin", cascade="all, delete-orphan")
    parent_play: Mapped["ChallengePlay"] = relationship("ChallengePlay", remote_side="ChallengePlay.id")


class QuestionResponse(Base, TimestampMixin):
    __tablename__ = "question_responses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    play_id: Mapped[str] = mapped_column(String(36), ForeignKey("challenge_plays.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    selected_answer: Mapped[int] = mapped_column(Integer, nullable=False)  # 0, 1, 2, 3
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    time_taken_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    confidence: Mapped[str] = mapped_column(String(10), nullable=True)  # guess, unsure, confident

    play: Mapped["ChallengePlay"] = relationship("ChallengePlay", back_populates="question_responses")
    question: Mapped["Question"] = relationship("Question", back_populates="responses")
