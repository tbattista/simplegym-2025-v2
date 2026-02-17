"""
Image Parser - Extracts workout data from images using Gemini multimodal.
Handles photos of workouts, screenshots, whiteboard photos, etc.
"""

import io
import logging
from typing import Tuple

from .base_parser import ParseResult
from .ai_parser import get_ai_parser

logger = logging.getLogger(__name__)

# Supported image MIME types
SUPPORTED_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
}

# Max image size to send to Gemini (4MB after resize)
MAX_IMAGE_BYTES = 4 * 1024 * 1024

# Max dimension for resize
MAX_DIMENSION = 2048


class ImageParser:
    """Extracts workout data from images using AI vision."""

    def can_parse(self, mime_type: str) -> bool:
        """Check if the MIME type is a supported image format."""
        return mime_type.lower() in SUPPORTED_TYPES

    def parse(self, image_bytes: bytes, mime_type: str) -> ParseResult:
        """Parse image content using AI."""
        if not self.can_parse(mime_type):
            return ParseResult(errors=[f"Unsupported image type: {mime_type}"])

        ai_parser = get_ai_parser()
        if not ai_parser.is_available():
            return ParseResult(errors=["AI parsing is not available for images."])

        # Resize if needed
        processed_bytes, processed_mime = self._preprocess_image(image_bytes, mime_type)

        return ai_parser.parse_image(processed_bytes, processed_mime)

    def _preprocess_image(
        self, image_bytes: bytes, mime_type: str
    ) -> Tuple[bytes, str]:
        """Resize image if too large. Returns (bytes, mime_type)."""
        if len(image_bytes) <= MAX_IMAGE_BYTES:
            return image_bytes, mime_type

        try:
            from PIL import Image

            img = Image.open(io.BytesIO(image_bytes))

            # Resize maintaining aspect ratio
            if max(img.size) > MAX_DIMENSION:
                img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

            # Save as JPEG for compression
            output = io.BytesIO()
            if img.mode == "RGBA":
                img = img.convert("RGB")
            img.save(output, format="JPEG", quality=85, optimize=True)
            output.seek(0)

            result_bytes = output.read()
            logger.info(
                f"Image resized: {len(image_bytes)} -> {len(result_bytes)} bytes"
            )
            return result_bytes, "image/jpeg"

        except ImportError:
            logger.warning("Pillow not installed, sending original image")
            return image_bytes, mime_type
        except Exception as e:
            logger.warning(f"Image preprocessing failed: {e}, sending original")
            return image_bytes, mime_type


image_parser = ImageParser()
