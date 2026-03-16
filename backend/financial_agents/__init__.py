"""
financial_agents package — re-exports all public names so existing imports are unchanged.

  from backend.financial_agents import research_agent, security_guardrail, ...
"""
from ._helpers import (
    _BLOCKED_MSG,
    _blocked_json,
    _groq_with_gemini_fallback,
    _perplexity_with_gemini_fallback,
)
from .guardrail import validate_ticker, security_guardrail
from .research import research_agent
from .sentiment import social_sentiment_agent
from .tax_dividend import _narrate_dividend, tax_dividend_agent
from .summary import executive_summary_agent

__all__ = [
    "_BLOCKED_MSG",
    "_blocked_json",
    "_groq_with_gemini_fallback",
    "_perplexity_with_gemini_fallback",
    "validate_ticker",
    "security_guardrail",
    "research_agent",
    "social_sentiment_agent",
    "_narrate_dividend",
    "tax_dividend_agent",
    "executive_summary_agent",
]