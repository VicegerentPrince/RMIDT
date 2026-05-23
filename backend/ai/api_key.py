"""
Per-request Gemini API key override via ContextVar.

The FastAPI middleware in main.py sets the context variable for each request
from the X-Gemini-API-Key header.  All Gemini callers use get_api_key() so
a user-supplied key is used transparently without changing any function signatures.
"""

import os
from contextvars import ContextVar

_key_var: ContextVar[str | None] = ContextVar("gemini_api_key_override", default=None)


def get_api_key() -> str:
    """Return the per-request override key, or fall back to the env var."""
    return _key_var.get() or os.environ.get("GEMINI_API_KEY", "")


def set_request_key(key: str | None):
    """Set the override key for the current async context. Returns a reset token."""
    return _key_var.set(key if key else None)


def reset_request_key(token) -> None:
    """Reset the context variable to its previous value."""
    _key_var.reset(token)
