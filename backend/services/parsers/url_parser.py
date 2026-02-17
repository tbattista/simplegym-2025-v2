"""
URL Parser - Extracts workout content from web URLs.
Uses trafilatura for content extraction, then AI for workout parsing.
"""

import logging
import re

import trafilatura

from .base_parser import ParseResult
from .ai_parser import get_ai_parser

logger = logging.getLogger(__name__)

# Max text length to send to AI (roughly 10K tokens)
MAX_EXTRACTED_TEXT = 15000

# URL validation pattern
URL_PATTERN = re.compile(
    r'^https?://'
    r'(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*'
    r'[a-zA-Z]{2,}'
    r'(?:/[^\s]*)?$'
)


class URLParser:
    """Extracts workout data from web URLs."""

    def can_parse(self, url: str) -> bool:
        """Check if the input looks like a valid URL."""
        return bool(URL_PATTERN.match(url.strip()))

    def parse(self, url: str) -> ParseResult:
        """Fetch URL content and parse using AI."""
        url = url.strip()

        if not self.can_parse(url):
            return ParseResult(errors=["Invalid URL format"])

        try:
            # Download and extract main content
            downloaded = trafilatura.fetch_url(url)
            if not downloaded:
                return ParseResult(
                    errors=["Could not fetch the URL. The page may be private or unavailable."]
                )

            extracted = trafilatura.extract(
                downloaded,
                include_comments=False,
                include_tables=True,
                output_format="txt",
            )

            if not extracted or len(extracted.strip()) < 20:
                return ParseResult(
                    errors=["Could not extract meaningful content from the URL. "
                            "The page may require login or have no readable text."]
                )

            # Truncate if too long
            text = extracted[:MAX_EXTRACTED_TEXT]
            if len(extracted) > MAX_EXTRACTED_TEXT:
                logger.warning(
                    f"Truncated URL content from {len(extracted)} to {MAX_EXTRACTED_TEXT} chars"
                )

            # Feed to AI parser
            ai_parser = get_ai_parser()
            if not ai_parser.is_available():
                return ParseResult(
                    errors=["AI parsing is not available. Please paste the workout text directly."]
                )

            result = ai_parser.parse_url_content(text, url)

            # Add URL source warning
            if result.success:
                result.warnings = list(result.warnings) + [f"Content extracted from: {url}"]

            return result

        except Exception as e:
            logger.error(f"URL parser error for {url}: {e}")
            return ParseResult(errors=[f"Failed to process URL: {str(e)}"])


url_parser = URLParser()
