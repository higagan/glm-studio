import json
import hashlib
import httpx
from core.config import get_settings

settings = get_settings()

# Simple in-memory cache for generated content
_quiz_cache = {}
_summary_cache = {}


def _cache_key(topic: str, category: str, difficulty: str) -> str:
    return hashlib.md5(f"{topic}:{category}:{difficulty}".encode()).hexdigest()


def _build_headers():
    """Build headers for Ollama cloud API."""
    headers = {"Content-Type": "application/json"}
    # Add auth if using cloud (Ollama Pro handles this via cookies or bearer)
    return headers


async def _call_ollama(prompt: str, timeout: float = 60.0, prefer_json: bool = False) -> str:
    """Unified Ollama API call. Works with local and cloud models."""
    from core.config import get_settings
    settings = get_settings()
    
    # Cloud models have :cloud suffix
    is_cloud = ':cloud' in settings.ollama_model
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        if is_cloud:
            # Ollama Pro cloud uses standard /api/generate with cloud model tag
            response = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                    }
                },
            )
        else:
            # Local Ollama - use json format for structured output
            payload = {
                "model": settings.ollama_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                }
            }
            if prefer_json:
                payload["format"] = "json"
            
            response = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json=payload,
            )
        
        response.raise_for_status()
        data = response.json()
        return data.get("response", "")


async def generate_quiz_questions(topic: str, category: str, difficulty: str = "medium") -> list:
    """Generate quiz questions. Uses cache to avoid repeated generation."""
    from core.config import get_settings
    settings = get_settings()
    cache_key = _cache_key(topic, category, difficulty)
    
    if cache_key in _quiz_cache:
        print(f"[CACHE HIT] Quiz for {topic}")
        return _quiz_cache[cache_key]
    
    is_cloud = ':cloud' in settings.ollama_model
    
    prompt = f"""You are a quiz generator. Generate 10 multiple-choice quiz questions about: {topic}

Requirements:
- Questions should feel fun and conversational, NOT like a school test
- Mix of easy and tricky questions
- Include 2-3 humorous or surprising questions
- Each question has exactly 4 options (A, B, C, D)
- One correct answer per question
- Include a brief fun explanation for each answer
- Return as a JSON object with a "questions" array

Return ONLY this exact JSON structure, nothing else:
{{"questions": [{{"question": "...", "options": ["A", "B", "C", "D"], "correct_answer": 0, "explanation": "...", "is_fun": false}}]}}"""

    try:
        content = await _call_ollama(prompt, timeout=30.0 if is_cloud else 120.0)
        
        if not content:
            print(f"[LLM ERROR] Empty response for {topic}")
            return []
        
        # Parse JSON
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON from text
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                parsed = json.loads(content[start:end])
            else:
                raise
        
        # Handle formats
        if isinstance(parsed, dict) and "questions" in parsed:
            questions = parsed["questions"]
        elif isinstance(parsed, list):
            questions = parsed
        else:
            questions = []
        
        # Validate and normalize
        questions = _normalize_questions(questions)
        
        # Cache
        _quiz_cache[cache_key] = questions
        print(f"[CACHE SET] Quiz for {topic} ({len(questions)} questions, model={settings.ollama_model})")
        
        return questions
    except Exception as e:
        print(f"[LLM ERROR] Failed to generate quiz: {e}")
        return []


def _normalize_questions(questions: list) -> list:
    """Normalize and validate question format."""
    normalized = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        
        # Ensure required fields
        if "question" not in q or not q["question"]:
            continue
        
        # Ensure options is a list of 4 strings
        options = q.get("options", [])
        if not isinstance(options, list) or len(options) != 4:
            continue
        
        # Ensure correct_answer is valid
        correct = q.get("correct_answer", 0)
        if not isinstance(correct, int) or correct < 0 or correct > 3:
            correct = 0
        
        normalized.append({
            "question": str(q["question"]),
            "options": [str(opt) for opt in options],
            "correct_answer": correct,
            "explanation": str(q.get("explanation", "")),
            "is_fun": bool(q.get("is_fun", False)),
            "difficulty": str(q.get("difficulty", "medium")),
        })
    
    return normalized


async def generate_ai_summary(
    challenge_title: str,
    score: int,
    total_questions: int,
    correct: int,
    answers: list,
) -> str:
    """Generate AI summary with caching."""
    cache_key = hashlib.md5(f"{challenge_title}:{score}:{total_questions}:{correct}".encode()).hexdigest()
    
    if cache_key in _summary_cache:
        return _summary_cache[cache_key]
    
    prompt = f"""Generate a fun, witty, one-sentence summary for a quiz player.

Challenge: {challenge_title}
Score: {score}/{total_questions}
Correct answers: {correct}

The summary should:
- Be witty and slightly roasting if they did badly
- Be complimentary but not overly enthusiastic if they did well
- Feel like a friend roasting them
- Maximum 20 words
- Never use exclamation marks excessively

Examples:
- "You clearly watched the match. Question 7 exposed your secret scorecard-checking habit."
- "Close, but no cigar. Your AI knowledge is impressive for someone who still uses Internet Explorer."
- "Solid effort. You know just enough to be dangerous at parties."

Generate one summary:"""

    try:
        content = await _call_ollama(prompt, timeout=15.0)
        summary = content.strip().strip('"').strip("'")
        result = summary or "You played. That's something."
        
        # Cache result
        _summary_cache[cache_key] = result
        return result
    except Exception as e:
        print(f"[LLM ERROR] Failed to generate summary: {e}")
        return "You played. That's something."


async def validate_quiz(questions: list) -> tuple:
    """Validate generated quiz for quality.
    Returns (is_valid, issues)"""
    issues = []

    if len(questions) < 3:
        issues.append("Too few questions (minimum 3)")

    for i, q in enumerate(questions):
        if not q.get("question"):
            issues.append(f"Q{i+1}: Missing question text")
        if len(q.get("options", [])) != 4:
            issues.append(f"Q{i+1}: Must have exactly 4 options")
        correct = q.get("correct_answer")
        if correct not in [0, 1, 2, 3]:
            issues.append(f"Q{i+1}: Invalid correct answer index")

    is_valid = len(issues) == 0
    return is_valid, issues


async def pregenerate_quizzes(topics: list) -> dict:
    """Pregenerate quizzes for trending topics and cache them.
    Returns dict of topic -> questions."""
    results = {}
    for topic in topics:
        questions = await generate_quiz_questions(
            topic["title"],
            topic.get("category", "general"),
            "medium"
        )
        if questions:
            results[topic["title"]] = questions
            print(f"[PREGEN] Generated {len(questions)} questions for {topic['title']}")
    return results


def _normalize_questions(questions: list) -> list:
    """Normalize and validate question format."""
    normalized = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        
        # Ensure required fields
        if "question" not in q or not q["question"]:
            continue
        
        # Ensure options is a list of 4 strings
        options = q.get("options", [])
        if not isinstance(options, list) or len(options) != 4:
            continue
        
        # Ensure correct_answer is valid
        correct = q.get("correct_answer", 0)
        if not isinstance(correct, int) or correct < 0 or correct > 3:
            correct = 0
        
        normalized.append({
            "question": str(q["question"]),
            "options": [str(opt) for opt in options],
            "correct_answer": correct,
            "explanation": str(q.get("explanation", "")),
            "is_fun": bool(q.get("is_fun", False)),
            "difficulty": str(q.get("difficulty", "medium")),
        })
    
    return normalized
