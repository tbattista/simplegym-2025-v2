"""
AI Rate Limiter - Tracks and enforces per-user daily limits for AI parsing.
In-memory implementation (resets on server restart, which is acceptable).
"""

import time
import logging
from collections import defaultdict
from typing import Tuple

logger = logging.getLogger(__name__)

# Default limits
DEFAULT_DAILY_LIMIT = 20   # AI parses per authenticated user per day
ANONYMOUS_DAILY_LIMIT = 5  # AI parses per anonymous user per day

# Time window: 24 hours in seconds
DAY_SECONDS = 86400


class AIRateLimiter:
    """In-memory rate limiter for AI parsing requests."""

    def __init__(self):
        # {user_id: [timestamp, ...]}
        self._requests: dict = defaultdict(list)

    def check_limit(self, user_id: str, is_authenticated: bool = True) -> Tuple[bool, int]:
        """
        Check if user is within rate limit.
        Returns (allowed: bool, remaining: int).
        """
        limit = DEFAULT_DAILY_LIMIT if is_authenticated else ANONYMOUS_DAILY_LIMIT
        now = time.time()
        cutoff = now - DAY_SECONDS

        # Clean old entries
        self._requests[user_id] = [
            t for t in self._requests[user_id] if t > cutoff
        ]

        count = len(self._requests[user_id])
        remaining = max(0, limit - count)

        return (count < limit, remaining)

    def record_request(self, user_id: str):
        """Record an AI parse request."""
        self._requests[user_id].append(time.time())

    def get_usage(self, user_id: str, is_authenticated: bool = True) -> dict:
        """Get current usage stats for a user."""
        limit = DEFAULT_DAILY_LIMIT if is_authenticated else ANONYMOUS_DAILY_LIMIT
        now = time.time()
        cutoff = now - DAY_SECONDS

        self._requests[user_id] = [
            t for t in self._requests[user_id] if t > cutoff
        ]

        count = len(self._requests[user_id])
        return {
            "used": count,
            "limit": limit,
            "remaining": max(0, limit - count),
        }


# Singleton
ai_rate_limiter = AIRateLimiter()
