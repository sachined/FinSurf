"""
FinSurf CLI dispatcher — powered by LangGraph.

Usage:
  python agents.py <mode> <args...>

Modes (legacy interface kept intact for server.ts compatibility):
  research  <ticker>
  tax       <ticker> <purchase_date> <sell_date>
  dividend  <ticker> <shares> <years>
  sentiment <ticker>
  guardrail <ticker>
  graph     <ticker> <purchase_date> <sell_date> <shares> <years>
"""

import sys
import json
import os
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
            print(research_agent(sys.argv[2], skip_guardrail=skip_guard))

        elif mode == "tax":
            from backend.financial_agents import tax_agent
            print(tax_agent(sys.argv[2], sys.argv[3], sys.argv[4], skip_guardrail=skip_guard))

        elif mode == "dividend":
            from backend.financial_agents import dividend_agent
            print(json.dumps(dividend_agent(sys.argv[2], float(sys.argv[3]), int(sys.argv[4]), skip_guardrail=skip_guard)))

        elif mode == "sentiment":
            from backend.financial_agents import social_sentiment_agent
            print(social_sentiment_agent(sys.argv[2], skip_guardrail=skip_guard))

        elif mode == "guardrail":
            from backend.financial_agents import security_guardrail
            print("SAFE" if security_guardrail(sys.argv[2]) else "BLOCKED")

        else:
            print(f"Unknown mode: {mode}", file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        print(f"Critical Error: {e}", file=sys.stderr)
        sys.exit(1)
