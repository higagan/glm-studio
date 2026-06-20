"""Share card generation API."""
import io
import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.gameplay import ChallengePlay
from models.challenge import Challenge

router = APIRouter()


def get_font(size: int):
    """Get a font. Tries system fonts, falls back to default."""
    font_paths = [
        "/System/Library/Fonts/Helvetica.ttc",  # macOS
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",  # Linux
        "C:/Windows/Fonts/arial.ttf",  # Windows
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def generate_share_card(
    challenge_title: str,
    score: int,
    total_questions: int,
    percentile: float,
    player_name: str,
    brand_color: str = "#0ea5e9",
) -> bytes:
    """Generate a shareable PNG card optimized for mobile/social."""
    # Canvas: 1200x630 (OpenGraph optimal), but we also support 1080x1920 for stories
    width, height = 1200, 630

    img = Image.new("RGB", (width, height), "#ffffff")
    draw = ImageDraw.Draw(img)

    # Background gradient effect (simulated with rectangles)
    for y in range(0, height, 4):
        alpha = int(255 * (1 - y / height * 0.3))
        draw.line([(0, y), (width, y)], fill=(240, 248, 255))

    # Accent bar at top
    draw.rectangle([0, 0, width, 12], fill=brand_color)

    # Fonts
    font_title = get_font(48)
    font_score = get_font(96)
    font_label = get_font(32)
    font_small = get_font(24)
    font_brand = get_font(28)

    # Brand header
    draw.text((60, 40), "🏆 QuizCult", fill="#1e293b", font=font_brand)

    # Challenge title
    title_y = 130
    draw.text((60, title_y), challenge_title, fill="#1e293b", font=font_title)

    # Score (big and centered-left)
    score_text = f"{score}/{total_questions}"
    draw.text((60, 230), score_text, fill=brand_color, font=font_score)

    # Labels
    draw.text((60, 360), f"Top {percentile:.0f}% today", fill="#64748b", font=font_label)

    # Divider
    draw.line([(60, 430), (540, 430)], fill="#e2e8f0", width=2)

    # Player name
    draw.text((60, 460), f"Played by {player_name}", fill="#94a3b8", font=font_small)

    # CTA box
    cta_x, cta_y = 60, 520
    cta_w, cta_h = 480, 60
    draw.rounded_rectangle(
        [cta_x, cta_y, cta_x + cta_w, cta_y + cta_h],
        radius=12,
        fill=brand_color,
    )
    cta_text = "Can you beat me? →"
    draw.text((cta_x + 30, cta_y + 14), cta_text, fill="#ffffff", font=font_label)

    # Right side: decorative elements
    # Large emoji/decorative circle
    circle_x, circle_y = 850, 200
    draw.ellipse(
        [circle_x, circle_y, circle_x + 300, circle_y + 300],
        fill="#f0f9ff",
        outline=brand_color,
        width=4,
    )
    font_emoji = get_font(120)
    draw.text((circle_x + 90, circle_y + 80), "🧠", fill="#0ea5e9", font=font_emoji)

    # Save to bytes
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return buf.getvalue()


@router.get("/card/{share_token}.png")
async def get_share_card(share_token: str, db: AsyncSession = Depends(get_db)):
    """Generate a share card PNG for a challenge play."""
    result = await db.execute(
        select(ChallengePlay).where(ChallengePlay.share_token == share_token)
    )
    play = result.scalar_one_or_none()
    if not play:
        raise HTTPException(status_code=404, detail="Challenge not found")

    challenge_result = await db.execute(
        select(Challenge).where(Challenge.id == play.challenge_id)
    )
    challenge = challenge_result.scalar_one()

    # Generate card
    card_bytes = generate_share_card(
        challenge_title=challenge.title,
        score=play.score,
        total_questions=play.total_questions,
        percentile=play.percentile or 50.0,
        player_name="Anonymous",  # TODO: get from user
    )

    return Response(
        content=card_bytes,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=3600",
            "Content-Disposition": f'inline; filename="quizcult-{share_token}.png"',
        },
    )


@router.get("/og/{challenge_id}.png")
async def get_og_image(challenge_id: str, db: AsyncSession = Depends(get_db)):
    """Generate OpenGraph preview image for a challenge."""
    result = await db.execute(
        select(Challenge).where(Challenge.id == challenge_id)
    )
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    width, height = 1200, 630
    img = Image.new("RGB", (width, height), "#0f172a")
    draw = ImageDraw.Draw(img)

    font_title = get_font(64)
    font_sub = get_font(36)
    font_brand = get_font(28)

    draw.text((60, 40), "🏆 QuizCult", fill="#38bdf8", font=font_brand)
    draw.text((60, 200), challenge.title, fill="#ffffff", font=font_title)
    draw.text((60, 340), f"{challenge.play_count:,} plays • {len(challenge.questions)} questions", fill="#94a3b8", font=font_sub)

    # CTA
    draw.rounded_rectangle([60, 460, 420, 530], radius=12, fill="#0ea5e9")
    draw.text((90, 475), "Play Now →", fill="#ffffff", font=font_sub)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    buf.seek(0)

    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )
