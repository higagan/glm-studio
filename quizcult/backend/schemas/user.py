from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    display_name: str
    email: Optional[str] = None
    is_anonymous: bool = True


class UserOut(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: Optional[str]
    is_anonymous: bool
    total_xp: int
    level: int
    current_streak: int
    longest_streak: int
    total_plays: int
    total_challenges_sent: int
    total_challenges_accepted: int
    badges: List[str]
    last_played_at: Optional[datetime]
    preferred_categories: List[str]

    class Config:
        from_attributes = True


class UserProfile(UserOut):
    level_title: str = "Curious Rookie"
    xp_to_next_level: int = 100
    xp_progress: int = 0


class StreakInfo(BaseModel):
    current_streak: int
    longest_streak: int
    last_played_at: Optional[datetime]
    streak_maintained_today: bool
