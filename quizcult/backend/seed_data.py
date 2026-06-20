# Seed data for QuizCult - Initial evergreen challenges

SEED_CHALLENGES = [
    {
        "title": "🐍 Python Mastery",
        "slug": "python-mastery",
        "category": "tech",
        "description": "Test your Python knowledge",
        "source_type": "evergreen",
        "difficulty": "medium",
        "questions": [
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
        ],
    },
    {
        "title": "☁️ AWS Fundamentals",
        "slug": "aws-fundamentals",
        "category": "tech",
        "description": "Core AWS services and architecture",
        "source_type": "evergreen",
        "difficulty": "medium",
        "questions": [
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
        ],
    },
    {
        "title": "⚽ Champions League 2024",
        "slug": "champions-league-2024",
        "category": "sports",
        "description": "Test your Champions League knowledge",
        "source_type": "trending",
        "difficulty": "medium",
        "questions": [
            {
                "question_text": "Which team won the 2024 Champions League final?",
                "options": ["Real Madrid", "Manchester City", "Bayern Munich", "PSG"],
                "correct_answer": 0,
                "explanation": "Real Madrid won their 15th Champions League title.",
                "is_fun": False,
            },
            {
                "question_text": "How many Champions League titles does Carlo Ancelotti have as manager?",
                "options": ["2", "3", "4", "5"],
                "correct_answer": 3,
                "explanation": "Ancelotti has won 5 Champions League titles - the most by any manager.",
                "is_fun": False,
            },
        ],
    },
]
