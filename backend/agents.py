"""
FinSurf CLI dispatcher — powered by LangGraph.

Usage:
  python agents.py <mode> <args...>

Modes (legacy interface kept intact for server.ts compatibility):
  research  <ticker>
  tax       <ticker> <purchase_date> <sell_date> [shares]
  dividend  <ticker> <shares> <years> [purchase_date] [sell_date]
  sentiment <ticker>
  guardrail <ticker>
  graph     <ticker> <purchase_date> <sell_date> <shares> <years>
"""

import sys
import json
import os

# Ensure the project root (parent of this file's directory) is on sys.path so
# that `from backend.X import ...` works whether agents.py is invoked as
# `python backend/agents.py` (adds backend/ to path) or via `-m backend.agents`.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()


def _skip_guard() -> bool:
    return os.environ.get("SKIP_GUARDRAIL") == "true"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: agents.py <mode> <args...>", file=sys.stderr)
        sys.exit(1)

    try:
        mode = sys.argv[1]
        skip_guard = _skip_guard()

        # ── full graph run ────────────────────────────────────────────────
        if mode == "graph":
            from backend.graph import run_graph
            ticker       = sys.argv[2]
            purchase     = sys.argv[3] if len(sys.argv) > 3 else ""
            sell         = sys.argv[4] if len(sys.argv) > 4 else ""
            shares       = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
            years        = int(sys.argv[6])   if len(sys.argv) > 6 else 3
            result = run_graph(ticker, purchase, sell, shares, years, skip_guardrail=skip_guard)
            print(json.dumps(result))

        # ── per-agent shims (server.ts calls these individually) ──────────
        elif mode == "research":
            from backend.financial_agents import research_agent
            purchase_date = sys.argv[3] if len(sys.argv) > 3 else ""
            sell_date     = sys.argv[4] if len(sys.argv) > 4 else ""
            shares_res    = float(sys.argv[5]) if len(sys.argv) > 5 else 0.0
            print(research_agent(sys.argv[2], purchase_date=purchase_date, sell_date=sell_date, skip_guardrail=skip_guard, shares=shares_res))

        elif mode == "tax":
            from backend.financial_agents import tax_agent
            shares_tax = float(sys.argv[5]) if len(sys.argv) > 5 else 0.0
            print(tax_agent(sys.argv[2], sys.argv[3], sys.argv[4], skip_guardrail=skip_guard, shares=shares_tax))

        elif mode == "dividend":
            from backend.financial_agents import dividend_agent
            from backend.data_fetcher import fetch_price_on_date, calculate_pnl
            div_shares    = float(sys.argv[3])
            div_years     = int(sys.argv[4])
            purchase_date = sys.argv[5] if len(sys.argv) > 5 else ""
            sell_date     = sys.argv[6] if len(sys.argv) > 6 else ""
            buy_price  = fetch_price_on_date(sys.argv[2], purchase_date) if purchase_date else None
            sell_price = fetch_price_on_date(sys.argv[2], sell_date)     if sell_date     else None
            pnl = calculate_pnl(buy_price, sell_price, None, div_shares, purchase_date, sell_date)
            print(json.dumps(dividend_agent(sys.argv[2], div_shares, div_years, skip_guardrail=skip_guard, pnl_summary=pnl)))

        elif mode == "sentiment":
            from backend.financial_agents import social_sentiment_agent
            print(social_sentiment_agent(sys.argv[2], skip_guardrail=skip_guard))

        elif mode == "guardrail":
            from backend.financial_agents import security_guardrail
            print("SAFE" if security_guardrail(sys.argv[2]) else "BLOCKED")

        elif mode == "summary":
            from backend.financial_agents import executive_summary_agent
            ticker  = sys.argv[2]
            payload = json.loads(sys.argv[3])
            print(executive_summary_agent(
                ticker,
                research_output=payload.get("research_output"),
                tax_output=payload.get("tax_output"),
                sentiment_output=payload.get("sentiment_output"),
                dividend_output=payload.get("dividend_output"),
                pnl_summary=payload.get("pnl_summary"),
            ))

        else:
            print(f"Unknown mode: {mode}", file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        print(f"Critical Error: {e}", file=sys.stderr)
        sys.exit(1)
