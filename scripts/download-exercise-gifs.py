"""
Download exercise GIF thumbnails from ExerciseDB and update seed data to use local paths.

Usage:
    python scripts/download-exercise-gifs.py

Downloads all exercise GIFs referenced in exercise-seed-data.js to
frontend/assets/img/exercises/ and updates the seed data URLs to local paths.
"""

import json
import re
import time
import urllib.request
import urllib.error
from pathlib import Path

SEED_DATA_PATH = Path("frontend/assets/js/data/exercise-seed-data.js")
OUTPUT_DIR = Path("frontend/assets/img/exercises")
BASE_URL = "https://static.exercisedb.dev/media"
LOCAL_URL_PREFIX = "/static/assets/img/exercises"
MAX_RETRIES = 3


def parse_seed_data():
    """Extract exercise data from the JS seed file."""
    content = SEED_DATA_PATH.read_text(encoding="utf-8")
    # Extract the JSON array from: window.EXERCISE_SEED_DATA = [...]
    match = re.search(r"window\.EXERCISE_SEED_DATA\s*=\s*(\[.*\])", content, re.DOTALL)
    if not match:
        raise ValueError("Could not parse EXERCISE_SEED_DATA from seed file")
    return json.loads(match.group(1))


def download_gif(exercise_db_id: str, output_path: Path) -> bool:
    """Download a single GIF with retries. Returns True on success."""
    url = f"{BASE_URL}/{exercise_db_id}.gif"
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                output_path.write_bytes(data)
                size_kb = len(data) / 1024
                print(f"  OK ({size_kb:.0f} KB)")
                return True
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            print(f"  Attempt {attempt}/{MAX_RETRIES} failed: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(2 * attempt)
    return False


def update_seed_data():
    """Replace external gifUrl values with local paths in the seed data file."""
    content = SEED_DATA_PATH.read_text(encoding="utf-8")
    updated = re.sub(
        r'"gifUrl":\s*"https://static\.exercisedb\.dev/media/([^"]+)\.gif"',
        rf'"gifUrl": "{LOCAL_URL_PREFIX}/\1.gif"',
        content,
    )
    SEED_DATA_PATH.write_text(updated, encoding="utf-8")
    count = content.count("static.exercisedb.dev") - updated.count("static.exercisedb.dev")
    print(f"\nUpdated {count} gifUrl entries in seed data to local paths.")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    exercises = parse_seed_data()

    # Collect exercises with exerciseDbId
    to_download = [
        ex for ex in exercises
        if ex.get("exerciseDbId") and ex.get("gifUrl", "").startswith("http")
    ]

    print(f"Found {len(to_download)} exercises with external GIF URLs.\n")

    success = 0
    failed = []
    skipped = 0

    for i, ex in enumerate(to_download, 1):
        db_id = ex["exerciseDbId"]
        out_path = OUTPUT_DIR / f"{db_id}.gif"

        # Skip if already downloaded
        if out_path.exists() and out_path.stat().st_size > 0:
            print(f"[{i}/{len(to_download)}] {ex['name']} — already exists, skipping")
            skipped += 1
            success += 1
            continue

        print(f"[{i}/{len(to_download)}] {ex['name']} ({db_id})...", end="")
        if download_gif(db_id, out_path):
            success += 1
        else:
            failed.append(ex["name"])

    print(f"\n{'='*50}")
    print(f"Results: {success} OK, {len(failed)} failed, {skipped} skipped (already existed)")

    if failed:
        print(f"\nFailed exercises:")
        for name in failed:
            print(f"  - {name}")

    # Update seed data URLs to local paths
    update_seed_data()

    print("\nDone!")


if __name__ == "__main__":
    main()
