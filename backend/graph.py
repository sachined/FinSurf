"""
FinSurf LangGraph agent orchestration.

Graph topology:
  guardrail → research → [tax_dividend, sentiment] → executive_summary → END

Conditional routing:
  - If the guardrail blocks the ticker, the run short-circuits immediately.
  - After research completes, tax_dividend and sentiment run in parallel.
  - tax_dividend handles both tax and dividend in a single node (one LLM call
    for tax when dates are provided; template-based dividend narration with zero
    LLM tokens). Skip logic is handled internally — no skip nodes needed.
  - Every agent node catches its own exceptions and writes a structured error
    into state so the graph always reaches END cleanly.
"""

import json
import sys
import uuid
from typing import Any, Annotated, Dict, Optional, TypedDict


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
    tax_dividend_agent,
    social_sentiment_agent,
    executive_summary_agent,
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

def _overwrite(a: Any, b: Any) -> Any:
    """Last-writer-wins merge for optional string fields."""
    return b if b is not None else a

def _extend_list(a: list[str], b: list[str]) -> list[str]:
    """Concatenate string fields, favoring b."""
    return a + b


class FinSurfState(TypedDict):
    ticker: str
    purchase_date: str
    sell_date: str
    shares: float
    years: int
    skip_guardrail: bool
    is_safe: bool
    is_dividend_stock: bool
    sentiment_data: Annotated[dict[str, Any] | None, _overwrite]
    research_output: Annotated[str | None, _overwrite]
    tax_output: Annotated[str | None, _overwrite]
    sentiment_output: Annotated[str | None, _overwrite]
    dividend_output: Annotated[dict[str, Any] | None, _overwrite]
    price_history: Annotated[list[dict[str, str | float]] | None, _overwrite]
    buy_price: Annotated[float | None, _overwrite]
    sell_price: Annotated[float | None, _overwrite]
    current_price: Annotated[float | None, _overwrite]
    dividend_data: Annotated[dict[str, Any] | None, _overwrite]
    pnl_summary: Annotated[dict[str, Any] | None, _overwrite]
    executive_summary_output: Annotated[str | None, _overwrite]
    errors: Annotated[list[str], _extend_list]
    token_summary: Annotated[dict[str, Any] | None, _overwrite]

def guardrail_node(state: FinSurfState) -> Dict[str, Any]:
    """Validate the ticker. Sets is_safe; downstream nodes check this flag."""
    if state.get("skip_guardrail", False):
        return {"is_safe": True}
    ticker = state["ticker"]
    try:
        safe = security_guardrail(ticker)
        if not safe:
            blocked = json.dumps({"content": f"Ticker '{ticker}' is blocked.", "citations": []})
            return {"is_safe": False, "research_output": blocked}
        return {"is_safe": True}
    except Exception as exc:
        return {"is_safe": False, "errors": [f"guardrail error: {exc}"]}

def route_after_guardrail(state: FinSurfState):
    return "research" if state.get("is_safe", False) else "executive_summary"

def research_node(state: FinSurfState) -> Dict[str, Any]:
    ticker = state["ticker"]
    purchase_date = state.get("purchase_date", "")
    sell_date = state.get("sell_date", "")
    shares = state.get("shares", 0.0)

    # 1. Initialize variables to prevent UnboundLocalError
    div_data = None
    price_history = []
    buy_price = None
    sell_price = None
    current_price = None
    pnl = None
    sentiment_data = {"news": [], "recommendations": {}}

    try:
        # 2. Check guardrail BEFORE the expensive agent call
        if not state.get("is_safe", False):
            blocked = json.dumps({"content": "Ticker Not Found", "citations": []})
            return {"research_output": blocked, "is_dividend_stock": False}

        raw = research_agent(ticker, purchase_date=purchase_date, sell_date=sell_date, skip_guardrail=True, shares=shares)

        # 3. Parse JSON safely
        try:
            parsed = json.loads(raw)
            price_history = parsed.get("price_history") or []
            div_data = parsed.get("dividend_data")
            buy_price = parsed.get("buy_price")
            sell_price = parsed.get("sell_price")
            current_price = parsed.get("current_price")
            pnl = parsed.get("pnl_summary")

            # Pre-fetch sentiment data to share with the sentiment node
            sentiment_data = {
                "news": parsed.get("news", []),
                "recommendations": parsed.get("recommendations", {}),
            }
        except ValueError:
            pass  # Keep defaults if JSON parsing fails

        # 4. ROBUST DIVIDEND DETECTION
        # Prioritize numerical flag from yfinance over AI narrative
        if div_data and div_data.get("is_dividend_stock"):
            is_dividend = True
        else:
            # Fallback to narrative search
            lower = raw.lower()
            is_dividend = any(kw in lower for kw in _DIVIDEND_SIGNALS) and \
                          not any(kw in lower for kw in _DIVIDEND_NEGATIONS)

        return {
            "research_output": raw,
            "is_dividend_stock": is_dividend,
            "sentiment_data": sentiment_data,
            "price_history": price_history,
            "dividend_data": div_data,
            "buy_price": buy_price,
            "sell_price": sell_price,
            "current_price": current_price,
            "pnl_summary": pnl,
        }

    except Exception as exc:
        # Properly capture and return the error
        return {
            "research_output": json.dumps({"content": f"Research failed: {exc}", "citations": []}),
            "is_dividend_stock": False,
            "errors": [f"research error: {exc}"],
        }


def tax_dividend_node(state: FinSurfState) -> Dict[str, Any]:
    """Combined tax + dividend node — single LLM call (or zero for dividend-only).

    Replaces the four separate tax_node, tax_skip_node, dividend_node, and
    dividend_skip_node. The agent handles all skip logic internally so no
    conditional routing is required in the fan-out.
    """
    ticker = state["ticker"]
    try:
        tax_output, dividend_output = tax_dividend_agent(
            ticker=ticker,
            purchase_date=state.get("purchase_date", ""),
            sell_date=state.get("sell_date", ""),
            shares=state.get("shares", 0.0) or 0.0,
            years=state.get("years", 3),
            pnl_summary=state.get("pnl_summary"),
            dividend_data=state.get("dividend_data"),
            is_dividend_stock=state.get("is_dividend_stock", False),
            skip_guardrail=True,
        )
        out: Dict[str, Any] = {"tax_output": tax_output, "dividend_output": dividend_output}
        # Propagate enriched pnl_summary (total_dividends) if dividend agent updated it
        updated_pnl = dividend_output.get("pnl_summary") if isinstance(dividend_output, dict) else None
        if updated_pnl is not None:
            out["pnl_summary"] = updated_pnl
        return out
    except Exception as exc:
        skip_tax = json.dumps({"content": f"### Tax Analysis Unavailable\n\nReason: {exc}", "citations": []})
        return {
            "tax_output": skip_tax,
            "dividend_output": {"isDividendStock": False, "hasDividendHistory": False, "analysis": f"Dividend analysis unavailable: {exc}"},
            "errors": [f"tax_dividend error: {exc}"],
        }


def sentiment_node(state: FinSurfState) -> Dict[str, Any]:
    ticker = state["ticker"]
    prefetched = state.get("sentiment_data") # Use pre-fetched data
    try:
        result = social_sentiment_agent(ticker, skip_guardrail=True, prefetched_data=prefetched)
        return {"sentiment_output": result}
    except Exception as exc:
        return {
            "sentiment_output": json.dumps({"content": f"Sentiment failed: {exc}", "citations": []}),
            "errors": [f"sentiment error: {exc}"],
        }


def executive_summary_node(state: FinSurfState) -> Dict[str, Any]:
    """Accumulator node — runs after all specialist agents have written to state.
    Weaves research, tax, sentiment, and dividend findings into one narrative."""
    if not state.get("is_safe", False):
        return {"executive_summary_output": state.get("research_output")}
    ticker = state["ticker"]
    try:
        result = executive_summary_agent(
            ticker,
            research_output=state.get("research_output"),
            tax_output=state.get("tax_output"),
            sentiment_output=state.get("sentiment_output"),
            dividend_output=state.get("dividend_output"),
            pnl_summary=state.get("pnl_summary"),
        )
        return {"executive_summary_output": result}
    except Exception as exc:
        return {
            "executive_summary_output": json.dumps({"content": f"Executive summary failed: {exc}", "citations": []}),
            "errors": [f"executive_summary error: {exc}"],
        }


# ---------------------------------------------------------------------------
# Conditional edge factories
# ---------------------------------------------------------------------------

def fan_out_after_research(state: FinSurfState):
    """Fan out to tax_dividend and sentiment in parallel after research completes.

    tax_dividend handles all skip logic internally (no purchase_date → skip tax,
    not a dividend stock → skip dividend), so no conditional routing is needed here.
    Both nodes write to disjoint state fields — no race conditions.
    """
    return [Send("tax_dividend", state), Send("sentiment", state)]


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------

def build_graph() -> Any:
    builder = StateGraph(FinSurfState)

    builder.add_node("guardrail", guardrail_node)
    builder.add_node("research", research_node)
    builder.add_node("tax_dividend", tax_dividend_node)
    builder.add_node("sentiment", sentiment_node)
    builder.add_node("executive_summary", executive_summary_node)

    builder.set_entry_point("guardrail")

    builder.add_conditional_edges("guardrail", route_after_guardrail)
    builder.add_conditional_edges("research", fan_out_after_research, ["tax_dividend", "sentiment"])

    # Both parallel nodes converge on the executive_summary accumulator
    builder.add_edge("tax_dividend", "executive_summary")
    builder.add_edge("sentiment", "executive_summary")
    builder.add_edge("executive_summary", END)

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
    # New parameters for usage tracking
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> FinSurfState:
    clear_session_usages()

    run_id = str(uuid.uuid4())

    # Log the high-level request event before starting the graph
    try:
        telemetry_db.write_request(run_id, ticker, user_id, ip_address, lat, lon)
    except Exception as exc:
        print(f"TELEMETRY WARNING: could not write request to DB: {exc}", file=sys.stderr)

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
        "sentiment_data": None,
        "price_history": None,
        "buy_price": None,
        "sell_price": None,
        "current_price": None,
        "dividend_data": None,
        "pnl_summary": None,
        "executive_summary_output": None,
        "errors": [],
        "token_summary": None,
    }
    final: FinSurfState = finsurf_graph.invoke(initial)

    if final.get("errors"):
        for err in final["errors"]:
            print(f"GRAPH WARNING: {err}", file=sys.stderr)

    usages = get_session_usages()
    summary = summarize_usages(usages)
    final["token_summary"] = summary

    # Persist agent calls (token usage) linked to the same run_id
    try:
        telemetry_db.write_run(run_id, ticker, usages)
    except Exception as exc:
        print(f"TELEMETRY WARNING: could not write run usage to DB: {exc}", file=sys.stderr)

    print(f"TOKEN SUMMARY: {json.dumps(summary)}", file=sys.stderr)
    return final
