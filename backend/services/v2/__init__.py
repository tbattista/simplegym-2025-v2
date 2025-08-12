"""
V2 Services Module

This module contains the next generation of document processing services
that use HTML templates and Gotenberg for PDF generation.
"""

from .document_service_v2 import DocumentServiceV2
from .gotenberg_client import GotenbergClient

__all__ = ['DocumentServiceV2', 'GotenbergClient']
