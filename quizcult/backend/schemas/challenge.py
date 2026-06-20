from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class QuestionOut(BaseModel):
    id: str
    question_text: str
    options: List[str]
    order: int
    difficulty: str
    is_fun: bool
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class ChallengeListItem(BaseModel):
    id: str
    title: str
    slug: str
    category: str
    subcategory: Optional[str]
    source_type: str
    difficulty: str
    thumbnail_url: Optional[str]
    play_count: int
    share_count: int
    avg_score: float
    created_at: datetime
    tags: List[str]
    question_count: int = Field(default=0)

    class Config:
        from_attributes = True


class ChallengeDetail(BaseModel):
    id: str
    title: str
    slug: str
    description: Optional[str]
    category: str
    subcategory: Optional[str]
    source_type: str
    difficulty: str
    thumbnail_url: Optional[str]
    play_count: int
    share_count: int
    avg_score: float
    challenge_count: int
    is_active: bool
    is_featured: bool
    tags: List[str]
    created_at: datetime
    questions: List[QuestionOut]

    class Config:
        from_attributes = True


class TrendingOut(BaseModel):
    challenges: List[ChallengeListItem]
    refreshed_at: datetime = Field(default_factory=datetime.utcnow)


class QuizCreateRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=200)
    category: Optional[str] = "general"
    difficulty: Optional[str] = "medium"


class QuizCreateResponse(BaseModel):
    id: str
    title: str
    slug: str
    question_count: int
    message: str
