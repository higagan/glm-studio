import asyncio
import hashlib
import json
from datetime import datetime, timedelta
from typing import List, Optional

import httpx
import structlog

logger = structlog.get_logger()

# News sources for India/global trending
NEWS_SOURCES = {
    "reddit_india": "https://www.reddit.com/r/india/hot.json?limit=15",
    "reddit_worldnews": "https://www.reddit.com/r/worldnews/hot.json?limit=15",
    "reddit_technology": "https://www.reddit.com/r/technology/hot.json?limit=10",
    "reddit_sports": "https://www.reddit.com/r/sports/hot.json?limit=10",
    "hackernews": None,  # Special handling
}

# Trending keywords tracker
_trending_cache = {
    "topics": [],
    "last_update": None,
}


async def fetch_reddit_posts(subreddit: str, limit: int = 15) -> List[dict]:
    """Fetch hot posts from a subreddit."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}",
                headers={"User-Agent": "QuizCult/1.0"},
            )
            resp.raise_for_status()
            data = resp.json()
            
            posts = []
            for post in data.get("data", {}).get("children", []):
                p = post.get("data", {})
                if p.get("score", 0) > 50 and not p.get("over_18", False):
                    posts.append({
                        "title": p.get("title", ""),
                        "score": p.get("score", 0),
                        "comments": p.get("num_comments", 0),
                        "subreddit": p.get("subreddit", ""),
                        "url": f"https://reddit.com{p.get('permalink', '')}",
                    })
            return posts
    except Exception as e:
        logger.warning(f"reddit_fetch_failed", subreddit=subreddit, error=str(e))
        return []


async def fetch_hackernews() -> List[dict]:
    """Fetch top HN stories."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            top_ids = await client.get(
                "https://hacker-news.firebaseio.com/v0/topstories.json",
                timeout=10.0
            )
            ids = top_ids.json()[:15]
            
            stories = []
            for story_id in ids:
                story = await client.get(
                    f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json",
                    timeout=10.0
                )
                data = story.json()
                if data and data.get("score", 0) > 30:
                    stories.append({
                        "title": data.get("title", ""),
                        "score": data.get("score", 0),
                        "comments": data.get("descendants", 0),
                        "subreddit": "technology",
                        "url": f"https://news.ycombinator.com/item?id={story_id}",
                    })
            return stories
    except Exception as e:
        logger.warning("hn_fetch_failed", error=str(e))
        return []


async def fetch_trending_topics() -> List[dict]:
    """Fetch trending topics from all sources."""
    # Check cache
    if _trending_cache["last_update"]:
        age = datetime.utcnow() - _trending_cache["last_update"]
        if age < timedelta(minutes=30):
            return _trending_cache["topics"]
    
    # Fetch all sources in parallel
    tasks = [
        fetch_reddit_posts("india", 15),
        fetch_reddit_posts("worldnews", 15),
        fetch_reddit_posts("technology", 10),
        fetch_reddit_posts("sports", 10),
        fetch_hackernews(),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    all_posts = []
    for result in results:
        if isinstance(result, list):
            all_posts.extend(result)
    
    # Score and rank
    for post in all_posts:
        # Engagement score = upvotes + comments * 2
        post["engagement"] = post.get("score", 0) + post.get("comments", 0) * 2
    
    # Sort by engagement
    all_posts.sort(key=lambda x: x["engagement"], reverse=True)
    
    # Categorize
    categorized = []
    for post in all_posts[:20]:  # Top 20
        cat = categorize_topic(post.get("subreddit", ""), post.get("title", ""))
        post["category"] = cat
        categorized.append(post)
    
    # Update cache
    _trending_cache["topics"] = categorized
    _trending_cache["last_update"] = datetime.utcnow()
    
    logger.info("trending_topics_fetched", count=len(categorized))
    return categorized


def categorize_topic(subreddit: str, title: str) -> str:
    """Categorize a topic based on content."""
    title_lower = title.lower()
    sub_lower = subreddit.lower()
    
    # Sports
    if any(x in sub_lower or x in title_lower for x in ["cricket", "football", "sports", "ipl", "soccer", "f1", "tennis"]):
        return "sports"
    
    # Tech
    if any(x in sub_lower or x in title_lower for x in ["technology", "tech", "programming", "software", "ai", "crypto", "startup"]):
        return "tech"
    
    # Politics/News
    if any(x in sub_lower for x in ["india", "worldnews", "news", "politics"]):
        return "news"
    
    # Science
    if any(x in title_lower for x in ["nasa", "space", "science", "research", "study"]):
        return "science"
    
    # Entertainment
    if any(x in title_lower for x in ["movie", "film", "actor", "netflix", "bollywood", "hollywood"]):
        return "movies"
    
    return "general"


def clean_title_for_quiz(title: str) -> str:
    """Clean a news headline into a quiz topic."""
    # Remove common suffixes/prefixes that don't help quiz generation
    title = title.strip()
    
    # Truncate if too long
    if len(title) > 100:
        title = title[:97] + "..."
    
    # Remove question marks (we'll add our own)
    title = title.replace("?", "")
    
    return title


async def generate_trending_quiz(topic: dict) -> Optional[dict]:
    """Generate a quiz from a trending topic using Ollama."""
    from services.llm import generate_quiz_questions
    
    title = clean_title_for_quiz(topic["title"])
    category = topic.get("category", "general")
    
    logger.info("generating_trending_quiz", title=title)
    
    try:
        questions = await generate_quiz_questions(title, category, "medium")
        if not questions or len(questions) < 3:
            return None
        
        return {
            "title": title,
            "category": category,
            "source_type": "trending",
            "source_url": topic.get("url", ""),
            "questions": questions,
            "difficulty": "medium",
            "tags": [topic.get("subreddit", "")],
        }
    except Exception as e:
        logger.warning("trending_quiz_generation_failed", title=title, error=str(e))
        return None


async def run_trending_pipeline(db_session, max_quizzes: int = 5) -> int:
    """Run the trending pipeline and create quizzes."""
    from models.challenge import Challenge, Question
    from sqlalchemy import select
    
    topics = await fetch_trending_topics()
    created = 0
    
    for topic in topics:
        if created >= max_quizzes:
            break
        
        # Check if already exists
        result = await db_session.execute(
            select(Challenge).where(Challenge.title == topic["title"])
        )
        if result.scalar_one_or_none():
            continue
        
        # Generate quiz
        quiz_data = await generate_trending_quiz(topic)
        if not quiz_data:
            continue
        
        # Create challenge
        challenge = Challenge(
            title=quiz_data["title"],
            slug=slugify(quiz_data["title"]),
            description=f"Trending: {quiz_data['title']}",
            category=quiz_data["category"],
            source_type="trending",
            difficulty=quiz_data["difficulty"],
            play_count=0,
            share_count=0,
            avg_score=0,
            challenge_count=0,
            is_active=True,
            tags=quiz_data["tags"],
            expires_at=datetime.utcnow() + timedelta(days=3),  # Trending expires faster
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
        
        db_session.add(challenge)
        created += 1
        logger.info("trending_quiz_created", title=challenge.title, category=challenge.category)
    
    if created > 0:
        await db_session.commit()
    
    logger.info("trending_pipeline_complete", created=created)
    return created


def slugify(text: str) -> str:
    """Create URL-friendly slug."""
    import re
    text = re.sub(r"[^\w\s-]", "", text.lower())
    text = re.sub(r"[-\s]+", "-", text)
    return text[:100]


# For manual testing
if __name__ == "__main__":
    async def test():
        topics = await fetch_trending_topics()
        print(f"Found {len(topics)} trending topics")
        for t in topics[:5]:
            print(f"  • {t['title']} ({t['category']}, engagement: {t['engagement']})")
    
    asyncio.run(test())
