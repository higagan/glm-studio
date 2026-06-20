from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class AnswerSubmission(BaseModel):
    question_id: str
    selected_answer: int
    time_taken_seconds: int = 0
    confidence: Optional[str] = "confident"  # guess, unsure, confident


class PlayStartRequest(BaseModel):
    challenge_id: str
    device_fingerprint: Optional[str] = None


class PlayResult(BaseModel):
    id: str
    challenge_id: str
    score: int
    total_questions: int
    correct_answers: int
    accuracy: float
    completion_time_seconds: int
    rank_today: Optional[int]
    percentile: Optional[float]
    ai_summary: Optional[str]
    streak_at_play: int
    xp_earned: int
    share_token: Optional[str]
    created_at: datetime


class ChallengeFriendRequest(BaseModel):
    play_id: str
    friend_username: Optional[str] = None


class ChallengeAcceptRequest(BaseModel):
    share_token: str


class ScoreComparison(BaseModel):
    original_play: PlayResult
    response_play: PlayResult
    winner: str  # original, response, tie
    score_diff: int


class ChallengeLinkInfo(BaseModel):
    challenge_id: str
    challenge_title: str
    original_player_name: str
    original_score: int
    original_total: int
    original_rank: Optional[int]
    original_summary: Optional[str]
    total_plays: int
    category: str
