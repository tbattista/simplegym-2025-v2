"""
Base Parser - Abstract base class and data structures for workout import parsers.
Strategy pattern: each parser implements can_parse() and parse() methods.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any


@dataclass
class ParseResult:
    """Result of parsing workout content."""
    success: bool = False
    workout_data: Optional[Dict[str, Any]] = None  # WorkoutTemplate-compatible dict
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    confidence: float = 0.0  # 0.0-1.0
    source_format: str = "unknown"


class BaseParser(ABC):
    """Abstract base class for all workout parsers."""

    @abstractmethod
    def can_parse(self, content: str, content_type: str = None) -> bool:
        """Check if this parser can handle the given content."""
        pass

    @abstractmethod
    def parse(self, content: str, hints: Dict = None) -> ParseResult:
        """Parse the content into a WorkoutTemplate-compatible dict."""
        pass
