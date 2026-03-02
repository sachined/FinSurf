"""
Unit tests for backend/telemetry.py.

Covers:
  - TokenUsage dataclass (fields, properties, cost calculation, to_dict)
  - Session accumulator (record_usage, get_session_usages, clear_session_usages)
  - summarize_usages (per-agent breakdown, totals, calls list)
  - TelemetryDB (schema creation, write_run, query_by_agent, query_total_cost,
                  disabled mode)

No real API calls are made. The TelemetryDB tests use an in-memory SQLite database.
"""

import os
import tempfile
import time
import unittest

# Force telemetry disabled so the singleton in the module doesn't touch disk
os.environ.setdefault("TELEMETRY_DISABLED", "true")

from backend.telemetry import (
    TokenUsage,
    TelemetryDB,
    clear_session_usages,
    get_session_usages,
    record_usage,
    summarize_usages,
    _COST_PER_1M,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _usage(agent="research", provider="gemini", model="gemini-flash-latest",
           inp=300, out=700, latency=250.0) -> TokenUsage:
    return TokenUsage(
        provider=provider,
        agent=agent,
        model=model,
        input_tokens=inp,
        output_tokens=out,
        latency_ms=latency,
    )


# ---------------------------------------------------------------------------
# TokenUsage tests
# ---------------------------------------------------------------------------

class TestTokenUsage(unittest.TestCase):

    def test_total_tokens(self):
        u = _usage(inp=300, out=700)
        self.assertEqual(u.total_tokens, 1000)

    def test_total_tokens_zeros(self):
        u = _usage(inp=0, out=0)
        self.assertEqual(u.total_tokens, 0)

    def test_estimated_cost_known_model(self):
        # gemini-flash-latest: input $0.075/1M, output $0.30/1M
        u = _usage(model="gemini-flash-latest", inp=1_000_000, out=1_000_000)
        expected = (1_000_000 * 0.075 + 1_000_000 * 0.30) / 1_000_000
        self.assertAlmostEqual(u.estimated_cost_usd(), expected, places=7)

    def test_estimated_cost_unknown_model(self):
        u = _usage(model="some-unknown-model", inp=500, out=500)
        self.assertEqual(u.estimated_cost_usd(), 0.0)

    def test_estimated_cost_perplexity(self):
        # sonar: $1.0/1M input, $1.0/1M output
        u = _usage(provider="perplexity", model="sonar", inp=500, out=500)
        expected = (500 * 1.0 + 500 * 1.0) / 1_000_000
        self.assertAlmostEqual(u.estimated_cost_usd(), expected, places=9)

    def test_estimated_cost_anthropic(self):
        # claude-3-haiku: $0.25/1M input, $1.25/1M output
        u = _usage(provider="anthropic", model="claude-3-haiku-20240307", inp=100, out=200)
        expected = (100 * 0.25 + 200 * 1.25) / 1_000_000
        self.assertAlmostEqual(u.estimated_cost_usd(), expected, places=9)

    def test_to_dict_keys(self):
        u = _usage()
        d = u.to_dict()
        for key in ("provider", "agent", "model", "input_tokens", "output_tokens",
                    "total_tokens", "latency_ms", "estimated_cost_usd"):
            self.assertIn(key, d)

    def test_to_dict_values(self):
        u = _usage(provider="openai", agent="tax", model="gpt-4o-mini",
                   inp=100, out=200, latency=300.0)
        d = u.to_dict()
        self.assertEqual(d["provider"], "openai")
        self.assertEqual(d["agent"], "tax")
        self.assertEqual(d["model"], "gpt-4o-mini")
        self.assertEqual(d["input_tokens"], 100)
        self.assertEqual(d["output_tokens"], 200)
        self.assertEqual(d["total_tokens"], 300)
        self.assertAlmostEqual(d["latency_ms"], 300.0, places=1)

    def test_timestamp_auto_populated(self):
        before = time.time()
        u = _usage()
        after = time.time()
        self.assertGreaterEqual(u.timestamp, before)
        self.assertLessEqual(u.timestamp, after)

    def test_cost_table_coverage(self):
        # All models in the cost table should produce non-zero cost for non-zero tokens
        for model in _COST_PER_1M:
            u = TokenUsage(provider="test", agent="test", model=model,
                           input_tokens=1000, output_tokens=1000)
            self.assertGreater(u.estimated_cost_usd(), 0.0, msg=f"model={model}")


# ---------------------------------------------------------------------------
# Session accumulator tests
# ---------------------------------------------------------------------------

class TestSessionAccumulator(unittest.TestCase):

    def setUp(self):
        clear_session_usages()

    def tearDown(self):
        clear_session_usages()

    def test_empty_on_clear(self):
        record_usage(_usage())
        clear_session_usages()
        self.assertEqual(get_session_usages(), [])

    def test_record_single(self):
        u = _usage()
        record_usage(u)
        usages = get_session_usages()
        self.assertEqual(len(usages), 1)
        self.assertIs(usages[0], u)

    def test_record_multiple(self):
        u1 = _usage(agent="research")
        u2 = _usage(agent="tax")
        u3 = _usage(agent="sentiment")
        for u in (u1, u2, u3):
            record_usage(u)
        usages = get_session_usages()
        self.assertEqual(len(usages), 3)
        self.assertEqual([u.agent for u in usages], ["research", "tax", "sentiment"])

    def test_get_returns_snapshot(self):
        # get_session_usages() returns a copy; mutating it does not affect the accumulator
        record_usage(_usage())
        snapshot = get_session_usages()
        snapshot.clear()
        self.assertEqual(len(get_session_usages()), 1)

    def test_clear_removes_all(self):
        for _ in range(5):
            record_usage(_usage())
        self.assertEqual(len(get_session_usages()), 5)
        clear_session_usages()
        self.assertEqual(len(get_session_usages()), 0)


# ---------------------------------------------------------------------------
# summarize_usages tests
# ---------------------------------------------------------------------------

class TestSummarizeUsages(unittest.TestCase):

    def test_empty_list(self):
        s = summarize_usages([])
        self.assertEqual(s["total_input_tokens"], 0)
        self.assertEqual(s["total_output_tokens"], 0)
        self.assertEqual(s["total_tokens"], 0)
        self.assertEqual(s["total_cost_usd"], 0.0)
        self.assertEqual(s["by_agent"], {})
        self.assertEqual(s["calls"], [])

    def test_single_usage(self):
        u = _usage(agent="research", inp=300, out=700)
        s = summarize_usages([u])
        self.assertEqual(s["total_input_tokens"], 300)
        self.assertEqual(s["total_output_tokens"], 700)
        self.assertEqual(s["total_tokens"], 1000)
        self.assertIn("research", s["by_agent"])
        self.assertEqual(s["by_agent"]["research"]["calls"], 1)
        self.assertEqual(len(s["calls"]), 1)

    def test_multiple_agents(self):
        usages = [
            _usage(agent="research", inp=300, out=800),
            _usage(agent="tax", inp=280, out=1100),
            _usage(agent="sentiment", inp=390, out=1200),
        ]
        s = summarize_usages(usages)
        self.assertEqual(s["total_input_tokens"], 970)
        self.assertEqual(s["total_output_tokens"], 3100)
        self.assertEqual(s["total_tokens"], 4070)
        self.assertEqual(len(s["by_agent"]), 3)
        self.assertEqual(len(s["calls"]), 3)

    def test_same_agent_multiple_calls(self):
        # Fallback scenario: research calls perplexity then gemini
        usages = [
            _usage(agent="research", provider="perplexity", model="sonar", inp=300, out=700),
            _usage(agent="research", provider="gemini", model="gemini-flash-latest", inp=300, out=700),
        ]
        s = summarize_usages(usages)
        self.assertEqual(s["by_agent"]["research"]["calls"], 2)
        self.assertEqual(s["by_agent"]["research"]["input_tokens"], 600)
        self.assertEqual(s["by_agent"]["research"]["output_tokens"], 1400)

    def test_total_cost_sums_correctly(self):
        u1 = _usage(model="gemini-flash-latest", inp=1_000_000, out=0)
        u2 = _usage(model="gemini-flash-latest", inp=0, out=1_000_000)
        s = summarize_usages([u1, u2])
        # 1M input @ 0.075 + 1M output @ 0.30 = 0.375
        self.assertAlmostEqual(s["total_cost_usd"], 0.375, places=4)

    def test_calls_list_length(self):
        usages = [_usage() for _ in range(5)]
        s = summarize_usages(usages)
        self.assertEqual(len(s["calls"]), 5)

    def test_by_agent_cost_rounded(self):
        u = _usage(model="gemini-flash-latest", inp=100, out=200)
        s = summarize_usages([u])
        cost = s["by_agent"]["research"]["cost_usd"]
        # Should be a small float, not NaN
        self.assertIsInstance(cost, float)
        self.assertGreater(cost, 0.0)


# ---------------------------------------------------------------------------
# TelemetryDB tests
# ---------------------------------------------------------------------------

class TestTelemetryDB(unittest.TestCase):

    def setUp(self):
        # Use a real temp file so all sqlite3.connect() calls share the same data
        self._tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self._tmp.close()
        self._db_path = self._tmp.name

    def tearDown(self):
        # Windows holds a lock on the file until the process releases it;
        # suppress the error — the OS temp dir is cleaned up automatically.
        try:
            os.unlink(self._db_path)
        except OSError:
            pass

    def _make_db(self) -> TelemetryDB:
        """Create a temp-file-backed TelemetryDB for isolation."""
        db = TelemetryDB.__new__(TelemetryDB)
        db.disabled = False
        db.db_path = self._db_path
        db._init_schema()
        return db

    def test_schema_created(self):
        db = self._make_db()
        # Should not raise
        result = db.query_by_agent()
        self.assertIsInstance(result, list)

    def test_write_run_single_usage(self):
        db = self._make_db()
        u = _usage(agent="research", inp=300, out=700)
        db.write_run("run-001", "AAPL", [u])
        rows = db.query_by_agent()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["agent"], "research")
        self.assertEqual(rows[0]["calls"], 1)

    def test_write_run_multiple_agents(self):
        db = self._make_db()
        usages = [
            _usage(agent="research"),
            _usage(agent="tax", provider="gemini", model="gemini-flash-latest"),
            _usage(agent="sentiment", provider="perplexity", model="sonar"),
        ]
        db.write_run("run-002", "TSLA", usages)
        rows = db.query_by_agent()
        agents = {r["agent"] for r in rows}
        self.assertEqual(agents, {"research", "tax", "sentiment"})

    def test_write_run_empty_usages_no_error(self):
        db = self._make_db()
        db.write_run("run-003", "GOOGL", [])  # Should be a no-op, not raise

    def test_query_by_agent_averages(self):
        db = self._make_db()
        db.write_run("r1", "AAPL", [_usage(agent="tax", inp=200, out=400)])
        db.write_run("r2", "AAPL", [_usage(agent="tax", inp=400, out=800)])
        rows = db.query_by_agent()
        tax_row = next(r for r in rows if r["agent"] == "tax")
        self.assertAlmostEqual(tax_row["avg_input"], 300.0)
        self.assertAlmostEqual(tax_row["avg_output"], 600.0)
        self.assertEqual(tax_row["calls"], 2)

    def test_query_total_cost_window(self):
        db = self._make_db()
        u = _usage(model="gemini-flash-latest", inp=1_000_000, out=1_000_000)
        db.write_run("r1", "AAPL", [u])
        result = db.query_total_cost(since_hours=24)
        self.assertIn("total_tokens", result)
        self.assertIn("total_cost_usd", result)
        self.assertEqual(result["total_tokens"], 2_000_000)
        self.assertGreater(result["total_cost_usd"], 0)

    def test_disabled_mode_write_is_noop(self):
        db = TelemetryDB.__new__(TelemetryDB)
        db.disabled = True
        db.db_path = ":memory:"
        # write_run should silently return without touching any DB
        db.write_run("run-x", "AAPL", [_usage()])  # must not raise

    def test_disabled_mode_query_returns_empty(self):
        db = TelemetryDB.__new__(TelemetryDB)
        db.disabled = True
        db.db_path = ":memory:"
        self.assertEqual(db.query_by_agent(), [])
        self.assertEqual(db.query_total_cost(), {})

    def test_multiple_runs_accumulate(self):
        db = self._make_db()
        db.write_run("r1", "AAPL", [_usage(agent="research")])
        db.write_run("r2", "TSLA", [_usage(agent="research")])
        db.write_run("r3", "MSFT", [_usage(agent="research")])
        rows = db.query_by_agent()
        research = next(r for r in rows if r["agent"] == "research")
        self.assertEqual(research["calls"], 3)


if __name__ == "__main__":
    unittest.main()
