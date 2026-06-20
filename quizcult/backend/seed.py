"""Seed script for QuizCult - creates initial evergreen challenges"""
import asyncio

from core.database import AsyncSessionLocal, engine
from models.base import Base
from models.challenge import Challenge, Question


SEED_CHALLENGES = [
    {
        "title": "🐍 Python Mastery",
        "slug": "python-mastery",
        "category": "tech",
        "description": "Test your Python knowledge with real-world scenarios",
        "source_type": "evergreen",
        "difficulty": "medium",
        "tags": ["python", "programming", "backend"],
    },
    {
        "title": "☁️ AWS Fundamentals",
        "slug": "aws-fundamentals",
        "category": "tech",
        "description": "Core AWS services and cloud architecture basics",
        "source_type": "evergreen",
        "difficulty": "medium",
        "tags": ["aws", "cloud", "devops"],
    },
    {
        "title": "🤖 AI & Machine Learning",
        "slug": "ai-ml-basics",
        "category": "ai",
        "description": "Current AI trends and fundamentals",
        "source_type": "evergreen",
        "difficulty": "hard",
        "tags": ["ai", "ml", "llm"],
    },
    {
        "title": "🏏 Cricket Trivia",
        "slug": "cricket-trivia",
        "category": "sports",
        "description": "Test your cricket knowledge",
        "source_type": "evergreen",
        "difficulty": "easy",
        "tags": ["cricket", "sports", "ipl"],
    },
    {
        "title": "⚽ Football World",
        "slug": "football-world",
        "category": "sports",
        "description": "Football trivia from around the world",
        "source_type": "evergreen",
        "difficulty": "medium",
        "tags": ["football", "soccer", "sports"],
    },
    {
        "title": "🎬 Movie Buff",
        "slug": "movie-buff",
        "category": "movies",
        "description": "Test your movie knowledge",
        "source_type": "evergreen",
        "difficulty": "easy",
        "tags": ["movies", "hollywood", "bollywood"],
    },
    {
        "title": "🚀 Startup Ecosystem",
        "slug": "startup-ecosystem",
        "category": "startups",
        "description": "Indian and global startup trivia",
        "source_type": "evergreen",
        "difficulty": "medium",
        "tags": ["startups", "india", "entrepreneurship"],
    },
]


SAMPLE_QUESTIONS = {
    "python-mastery": [
        {
            "question_text": "Your production script crashes with 'MemoryError'. What's your first move?",
            "options": ["Add more RAM", "Check for infinite loops", "Use generators", "Restart the server"],
            "correct_answer": 2,
            "explanation": "Generators use lazy evaluation and are memory-efficient for large datasets.",
            "is_fun": False,
        },
        {
            "question_text": "Which Python feature lets you write 'with open(file) as f'?",
            "options": ["Decorators", "Context managers", "Metaclasses", "Descriptors"],
            "correct_answer": 1,
            "explanation": "Context managers handle resource setup and cleanup automatically.",
            "is_fun": False,
        },
        {
            "question_text": "Your colleague uses 'from module import *' everywhere. What do you do?",
            "options": ["Nothing, it's fine", "Code review them", "Tell their manager", "Switch to JavaScript"],
            "correct_answer": 1,
            "explanation": "Explicit imports are better for code clarity and avoiding namespace pollution.",
            "is_fun": True,
        },
        {
            "question_text": "What does the GIL in CPython stand for?",
            "options": ["Global Interpreter Lock", "General Input Loop", "Graph Integration Layer", "Generic Interface List"],
            "correct_answer": 0,
            "explanation": "GIL prevents multiple threads from executing Python bytecodes simultaneously.",
            "is_fun": False,
        },
        {
            "question_text": "You need to handle 10,000 concurrent connections. Which approach?",
            "options": ["Threading", "Multiprocessing", "Asyncio", "More servers"],
            "correct_answer": 2,
            "explanation": "Asyncio is designed for high-concurrency I/O-bound operations.",
            "is_fun": False,
        },
    ],
    "aws-fundamentals": [
        {
            "question_text": "Your EC2 instance needs to talk to S3 without credentials. What's the move?",
            "options": ["Hardcode keys", "Use IAM Role", "Pass environment variables", "Use root account"],
            "correct_answer": 1,
            "explanation": "IAM Roles provide temporary credentials without managing access keys.",
            "is_fun": False,
        },
        {
            "question_text": "S3 bucket is public. What's the worst that could happen?",
            "options": ["Nothing", "Data breach", "Unexpected bill", "All of the above"],
            "correct_answer": 3,
            "explanation": "Public S3 buckets can lead to data leaks and massive bandwidth costs.",
            "is_fun": True,
        },
        {
            "question_text": "Which AWS service is serverless compute?",
            "options": ["EC2", "Lambda", "ECS", "EBS"],
            "correct_answer": 1,
            "explanation": "AWS Lambda runs code without provisioning or managing servers.",
            "is_fun": False,
        },
    ],
    "cricket-trivia": [
        {
            "question_text": "Who has the most centuries in international cricket?",
            "options": ["Sachin Tendulkar", "Virat Kohli", "Ricky Ponting", "Jacques Kallis"],
            "correct_answer": 0,
            "explanation": "Sachin Tendulkar has 100 international centuries.",
            "is_fun": False,
        },
        {
            "question_text": "What do you call a bowler who takes 5 wickets in an innings?",
            "options": ["Century maker", "Five-for", "Hat-trick hero", "All-rounder"],
            "correct_answer": 1,
            "explanation": "Taking 5 wickets in an innings is called a 'five-for' or fifer.",
            "is_fun": False,
        },
        {
            "question_text": "The batting team is 30/5. What are they doing?",
            "options": ["Building a partnership", "Surviving", "Praying", "All of the above"],
            "correct_answer": 3,
            "explanation": "At 30/5, the team is doing all of the above!",
            "is_fun": True,
        },
    ],
    "ai-ml-basics": [
        {
            "question_text": "Which company created ChatGPT?",
            "options": ["Google", "OpenAI", "Microsoft", "Meta"],
            "correct_answer": 1,
            "explanation": "OpenAI created ChatGPT, though Microsoft is a major investor.",
            "is_fun": False,
        },
        {
            "question_text": "What's the 'T' in GPT stand for?",
            "options": ["Technology", "Transformer", "Training", "Turing"],
            "correct_answer": 1,
            "explanation": "GPT stands for Generative Pre-trained Transformer.",
            "is_fun": False,
        },
        {
            "question_text": "Your AI startup just raised $100M. What's next?",
            "options": ["Build product", "Hire fast", "Burn cash", "All of the above"],
            "correct_answer": 3,
            "explanation": "Unfortunately, many AI startups follow this exact pattern.",
            "is_fun": True,
        },
    ],
    "football-world": [
        {
            "question_text": "Which country has won the most FIFA World Cups?",
            "options": ["Germany", "Argentina", "Brazil", "Italy"],
            "correct_answer": 2,
            "explanation": "Brazil has won 5 FIFA World Cup titles.",
            "is_fun": False,
        },
        {
            "question_text": "What is the offside rule?",
            "options": ["No idea", "Complicated", "Ask VAR", "All of the above"],
            "correct_answer": 3,
            "explanation": "Even professional referees sometimes struggle with this!",
            "is_fun": True,
        },
    ],
    "movie-buff": [
        {
            "question_text": "Which Indian movie won an Oscar for Best Original Song?",
            "options": ["Lagaan", "Slumdog Millionaire", "RRR", "Gully Boy"],
            "correct_answer": 2,
            "explanation": "RRR's 'Naatu Naatu' won the Oscar for Best Original Song in 2023.",
            "is_fun": False,
        },
        {
            "question_text": "Your friend hasn't watched 'The Dark Knight'. What do you do?",
            "options": ["Recommend it", "Judge them", "Both", "None"],
            "correct_answer": 2,
            "explanation": "It's both a masterpiece and a crime not to have seen it.",
            "is_fun": True,
        },
    ],
    "startup-ecosystem": [
        {
            "question_text": "Which Indian startup reached $1B valuation first?",
            "options": ["Flipkart", "Ola", "Paytm", "Zomato"],
            "correct_answer": 0,
            "explanation": "Flipkart was India's first unicorn, reaching $1B valuation in 2012.",
            "is_fun": False,
        },
        {
            "question_text": "What's the most common startup pitch opening?",
            "options": ["Problem statement", "Market size", "We're the Uber for X", "Team intro"],
            "correct_answer": 2,
            "explanation": "'We're the Uber for X' became a cliché in startup pitches.",
            "is_fun": True,
        },
    ],
}


async def seed():
    # Create tables first
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        from sqlalchemy import select
        from models.challenge import Challenge as ChallengeModel
        result = await session.execute(select(ChallengeModel).limit(1))
        if result.scalar_one_or_none():
            print("Database already seeded. Skipping.")
            return

        print("Seeding QuizCult database...")

        for challenge_data in SEED_CHALLENGES:
            challenge = Challenge(
                title=challenge_data["title"],
                slug=challenge_data["slug"],
                description=challenge_data["description"],
                category=challenge_data["category"],
                source_type=challenge_data["source_type"],
                difficulty=challenge_data["difficulty"],
                tags=challenge_data["tags"],
                is_active=True,
                play_count=0,
                share_count=0,
                avg_score=0,
                challenge_count=0,
            )

            # Add sample questions if available
            questions = SAMPLE_QUESTIONS.get(challenge_data["slug"], [])
            for i, q in enumerate(questions):
                question = Question(
                    question_text=q["question_text"],
                    options=q["options"],
                    correct_answer=q["correct_answer"],
                    explanation=q.get("explanation", ""),
                    difficulty=q.get("difficulty", "medium"),
                    is_fun=q.get("is_fun", False),
                    order=i,
                )
                challenge.questions.append(question)

            session.add(challenge)
            print(f"Created challenge: {challenge.title}")

        await session.commit()
        print("Seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed())
