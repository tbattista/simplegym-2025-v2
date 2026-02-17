"""
PDF Parser - Extracts workout data from PDF documents.
Sends PDF bytes directly to Gemini multimodal API.
"""

import logging

from .base_parser import ParseResult
from .ai_parser import get_ai_parser

logger = logging.getLogger(__name__)

# Max PDF size: 10MB (Gemini supports up to 20MB inline)
MAX_PDF_BYTES = 10 * 1024 * 1024


class PDFParser:
    """Extracts workout data from PDF documents using AI."""

    def can_parse(self, mime_type: str, filename: str = "") -> bool:
        """Check if the content is a PDF."""
        return (
            mime_type == "application/pdf"
            or filename.lower().endswith(".pdf")
        )

    def parse(self, pdf_bytes: bytes) -> ParseResult:
        """Parse PDF content using AI."""
        if len(pdf_bytes) > MAX_PDF_BYTES:
            return ParseResult(
                errors=[f"PDF too large. Maximum size: {MAX_PDF_BYTES // (1024 * 1024)}MB"]
            )

        ai_parser = get_ai_parser()
        if not ai_parser.is_available():
            return ParseResult(errors=["AI parsing is not available for PDFs."])

        return ai_parser.parse_pdf(pdf_bytes)


pdf_parser = PDFParser()
