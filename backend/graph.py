"""
FinSurf LangGraph agent orchestration.

Graph topology:
  guardrail → research → [tax, sentiment] → dividend (conditional) → END

Conditional routing:
  - If the guardrail blocks the ticker, the run short-circuits immediately.
  - After research completes, tax and sentiment run in parallel (fan-out via
    Send API).
  - The dividend node is only invoked when research signals the ticker is a
    dividend-paying stock, saving ~2 000 Gemini tokens per non-dividend query.
  - Every agent node catches its own exceptions and writes a structured error
    into state so the graph always reaches END cleanly.
"""

import json
import sys
import uuid
from typing import Any, Dict, List, Optional, Annotated
from typing_extensions import TypedDict

from langgraph.graph import StateGraph, END
from langgraph.types import Send

from .telemetry import (
    clear_session_usages,
    get_session_usages,
    summarize_usages,
    telemetry_db,
)
from .financial_agents import (
    security_guardrail,
    research_agent,
    tax_agent,
    dividend_agent,
    social_sentiment_agent,
)

# ---------------------------------------------------------------------------
# Pre-compiled keyword sets for dividend detection
# Built once at import time — never rebuilt inside a hot call path.
# ---------------------------------------------------------------------------
_DIVIDEND_SIGNALS: frozenset = frozenset({
    "dividend yield", "annual dividend", "dividend per share",
    "ex-dividend", "dividend payout", "pays a dividend",
    "quarterly dividend", "dividend growth",
})
_DIVIDEND_NEGATIONS: frozenset = frozenset({
    "does not pay a dividend", "no dividend", "does not pay dividends",
    "non-dividend", "does not currently pay",
})


# ---------------------------------------------------------------------------
# Shared state schema
# ---------------------------------------------------------------------------

def _merge(a: Optional[str], b: Optional[str]) -> Optional[str]:
    """Last-writer-wins merge for optional string fields."""
    return b if b is not None else a


class FinSurfState(TypedDict):
    # --- inputs ---
    ticker: str
    purchase_date: str
    sell_date: str
    shares: float
    years: int
    skip_guardrail: bool

    # --- control flags written by nodes ---
    is_safe: bool                          # set by guardrail node
    is_dividend_stock: bool                # set by research node

    # --- agent outputs (Annotated so parallel nodes can write independently) ---
    research_output: Annotated[Optional[str], _merge]
    tax_output: Annotated[Optional[str], _merge]
    sentiment_output: Annotated[Optional[str], _merge]
    dividend_output: Annotated[Optional[Dict[str, Any]], lambda a, b: b if b is not None else a]

    # --- error accumulation ---
    errors: Annotated[List[str], lambda a, b: a + b]

    # --- telemetry (populated by run_graph after invoke, not by graph nodes) ---
    token_summary: Optional[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Node implementations
# ---------------------------------------------------------------------------

def guardrail_node(state: FinSurfState) -> Dict[str, Any]:
    """Validate the ticker. Sets is_safe; downstream nodes check this flag."""
    if state.get("skip_guardrail", False):
        return {"is_safe": True}
    ticker = state["ticker"]
    try:
        safe = security_guardrail(ticker)
        return {"is_safe": safe}
    except Exception as exc:
        return {"is_safe": False, "errors": [f"guardrail error: {exc}"]}


def research_node(state: FinSurfState) -> Dict[str, Any]:
    """Run equity research; detect whether the ticker pays dividends."""
    if not state.get("is_safe", False):
        blocked = json.dumps({
            "content": "### Blocked\n\nThis request was blocked by the security guardrail.",
            "citations": []
        })
        return {"research_output": blocked, "is_dividend_stock": False}

    ticker = state["ticker"]
    try:
        raw = research_agent(ticker, skip_guardrail=True)
        # Heuristic: research_agent already ran its own prompt, parse the text
        # to detect dividend signals so we can route the graph conditionally.
        lower = raw.lower()
        pays_dividend = any(kw in lower for kw in _DIVIDEND_SIGNALS)
        no_dividend = any(kw in lower for kw in _DIVIDEND_NEGATIONS)
        is_dividend = pays_dividend and not no_dividend
        return {"research_output": raw, "is_dividend_stock": is_dividend}
    except Exception as exc:
        return {
            "research_output": json.dumps({"content": f"Research failed: {exc}", "citations": []}),
            "is_dividend_stock": False,
            "errors": [f"research error: {exc}"],
        }


def tax_node(state: FinSurfState) -> Dict[str, Any]:
    """Run tax analysis."""
    ticker = state["ticker"]
    purchase_date = state.get("purchase_date", "")
    sell_date = state.get("sell_date", "")
    try:
        result = tax_agent(ticker, purchase_date, sell_date, skip_guardrail=True)
        return {"tax_output": result}
    except Exception as exc:
        return {
            "tax_output": json.dumps({
                "content": f"### Tax Analysis Unavailable\n\nReason: {exc}",
                "citations": [],
            }),
            "errors": [f"tax error: {exc}"],
        }


def sentiment_node(state: FinSurfState) -> Dict[str, Any]:
    """Run social sentiment analysis."""
    ticker = state["ticker"]
    try:
        result = social_sentiment_agent(ticker, skip_guardrail=True)
        return {"sentiment_output": result}
    except Exception as exc:
        return {
            "sentiment_output": json.dumps({"content": f"Sentiment failed: {exc}", "citations": []}),
            "errors": [f"sentiment error: {exc}"],
        }


def dividend_node(state: FinSurfState) -> Dict[str, Any]:
    """Run dividend analysis — only reached when is_dividend_stock is True."""
    ticker = state["ticker"]
    shares = state.get("shares", 1.0)
    years = state.get("years", 3)
    try:
        result = dividend_agent(ticker, shares, years, skip_guardrail=True)
        return {"dividend_output": result}
    except Exception as exc:
        return {
            "dividend_output": {
                "isDividendStock": False,
                "hasDividendHistory": False,
                "analysis": f"### Dividend Analysis Unavailable\n\nReason: {exc}",
            },
            "errors": [f"dividend error: {exc}"],
        }


def dividend_skip_node(state: FinSurfState) -> Dict[str, Any]:
    """Placeholder node for non-dividend stocks — zero LLM tokens consumed."""
    return {
        "dividend_output": {
            "isDividendStock": False,
            "hasDividendHistory": False,
            "analysis": f"### No Dividend Data\n\n**{state['ticker']}** does not appear to pay dividends.",
        }
    }


# ---------------------------------------------------------------------------
# Conditional edge factories
# ---------------------------------------------------------------------------

def fan_out_after_research(state: FinSurfState):
    """
    After research, fan out to tax + sentiment in parallel via Send.
    The dividend branch is routed separately via a conditional edge below.
    """
    return [
        Send("tax", state),
        Send("sentiment", state),
    ]


def route_dividend(state: FinSurfState):
    """Conditional: run dividend analysis only when warranted."""
    return "dividend" if state.get("is_dividend_stock", False) else "dividend_skip"


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------

def build_graph() -> Any:
    builder = StateGraph(FinSurfState)

    builder.add_node("guardrail", guardrail_node)
    builder.add_node("research", research_node)
    builder.add_node("tax", tax_node)
    builder.add_node("sentiment", sentiment_node)
    builder.add_node("dividend", dividend_node)
    builder.add_node("dividend_skip", dividend_skip_node)

    builder.set_entry_point("guardrail")

    # guardrail → research (always — direct edge; no conditional logic needed)
    builder.add_edge("guardrail", "research")

    # research → tax + sentiment (parallel fan-out via Send)
    builder.add_conditional_edges("research", fan_out_after_research, ["tax", "sentiment"])

    # tax → dividend routing
    builder.add_conditional_edges("tax", route_dividend, {"dividend": "dividend", "dividend_skip": "dividend_skip"})

    # terminal edges
    builder.add_edge("sentiment", END)
    builder.add_edge("dividend", END)
    builder.add_edge("dividend_skip", END)

    return builder.compile()


# Singleton compiled graph — import this in agents.py
finsurf_graph = build_graph()


# ---------------------------------------------------------------------------
# Convenience runner used by agents.py CLI
# ---------------------------------------------------------------------------

def run_graph(
    ticker: str,
    purchase_date: str = "",
    sell_date: str = "",
    shares: float = 1.0,
    years: int = 3,
    skip_guardrail: bool = False,
) -> FinSurfState:
    # Reset the session token accumulator before each run
    clear_session_usages()

    initial: FinSurfState = {
        "ticker": ticker,
        "purchase_date": purchase_date,
        "sell_date": sell_date,
        "shares": shares,
        "years": years,
        "skip_guardrail": skip_guardrail,
        "is_safe": False,
        "is_dividend_stock": False,
        "research_output": None,
        "tax_output": None,
        "sentiment_output": None,
        "dividend_output": None,
        "errors": [],
        "token_summary": None,
    }
    final: FinSurfState = finsurf_graph.invoke(initial)

    if final.get("errors"):
        for err in final["errors"]:
            print(f"GRAPH WARNING: {err}", file=sys.stderr)

    # Collect and summarize all token usage recorded during this run
    run_id = str(uuid.uuid4())
    usages = get_session_usages()
    summary = summarize_usages(usages)
    final["token_summary"] = summary

    # Persist to SQLite (no-op if TELEMETRY_DISABLED=true)
    try:
        telemetry_db.write_run(run_id, ticker, usages)
    except Exception as exc:
        print(f"TELEMETRY WARNING: could not write to DB: {exc}", file=sys.stderr)

    print(f"TOKEN SUMMARY: {json.dumps(summary)}", file=sys.stderr)
    return final
