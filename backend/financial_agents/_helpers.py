"""
Shared LLM call helpers used across all financial agents.
"""
import json
import sys
from ..llm_providers import call_gemini, call_groq, call_perplexity

_BLOCKED_MSG = "### Blocked\n\nThis request is not allowed for security or policy reasons."


def _blocked_json() -> str:
    """Return the standard blocked response as a JSON string (content plus citations)."""
    return json.dumps({"content": _BLOCKED_MSG, "citations": []})


def _groq_with_gemini_fallback(prompt: str, system: str, max_tokens: int, agent: str = "unknown") -> str:
    """
    Call Groq (free cloud API); on any failure fall back to Gemini.
    Returns plain text — callers are responsible for JSON wrapping if needed.
    """
    try:
        return call_groq(prompt, system, max_tokens=max_tokens, agent=agent)
    except Exception as e:
        print(f"Groq unavailable, falling back to Gemini: {e}", file=sys.stderr)
        return call_gemini(prompt, system, max_tokens=max_tokens, agent=agent)


def _perplexity_with_gemini_fallback(prompt: str, system: str, max_tokens: int, agent: str = "unknown") -> str:
    """
    Call Perplexity; on any failure, fall back to Gemini and wrap the plain
    text response in the same {content, citations} JSON envelope so callers
    always receive a consistent format.
    """
    try:
        return call_perplexity(prompt, system, max_tokens=max_tokens, agent=agent)
    except Exception as e:
        print(f"Perplexity unavailable or failed, using Gemini: {e}", file=sys.stderr)
        try:
            content = call_gemini(prompt, system, max_tokens=max_tokens, agent=agent)
            return json.dumps({"content": content, "citations": []})
        except Exception as ge:
            print(f"Gemini also failed: {ge}", file=sys.stderr)
            return json.dumps({"content": f"Analysis temporarily unavailable: {ge}", "citations": []})