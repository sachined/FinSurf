"""
FinSurf Telemetry — token usage tracking and SQLite persistence.

No third-party dependencies; uses only Python stdlib (dataclasses, sqlite3, time, uuid).

Usage pattern:
  1. Each llm_providers call invokes record_usage() with a TokenUsage object.
  2. run_graph() in graph.py calls clear_session_usages() before each run,
     then get_session_usages() after invoke to collect the full picture.
  3. summarize_usages() produces a per-agent + total breakdown.
  4. TelemetryDB.write_run() persists every call to finsurf_telemetry.db.
"""

import os
import sqlite3
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# Provider cost table (per 1 M tokens, USD — update as pricing changes)
# ---------------------------------------------------------------------------
_COST_PER_1M: Dict[str, Dict[str, float]] = {
    "gemini-flash-latest":       {"input": 0.075, "output": 0.30},
    "gpt-4o-mini":               {"input": 0.15,  "output": 0.60},
    "claude-3-haiku-20240307":   {"input": 0.25,  "output": 1.25},
    "sonar":                     {"input": 1.0,   "output": 1.0},
}


# ---------------------------------------------------------------------------
# TokenUsage dataclass
# ---------------------------------------------------------------------------

@dataclass
class TokenUsage:
    provider: str            # "gemini" | "openai" | "anthropic" | "perplexity"
    agent: str               # "research" | "tax" | "dividend" | "sentiment" | "guardrail"
    model: str               # exact model string used for the call
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: float = 0.0
    timestamp: float = field(default_factory=time.time)

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens

    def estimated_cost_usd(self) -> float:
        """Approximate cost based on public provider pricing."""
        rates = _COST_PER_1M.get(self.model, {"input": 0.0, "output": 0.0})
        return (
            self.input_tokens  * rates["input"] +
            self.output_tokens * rates["output"]
        ) / 1_000_000

    def to_dict(self) -> Dict[str, Any]:
        return {
            "provider": self.provider,
            "agent": self.agent,
            "model": self.model,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "total_tokens": self.total_tokens,
            "latency_ms": round(self.latency_ms, 1),
            "estimated_cost_usd": round(self.estimated_cost_usd(), 7),
        }


# ---------------------------------------------------------------------------
# Module-level session accumulator
# One Python child process is spawned per graph run, so a module-level list
# is a safe, zero-overhead accumulator with no locking needed.
# ---------------------------------------------------------------------------

_session_usages: List[TokenUsage] = []


def record_usage(usage: TokenUsage) -> None:
    """Append a TokenUsage record to the current session's accumulator."""
    _session_usages.append(usage)


def get_session_usages() -> List[TokenUsage]:
    """Return a snapshot of all usage recorded this session."""
    return list(_session_usages)


def clear_session_usages() -> None:
    """Reset the accumulator (called at the start of each graph run)."""
    _session_usages.clear()


# ---------------------------------------------------------------------------
# Aggregation helper
# ---------------------------------------------------------------------------

def summarize_usages(usages: List[TokenUsage]) -> Dict[str, Any]:
    """
    Produce a structured summary of token consumption.

    Returns:
        {
          "total_input_tokens": int,
          "total_output_tokens": int,
          "total_tokens": int,
          "total_cost_usd": float,
          "by_agent": {
            "<agent>": {
              "input_tokens": int, "output_tokens": int,
              "cost_usd": float, "calls": int
            }, ...
          },
          "calls": [ {per-call detail}, ... ]
        }
    """
    total_input  = sum(u.input_tokens  for u in usages)
    total_output = sum(u.output_tokens for u in usages)
    total_cost   = sum(u.estimated_cost_usd() for u in usages)

    by_agent: Dict[str, Any] = {}
    for u in usages:
        entry = by_agent.setdefault(u.agent, {
            "input_tokens": 0, "output_tokens": 0,
            "cost_usd": 0.0, "calls": 0,
        })
        entry["input_tokens"]  += u.input_tokens
        entry["output_tokens"] += u.output_tokens
        entry["cost_usd"]       = round(entry["cost_usd"] + u.estimated_cost_usd(), 7)
        entry["calls"]         += 1

    return {
        "total_input_tokens":  total_input,
        "total_output_tokens": total_output,
        "total_tokens":        total_input + total_output,
        "total_cost_usd":      round(total_cost, 7),
        "by_agent":            by_agent,
        "calls":               [u.to_dict() for u in usages],
    }


# ---------------------------------------------------------------------------
# SQLite persistence
# ---------------------------------------------------------------------------

class TelemetryDB:
    """
    Lightweight SQLite-backed telemetry store.

    Default path: finsurf_telemetry.db in the project root.
    Override via TELEMETRY_DB env var.
    Disable persistence entirely via TELEMETRY_DISABLED=true.
    """

    def __init__(self, db_path: Optional[str] = None):
        self.disabled = os.environ.get("TELEMETRY_DISABLED", "false").lower() == "true"
        if self.disabled:
            self.db_path = ":memory:"
            return
        self.db_path = db_path or os.environ.get("TELEMETRY_DB", "finsurf_telemetry.db")
        self._init_schema()

    def _init_schema(self) -> None:
        with sqlite3.connect(self.db_path) as con:
            # WAL mode allows concurrent readers while a writer is active,
            # which prevents "database is locked" errors under concurrent load.
            con.execute("PRAGMA journal_mode=WAL")
            con.execute("""
                CREATE TABLE IF NOT EXISTS token_events (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id     TEXT    NOT NULL,
                    ticker     TEXT    NOT NULL,
                    agent      TEXT    NOT NULL,
                    provider   TEXT    NOT NULL,
                    model      TEXT    NOT NULL,
                    input_tok  INTEGER DEFAULT 0,
                    output_tok INTEGER DEFAULT 0,
                    latency_ms REAL    DEFAULT 0,
                    cost_usd   REAL    DEFAULT 0,
                    ts         REAL    NOT NULL
                )
            """)
            con.commit()

    def write_run(self, run_id: str, ticker: str, usages: List[TokenUsage]) -> None:
        """Persist all TokenUsage records for a single graph run."""
        if self.disabled or not usages:
            return
        rows = [
            (
                run_id, ticker, u.agent, u.provider, u.model,
                u.input_tokens, u.output_tokens,
                round(u.latency_ms, 1),
                round(u.estimated_cost_usd(), 7),
                u.timestamp,
            )
            for u in usages
        ]
        with sqlite3.connect(self.db_path) as con:
            con.executemany(
                """INSERT INTO token_events
                   (run_id, ticker, agent, provider, model,
                    input_tok, output_tok, latency_ms, cost_usd, ts)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                rows,
            )
            con.commit()

    def query_by_agent(self) -> List[Dict[str, Any]]:
        """Return average cost and token counts grouped by agent (for self-improvement analysis)."""
        if self.disabled:
            return []
        with sqlite3.connect(self.db_path) as con:
            con.row_factory = sqlite3.Row
            rows = con.execute("""
                SELECT agent,
                       COUNT(*)           AS calls,
                       AVG(input_tok)     AS avg_input,
                       AVG(output_tok)    AS avg_output,
                       SUM(cost_usd)      AS total_cost,
                       AVG(latency_ms)    AS avg_latency_ms
                FROM token_events
                GROUP BY agent
                ORDER BY total_cost DESC
            """).fetchall()
        return [dict(r) for r in rows]

    def query_total_cost(self, since_hours: float = 24.0) -> Dict[str, Any]:
        """Return total tokens and cost for the last N hours."""
        if self.disabled:
            return {}
        cutoff = time.time() - since_hours * 3600
        with sqlite3.connect(self.db_path) as con:
            row = con.execute("""
                SELECT SUM(input_tok + output_tok) AS total_tokens,
                       SUM(cost_usd)               AS total_cost
                FROM token_events WHERE ts >= ?
            """, (cutoff,)).fetchone()
        return {
            "window_hours": since_hours,
            "total_tokens": row[0] or 0,
            "total_cost_usd": round(row[1] or 0.0, 6),
        }


# Singleton DB instance — imported by graph.py
telemetry_db = TelemetryDB()
