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

        else:
            print(f"Unknown mode: {mode}", file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        print(f"Critical Error: {e}", file=sys.stderr)
        sys.exit(1)
