"""
Shared LLM call helpers used across all financial agents.

These wrappers provide provider fallback patterns (Groq/Perplexity → Gemini)
with centralized retry logic for robustness.
"""
import json
import sys
from ..llm_providers import call_gemini, call_groq, call_perplexity
from ..retry_utils import retry_with_fallback

_BLOCKED_MSG = "### Blocked\n\nThis request is not allowed for security or policy reasons."


def _blocked_json() -> str:
    """Return the standard blocked response as a JSON string (content plus citations)."""
    return json.dumps({"content": _BLOCKED_MSG, "citations": []})


def _error_json(message: str) -> str:
    """Return a standard error/content response as a JSON string (content plus empty citations)."""
    return json.dumps({"content": message, "citations": []})


_groq_safe = retry_with_fallback(
    primary_func=lambda p, s, m, a: call_groq(p, s, max_tokens=m, agent=a),
    fallback_func=lambda p, s, m, a: call_gemini(p, s, max_tokens=m, agent=a),
    max_retries=0,  # fail-fast: Groq is a free-tier API, fall to Gemini immediately
    log_prefix="Groq"
)


def _groq_with_gemini_fallback(prompt: str, system: str, max_tokens: int, agent: str = "unknown") -> str:
    """Call Groq; on any failure fall back to Gemini immediately (no retries on Groq).
    Returns plain text — callers are responsible for JSON wrapping if needed."""
    return _groq_safe(prompt, system, max_tokens, agent)


def _perplexity_gemini_fallback(p: str, s: str, m: int, a: str) -> str:
    """Gemini fallback for Perplexity: wraps plain-text response in {content, citations} envelope."""
    try:
        content = call_gemini(p, s, max_tokens=m, agent=a)
        return json.dumps({"content": content, "citations": []})
    except Exception as ge:
        print(f"Gemini also failed: {ge}", file=sys.stderr)
        return json.dumps({"content": f"Analysis temporarily unavailable: {ge}", "citations": []})


_perplexity_safe = retry_with_fallback(
    primary_func=lambda p, s, m, a: call_perplexity(p, s, max_tokens=m, agent=a),
    fallback_func=_perplexity_gemini_fallback,
    max_retries=0,  # fail-fast: Perplexity is optional, fall to Gemini immediately
    log_prefix="Perplexity"
)


def _perplexity_with_gemini_fallback(prompt: str, system: str, max_tokens: int, agent: str = "unknown") -> str:
    """Call Perplexity; on any failure fall back to Gemini, wrapping the response in
    the same {content, citations} JSON envelope so callers always receive a consistent format."""
    return _perplexity_safe(prompt, system, max_tokens, agent)