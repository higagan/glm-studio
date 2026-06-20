from datetime import datetime, timedelta
from typing import Tuple

LEVEL_TITLES = {
    1: "Curious Rookie",
    5: "Knowledge Hunter",
    10: "Trend Tracker",
    20: "Trivia Warrior",
    50: "Legend",
}

BADGE_DEFINITIONS = {
    "ai_insider": {"name": "AI Insider", "description": "Played 10 AI challenges", "threshold": 10},
    "cricket_fanatic": {"name": "Cricket Fanatic", "description": "Played 20 cricket challenges", "threshold": 20},
    "movie_buff": {"name": "Movie Buff", "description": "Played 15 movie challenges", "threshold": 15},
    "startup_geek": {"name": "Startup Geek", "description": "Played 10 startup challenges", "threshold": 10},
    "football_expert": {"name": "Football Expert", "description": "Played 15 football challenges", "threshold": 15},
}


def get_level_title(level: int) -> str:
    sorted_levels = sorted(LEVEL_TITLES.keys(), reverse=True)
    for lvl in sorted_levels:
        if level >= lvl:
            return LEVEL_TITLES[lvl]
    return LEVEL_TITLES[1]


def xp_for_next_level(level: int) -> int:
    return 100 * (level ** 1.5)


def calculate_xp(score: int, total_questions: int, time_seconds: int, streak: int) -> int:
    base_xp = score * 10
    speed_bonus = max(0, (total_questions * 30 - time_seconds) // 10)  # bonus for speed
    streak_multiplier = min(streak, 10)  # max 10x
    total = (base_xp + speed_bonus) * max(1, streak_multiplier // 5)
    return max(10, total)  # minimum 10 XP


def update_streak(current: int, longest: int, last_played: datetime) -> Tuple[int, int]:
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    last = last_played.replace(hour=0, minute=0, second=0, microsecond=0) if last_played else None

    if last is None:
        return 1, max(longest, 1)

    if last == today:
        return current, longest  # already played today
    elif last == today - timedelta(days=1):
        new_streak = current + 1
        return new_streak, max(longest, new_streak)
    else:
        return 1, longest


def check_badge_eligibility(user_badges: list, category: str, play_count: int) -> list:
    new_badges = []
    category_map = {
        "ai": "ai_insider",
        "sports_cricket": "cricket_fanatic",
        "movies": "movie_buff",
        "startups": "startup_geek",
        "sports_football": "football_expert",
    }

    badge_key = category_map.get(category)
    if badge_key and badge_key not in user_badges:
        threshold = BADGE_DEFINITIONS[badge_key]["threshold"]
        if play_count >= threshold:
            new_badges.append(badge_key)

    return new_badges
