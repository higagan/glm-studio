from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class LeaderboardEntryOut(BaseModel):
    rank: int
    user_id: str
    username: str
    display_name: str
    avatar_url: Optional[str]
    score: int
    total_plays: int
    avg_accuracy: float
    best_streak: int
    level: int

    class Config:
        from_attributes = True


class LeaderboardResponse(BaseModel):
    period: str  # daily, weekly, monthly, alltime
    category: str  # global, sports, tech, ai, movies
    entries: List[LeaderboardEntryOut]
    user_rank: Optional[LeaderboardEntryOut] = None
    total_players: int
    updated_at: datetime
