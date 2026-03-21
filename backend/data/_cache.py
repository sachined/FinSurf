"""
Shared in-process cache utilities used by all data-fetcher modules.

Both functions operate on any plain dict[str, dict] — callers own their
cache objects; this module only provides get/set primitives.

_cache_get() fix: was using deprecated datetime.utcnow() in the original
data_fetcher.py; both paths now use datetime.now(UTC) consistently.
"""
import datetime
from typing import Any, Dict, Optional


def _cache_get(cache: Dict[str, Dict[str, Any]], key: str, ttl: float) -> Optional[Dict[str, Any]]:
    """Return cached entry if present and within TTL, else None."""
    entry = cache.get(key)
    if entry and (datetime.datetime.now(datetime.UTC).timestamp() - entry["_ts"] < ttl):
        return {k: v for k, v in entry.items() if k != "_ts"}
    return None


def _cache_set(cache: Dict[str, Dict[str, Any]], key: str, data: Dict[str, Any]) -> None:
    """Store data in cache with the current timestamp."""
    cache[key] = {**data, "_ts": datetime.datetime.now(datetime.UTC).timestamp()}
