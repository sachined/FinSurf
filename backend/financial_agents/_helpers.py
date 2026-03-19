"""
Shared LLM call helpers used across all financial agents.

These wrappers provide provider fallback patterns (Groq/Perplexity → Gemini)
with centralized retry logic for robustness.
"""
import json
import sys
from ..llm_providers import call_gemini, call_groq, call_perplexity
from ..retry_utils import with_fallback

_BLOCKED_MSG = "### Blocked\n\nThis request is not allowed for security or policy reasons."


def _blocked_json() -> str:
    """Return the standard blocked response as a JSON string (content plus citations)."""
    return json.dumps({"content": _BLOCKED_MSG, "citations": []})


def _error_json(message: str) -> str:
    """Return a standard error/content response as a JSON string (content plus empty citations)."""
    return json.dumps({"content": message, "citations": []})


def _groq_with_gemini_fallback(prompt: str, system: str, max_tokens: int, agent: str = "unknown") -> str:
    """
    Call Groq (free cloud API); on any failure fall back to Gemini.
    Returns plain text — callers are responsible for JSON wrapping if needed.

    Uses the unified retry_utils.with_fallback decorator for consistent error handling.
    """
    @with_fallback(
        fallback_func=lambda p, s, m, a: call_gemini(p, s, max_tokens=m, agent=a),
        log_message="Groq unavailable, falling back to Gemini"
    )
    def _call_groq(p: str, s: str, m: int, a: str) -> str:
        return call_groq(p, s, max_tokens=m, agent=a)

    return _call_groq(prompt, system, max_tokens, agent)


def _perplexity_with_gemini_fallback(prompt: str, system: str, max_tokens: int, agent: str = "unknown") -> str:
    """
    Call Perplexity; on any failure, fall back to Gemini and wrap the plain
    text response in the same {content, citations} JSON envelope so callers
    always receive a consistent format.

    Uses the unified retry_utils.with_fallback decorator for consistent error handling.
    """
    def _gemini_fallback(p: str, s: str, m: int, a: str) -> str:
        """Gemini fallback that wraps response in JSON envelope."""
        try:
            content = call_gemini(p, s, max_tokens=m, agent=a)
            return json.dumps({"content": content, "citations": []})
        except Exception as ge:
            print(f"Gemini also failed: {ge}", file=sys.stderr)
            return json.dumps({"content": f"Analysis temporarily unavailable: {ge}", "citations": []})

    @with_fallback(
        fallback_func=_gemini_fallback,
        log_message="Perplexity unavailable or failed, using Gemini"
    )
    def _call_perplexity(p: str, s: str, m: int, a: str) -> str:
        return call_perplexity(p, s, max_tokens=m, agent=a)

    return _call_perplexity(prompt, system, max_tokens, agent)