import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=True)
    avatar_url: Mapped[str] = mapped_column(String(500), nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Gamification
    total_xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_played_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    total_plays: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_challenges_sent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_challenges_accepted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    badges: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)

    # Settings
    preferred_categories: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    notification_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    plays: Mapped[list["ChallengePlay"]] = relationship("ChallengePlay", back_populates="user", lazy="selectin")
    leaderboard_entries: Mapped[list["LeaderboardEntry"]] = relationship("LeaderboardEntry", back_populates="user", lazy="selectin")


class LeaderboardEntry(Base, TimestampMixin):
    __tablename__ = "leaderboard_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    period: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # daily, weekly, monthly, alltime
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="global", index=True)  # global, sports, tech, ai, movies
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_plays: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_accuracy: Mapped[float] = mapped_column(Integer, default=0, nullable=False)
    best_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    user: Mapped["User"] = relationship("User", back_populates="leaderboard_entries")
