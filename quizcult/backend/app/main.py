from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.analytics import router as analytics_router
from api.challenges import router as challenges_router
from api.cron import router as cron_router
from api.gameplay import router as gameplay_router
from api.leaderboard import router as leaderboard_router
from api.sharing import router as sharing_router
from api.users import router as users_router
from core.config import get_settings
from core.database import init_db, AsyncSessionLocal

settings = get_settings()
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Seed database on first run
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        from models.challenge import Challenge
        result = await session.execute(select(Challenge).limit(1))
        if not result.scalar_one_or_none():
            from seed import seed
            await seed()
    logger.info("quizcult_backend_started")
    yield
    logger.info("quizcult_backend_stopped")


app = FastAPI(
    title="QuizCult API",
    description="Prove You Know It.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://quizcult.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.quiz_creator import router as quiz_creator_router

app.include_router(challenges_router, prefix="/api/challenges", tags=["challenges"])
app.include_router(gameplay_router, prefix="/api/gameplay", tags=["gameplay"])
app.include_router(leaderboard_router, prefix="/api/leaderboard", tags=["leaderboard"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
app.include_router(cron_router, prefix="/api/cron", tags=["cron"])
app.include_router(sharing_router, prefix="/api/share", tags=["sharing"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(quiz_creator_router, prefix="/api/quiz", tags=["quiz"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
