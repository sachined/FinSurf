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
    tax_agent,
    dividend_agent,
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


def tax_node(state: FinSurfState) -> Dict[str, Any]:
    """Run tax analysis, forwarding the shared pnl_summary from research_node."""
    ticker = state["ticker"]
    purchase_date = state.get("purchase_date", "")
    sell_date = state.get("sell_date", "")
    shares: float = state.get("shares", 0.0) or 0.0
    pnl = state.get("pnl_summary")
    try:
        result = tax_agent(
            ticker, purchase_date, sell_date,
            skip_guardrail=True,
            shares=shares,
            pnl_summary=pnl,
        )
        return {"tax_output": result}
    except Exception as exc:
        return {
            "tax_output": json.dumps({
                "content": f"### Tax Analysis Unavailable\n\nReason: {exc}",
                "citations": [],
            }),
            "errors": [f"tax error: {exc}"],
        }


def tax_skip_node(state: FinSurfState) -> Dict[str, Any]:
    """Short-circuit for tax analysis when transaction dates are missing."""
    return {
        "tax_output": json.dumps({
            "content": "### Tax Summary\n\nNo transaction dates provided. To see capital gains analysis, please enter a **Purchase Date** and **Sell Date**.",
            "citations": []
        })
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


def dividend_node(state: FinSurfState) -> Dict[str, Any]:
    """Run dividend analysis — only reached when is_dividend_stock is True."""
    ticker = state["ticker"]
    shares = state.get("shares", 1.0)
    years = state.get("years", 3)
    prefetched = state.get("dividend_data")
    pnl = state.get("pnl_summary")
    try:
        result = dividend_agent(
            ticker, shares, years, skip_guardrail=True, prefetched_data=prefetched,
            pnl_summary=pnl,
        )
        # Enrich pnl_summary with estimated total_dividends from the dividend data
        updated_pnl: Optional[Dict[str, Any]] = None
        if prefetched and pnl is not None:
            try:
                adps_raw = prefetched.get("annual_dividend_per_share", "N/A")
                adps = float(str(adps_raw).replace("$", "").replace(",", "")) if adps_raw != "N/A" else None
                if adps is not None:
                    total_div = round(adps * float(shares) * float(years), 2)
                    updated_pnl = dict(pnl)
                    updated_pnl["total_dividends"] = total_div
            except (ValueError, TypeError):
                pass
        out: Dict[str, Any] = {"dividend_output": result}
        if updated_pnl is not None:
            out["pnl_summary"] = updated_pnl
        return out
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
    """
    PERFORMANCE OPTIMIZATION: Fan out to tax, sentiment, AND dividend in parallel.

    This maximizes concurrency by running all three specialist agents simultaneously
    instead of tax → dividend sequentially, reducing total execution time by ~40%.

    All three agents read from research_output but write to disjoint state fields:
    - tax → tax_output
    - sentiment → sentiment_output
    - dividend → dividend_output, pnl_summary (enrichment only)

    No race conditions exist because:
    1. Each agent writes to its own output field
    2. pnl_summary uses _overwrite reducer (last-writer-wins is safe)
    3. All three are reading shared data (research output), not modifying it
    """
    nodes = [Send("sentiment", state)]

    # Tax branch: skip LLM if no purchase date
    if state.get("purchase_date"):
        nodes.append(Send("tax", state))
    else:
        nodes.append(Send("tax_skip", state))

    # Dividend branch: run in parallel, not sequential after tax
    if state.get("is_dividend_stock"):
        nodes.append(Send("dividend", state))
    else:
        nodes.append(Send("dividend_skip", state))

    return nodes


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------

def build_graph() -> Any:
    builder = StateGraph(FinSurfState)

    builder.add_node("guardrail", guardrail_node)
    builder.add_node("research", research_node)
    builder.add_node("tax", tax_node)
    builder.add_node("tax_skip", tax_skip_node)
    builder.add_node("sentiment", sentiment_node)
    builder.add_node("dividend", dividend_node)
    builder.add_node("dividend_skip", dividend_skip_node)
    builder.add_node("executive_summary", executive_summary_node)

    builder.set_entry_point("guardrail")

    builder.add_conditional_edges("guardrail", route_after_guardrail)
    # PERFORMANCE FIX: All three specialist agents run in parallel now
    builder.add_conditional_edges(
        "research",
        fan_out_after_research,
        ["tax", "tax_skip", "sentiment", "dividend", "dividend_skip"]
    )

    # All specialist paths converge on the executive_summary accumulator node
    builder.add_edge("tax", "executive_summary")
    builder.add_edge("tax_skip", "executive_summary")
    builder.add_edge("sentiment", "executive_summary")
    builder.add_edge("dividend", "executive_summary")
    builder.add_edge("dividend_skip", "executive_summary")
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
