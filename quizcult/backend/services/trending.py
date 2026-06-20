import asyncio
from datetime import datetime, timedelta
from typing import List, Optional

import httpx
import structlog

from core.config import get_settings
from models.challenge import Challenge, Question
from models.trending import TrendingTopic
from services.llm import generate_quiz_questions, validate_quiz

logger = structlog.get_logger()
settings = get_settings()


class TrendingCollector:
    """Collect trending topics from various sources."""

    async def collect_all(self) -> List[dict]:
        tasks = [
            self._collect_reddit(),
            self._collect_hackernews(),
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        topics = []
        for result in results:
            if isinstance(result, list):
                topics.extend(result)
            elif isinstance(result, Exception):
                logger.warning("trending_source_failed", error=str(result))

        return topics

    async def _collect_reddit(self) -> List[dict]:
        """Fetch trending from Reddit."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    "https://www.reddit.com/r/popular/hot.json?limit=10",
                    headers={"User-Agent": "QuizCult/1.0"},
                )
                response.raise_for_status()
                data = response.json()

                topics = []
                for post in data.get("data", {}).get("children", []):
                    post_data = post.get("data", {})
                    score = post_data.get("score", 0)
                    # Only include high-engagement posts
                    if score > 100:
                        topics.append({
                            "title": post_data.get("title", ""),
                            "category": self._categorize_reddit(post_data),
                            "source": "reddit",
                            "source_url": f"https://reddit.com{post_data.get('permalink', '')}",
                            "relevance_score": score,
                            "mention_count": post_data.get("num_comments", 0),
                        })
                return topics
        except Exception as e:
            logger.warning("reddit_collection_failed", error=str(e))
            return []

    async def _collect_hackernews(self) -> List[dict]:
        """Fetch trending from Hacker News."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                top_ids = await client.get(
                    "https://hacker-news.firebaseio.com/v0/topstories.json",
                    timeout=10.0
                )
                top_ids.raise_for_status()
                ids = top_ids.json()[:10]

                topics = []
                for story_id in ids:
                    story = await client.get(
                        f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json",
                        timeout=10.0
                    )
                    story_data = story.json()
                    if story_data and story_data.get("score", 0) > 50:
                        topics.append({
                            "title": story_data.get("title", ""),
                            "category": "tech",
                            "source": "hackernews",
                            "source_url": f"https://news.ycombinator.com/item?id={story_id}",
                            "relevance_score": story_data.get("score", 0),
                            "mention_count": story_data.get("descendants", 0),
                        })
                return topics
        except Exception as e:
            logger.warning("hackernews_collection_failed", error=str(e))
            return []

    def _categorize_reddit(self, post: dict) -> str:
        """Categorize Reddit post based on subreddit."""
        subreddit = post.get("subreddit", "").lower()
        category_map = {
            "cricket": "sports",
            "soccer": "sports",
            "formula1": "sports",
            "movies": "movies",
            "television": "movies",
            "technology": "tech",
            "artificial": "ai",
            "machinelearning": "ai",
            "startups": "startups",
            "entrepreneur": "startups",
        }
        return category_map.get(subreddit, "general")


class QuizGenerator:
    """Generate quizzes from trending topics."""

    async def generate_from_topic(self, topic: dict) -> Optional[Challenge]:
        """Generate a complete challenge from a trending topic."""
        logger.info("generating_quiz", title=topic["title"])

        # Generate questions via LLM with retries
        questions_data = None
        for attempt in range(2):
            questions_data = await generate_quiz_questions(
                topic["title"],
                topic.get("category", "general"),
                "medium",
            )
            if questions_data:
                break
            logger.warning("quiz_generation_retry", attempt=attempt+1, title=topic["title"])

        if not questions_data:
            logger.warning("quiz_generation_failed", title=topic["title"])
            return None

        # Validate
        is_valid, issues = await validate_quiz(questions_data)
        if not is_valid:
            logger.warning("quiz_validation_failed", title=topic["title"], issues=issues)
            return None

        # Create challenge
        challenge = Challenge(
            title=topic["title"],
            slug=self._generate_slug(topic["title"]),
            description=f"Test your knowledge about: {topic['title']}",
            category=topic.get("category", "general"),
            source_type="trending",
            difficulty="medium",
            play_count=0,
            share_count=0,
            avg_score=0,
            challenge_count=0,
            is_active=True,
            tags=[topic.get("source", "")],
            expires_at=datetime.utcnow() + timedelta(days=7),
        )

        # Add questions
        for i, q_data in enumerate(questions_data[:10]):  # Max 10 questions
            question = Question(
                question_text=q_data["question"],
                options=q_data["options"],
                correct_answer=q_data["correct_answer"],
                explanation=q_data.get("explanation", ""),
                difficulty=q_data.get("difficulty", "medium"),
                is_fun=q_data.get("is_fun", False),
                order=i,
            )
            challenge.questions.append(question)

        return challenge

    def _generate_slug(self, title: str) -> str:
        """Generate URL-friendly slug."""
        import re
        slug = re.sub(r"[^\w\s-]", "", title.lower())
        slug = re.sub(r"[-\s]+", "-", slug)
        return slug[:100]


class TrendingPipeline:
    """Main pipeline for trending content generation."""

    def __init__(self):
        self.collector = TrendingCollector()
        self.generator = QuizGenerator()

    async def run(self, db_session) -> int:
        """Run the full pipeline. Returns number of challenges created."""
        logger.info("trending_pipeline_started")

        # Collect topics
        topics = await self.collector.collect_all()
        logger.info("topics_collected", count=len(topics))

        # Generate challenges
        created = 0
        for topic in topics[:settings.max_challenges_per_day]:
            # Check if challenge already exists
            from sqlalchemy import select
            result = await db_session.execute(
                select(Challenge).where(Challenge.title == topic["title"])
            )
            if result.scalar_one_or_none():
                continue

            # Generate quiz
            challenge = await self.generator.generate_from_topic(topic)
            if challenge:
                db_session.add(challenge)
                created += 1
                logger.info("challenge_created", title=challenge.title)

        await db_session.commit()
        logger.info("trending_pipeline_complete", created=created)
        return created
