"""
Exercise Image Proxy & Cache
Proxies exercise GIFs from ExerciseDB CDN and caches them locally.
Serves cached copies on subsequent requests for reliable, fast loading.
"""

import logging
import httpx
from pathlib import Path
from fastapi import APIRouter, Response
from fastapi.responses import FileResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v3", tags=["Exercise Images"])

CACHE_DIR = Path("backend/cache/exercise-gifs")
SOURCE_URL = "https://static.exercisedb.dev/media"
# ID pattern: alphanumeric, 5-10 chars typical
VALID_ID_PATTERN = r"^[a-zA-Z0-9_-]{3,20}$"


@router.get("/exercise-image/{exercise_db_id}.gif")
async def get_exercise_image(exercise_db_id: str):
    """
    Serve an exercise GIF, fetching from ExerciseDB and caching on first request.
    Subsequent requests serve the cached file directly.
    """
    import re
    if not re.match(VALID_ID_PATTERN, exercise_db_id):
        return Response(status_code=400, content="Invalid exercise ID")

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cached_path = CACHE_DIR / f"{exercise_db_id}.gif"

    # Serve from cache if available
    if cached_path.exists() and cached_path.stat().st_size > 0:
        return FileResponse(
            cached_path,
            media_type="image/gif",
            headers={"Cache-Control": "public, max-age=31536000, immutable"},
        )

    # Fetch from ExerciseDB CDN
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(f"{SOURCE_URL}/{exercise_db_id}.gif")
            if resp.status_code == 200 and len(resp.content) > 100:
                cached_path.write_bytes(resp.content)
                logger.info(f"Cached exercise GIF: {exercise_db_id} ({len(resp.content)} bytes)")
                return FileResponse(
                    cached_path,
                    media_type="image/gif",
                    headers={"Cache-Control": "public, max-age=31536000, immutable"},
                )
            else:
                logger.warning(f"ExerciseDB returned {resp.status_code} for {exercise_db_id}")
    except Exception as e:
        logger.warning(f"Failed to fetch exercise GIF {exercise_db_id}: {e}")

    # Return 404 if we can't get the image
    return Response(status_code=404, content="Exercise image not available")
