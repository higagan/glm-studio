import asyncio
from typing import Optional

import structlog

from services.llm import generate_quiz_questions, validate_quiz
from services.trending_news import slugify

logger = structlog.get_logger()


async def create_quiz_from_topic(topic: str, category: str = "general", difficulty: str = "medium") -> Optional[dict]:
    """Create a complete quiz from any user-provided topic.
    
    This is the core PM feature - turns ANY text into a playable quiz.
    """
    logger.info("creating_quiz_from_topic", topic=topic[:50], category=category)
    
    # Generate questions
    questions = await generate_quiz_questions(topic, category, difficulty)
    
    if not questions or len(questions) < 3:
        logger.warning("quiz_generation_failed", topic=topic[:50])
        return None
    
    # Validate
    is_valid, issues = await validate_quiz(questions)
    if not is_valid:
        logger.warning("quiz_validation_failed", topic=topic[:50], issues=issues)
        return None
    
    # Build quiz object
    return {
        "title": topic[:100],  # Truncate long topics
        "slug": slugify(topic),
        "category": category,
        "source_type": "user_created",
        "difficulty": difficulty,
        "questions": questions,
        "tags": ["user_created", category],
    }


async def create_quiz_from_url(url: str) -> Optional[dict]:
    """Fetch URL content and generate quiz."""
    import httpx
    
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "QuizCult/1.0"})
            resp.raise_for_status()
            
            # Try to extract title and content
            html = resp.text
            from html.parser import HTMLParser
            
            class TitleExtractor(HTMLParser):
                def __init__(self):
                    super().__init__()
                    self.title = None
                    self.in_title = False
                
                def handle_starttag(self, tag, attrs):
                    if tag == 'title':
                        self.in_title = True
                
                def handle_endtag(self, tag):
                    if tag == 'title':
                        self.in_title = False
                
                def handle_data(self, data):
                    if self.in_title:
                        self.title = data.strip()
            
            extractor = TitleExtractor()
            extractor.feed(html[:50000])  # Only parse first 50KB
            
            title = extractor.title or url
            
            return await create_quiz_from_topic(title, category="news")
    except Exception as e:
        logger.warning("url_fetch_failed", url=url[:50], error=str(e))
        return None


# Quick moderation - reject obviously inappropriate
def is_appropriate_topic(topic: str) -> bool:
    """Basic moderation."""
    topic_lower = topic.lower()
    
    # Reject obvious bad stuff
    blocked = [
        "porn", "sex", "nude", "kill", "murder", "terrorist",
        "bomb", "suicide", "racist", "nazi", "cp ", "child",
    ]
    
    for word in blocked:
        if word in topic_lower:
            return False
    
    return True
