import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base, TimestampMixin


class Challenge(Base, TimestampMixin):
    __tablename__ = "challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # sports, tech, ai, movies, etc.
    subcategory: Mapped[str] = mapped_column(String(50), nullable=True)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False, default="trending")  # trending, evergreen, user
    difficulty: Mapped[str] = mapped_column(String(10), nullable=False, default="medium")  # easy, medium, hard
    thumbnail_url: Mapped[str] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    play_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    share_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_score: Mapped[float] = mapped_column(Integer, default=0, nullable=False)
    challenge_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    generated_by: Mapped[str] = mapped_column(String(20), default="system", nullable=False)  # system, user, ai
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # Relationships
    questions: Mapped[list["Question"]] = relationship("Question", back_populates="challenge", lazy="selectin", cascade="all, delete-orphan")
    plays: Mapped[list["ChallengePlay"]] = relationship("ChallengePlay", back_populates="challenge", lazy="selectin")


class Question(Base, TimestampMixin):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    challenge_id: Mapped[str] = mapped_column(String(36), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list[str]] = mapped_column(JSON, nullable=False)  # ["A", "B", "C", "D"]
    correct_answer: Mapped[int] = mapped_column(Integer, nullable=False)  # 0, 1, 2, 3
    explanation: Mapped[str] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str] = mapped_column(String(10), nullable=False, default="medium")
    is_fun: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # humorous question
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    image_url: Mapped[str] = mapped_column(String(500), nullable=True)

    challenge: Mapped["Challenge"] = relationship("Challenge", back_populates="questions")
    responses: Mapped[list["QuestionResponse"]] = relationship("QuestionResponse", back_populates="question", lazy="selectin")
