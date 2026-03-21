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

    def test_estimated_cost_known_model(self):
        # gemini-flash-latest: input $0.075/1M, output $0.30/1M
        u = _usage(model="gemini-flash-latest", inp=1_000_000, out=1_000_000)
        expected = (1_000_000 * 0.075 + 1_000_000 * 0.30) / 1_000_000
        self.assertAlmostEqual(u.estimated_cost_usd(), expected, places=7)

    def test_estimated_cost_perplexity(self):
        # sonar: $1.0/1M input, $1.0/1M output
        u = _usage(provider="perplexity", model="sonar", inp=500, out=500)
        expected = (500 * 1.0 + 500 * 1.0) / 1_000_000
        self.assertAlmostEqual(u.estimated_cost_usd(), expected, places=9)

    def test_to_dict_keys(self):
        u = _usage()
        d = u.to_dict()
        for key in ("provider", "agent", "model", "input_tokens", "output_tokens",
                    "total_tokens", "latency_ms", "estimated_cost_usd"):
            self.assertIn(key, d)



# ---------------------------------------------------------------------------
# Session accumulator tests
# ---------------------------------------------------------------------------

class TestSessionAccumulator(unittest.TestCase):

    def setUp(self):
        clear_session_usages()

    def tearDown(self):
        clear_session_usages()

    def test_record_single(self):
        u = _usage()
        record_usage(u)
        usages = get_session_usages()
        self.assertEqual(len(usages), 1)
        self.assertIs(usages[0], u)

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

    def test_total_cost_sums_correctly(self):
        u1 = _usage(model="gemini-flash-latest", inp=1_000_000, out=0)
        u2 = _usage(model="gemini-flash-latest", inp=0, out=1_000_000)
        s = summarize_usages([u1, u2])
        # 1M input @ 0.075 + 1M output @ 0.30 = 0.375
        self.assertAlmostEqual(s["total_cost_usd"], 0.375, places=4)

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

    def test_multiple_runs_accumulate(self):
        db = self._make_db()
        db.write_run("r1", "AAPL", [_usage(agent="research")])
        db.write_run("r2", "TSLA", [_usage(agent="research")])
        db.write_run("r3", "MSFT", [_usage(agent="research")])
        rows = db.query_by_agent()
        research = next(r for r in rows if r["agent"] == "research")
        self.assertEqual(research["calls"], 3)


# ---------------------------------------------------------------------------
# write_request / query_recent_requests / query_vip_stats
# ---------------------------------------------------------------------------

class TestWriteRequest(unittest.TestCase):

    def setUp(self):
        import tempfile
        self._tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self._tmp.close()
        self._db_path = self._tmp.name

    def tearDown(self):
        try:
            os.unlink(self._db_path)
        except OSError:
            pass

    def _make_db(self) -> TelemetryDB:
        db = TelemetryDB.__new__(TelemetryDB)
        db.disabled = False
        db.db_path = self._db_path
        db._init_schema()
        return db

    def test_write_request_stores_pass_type_and_country(self):
        db = self._make_db()
        db.write_request("run-w1", "AAPL", pass_type="vip", country="US")
        stats = db.query_vip_stats()
        self.assertEqual(stats.get("vip"), 1)

    def test_write_request_defaults_are_nullable(self):
        db = self._make_db()
        db.write_request("run-w2", "TSLA")  # no pass_type or country
        # Should not raise; query returns "unknown" for NULL pass_type
        stats = db.query_vip_stats()
        self.assertIsInstance(stats, dict)

    def test_disabled_write_request_is_noop(self):
        db = TelemetryDB.__new__(TelemetryDB)
        db.disabled = True
        db.db_path = ":memory:"
        db.write_request("run-x", "AAPL", pass_type="vip")  # must not raise


class TestQueryRecentRequests(unittest.TestCase):

    def setUp(self):
        import tempfile
        self._tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self._tmp.close()
        self._db_path = self._tmp.name

    def tearDown(self):
        try:
            os.unlink(self._db_path)
        except OSError:
            pass

    def _make_db(self) -> TelemetryDB:
        db = TelemetryDB.__new__(TelemetryDB)
        db.disabled = False
        db.db_path = self._db_path
        db._init_schema()
        return db

    def test_returns_list_with_expected_fields(self):
        db = self._make_db()
        db.write_request("run-q1", "AAPL", pass_type="free", country="GB")
        db.write_run("run-q1", "AAPL", [_usage(agent="research")])
        rows = db.query_recent_requests(limit=10)
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row["ticker"], "AAPL")
        self.assertEqual(row["pass_type"], "free")
        self.assertEqual(row["country"], "GB")
        self.assertIn("agents", row)
        self.assertIn("total_cost", row)

    def test_respects_limit(self):
        db = self._make_db()
        for i in range(5):
            db.write_request(f"run-lim{i}", "MSFT", pass_type="free", country="US")
        rows = db.query_recent_requests(limit=3)
        self.assertEqual(len(rows), 3)

    def test_disabled_returns_empty_list(self):
        db = TelemetryDB.__new__(TelemetryDB)
        db.disabled = True
        self.assertEqual(db.query_recent_requests(), [])


class TestQueryVipStats(unittest.TestCase):

    def setUp(self):
        import tempfile
        self._tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self._tmp.close()
        self._db_path = self._tmp.name

    def tearDown(self):
        try:
            os.unlink(self._db_path)
        except OSError:
            pass

    def _make_db(self) -> TelemetryDB:
        db = TelemetryDB.__new__(TelemetryDB)
        db.disabled = False
        db.db_path = self._db_path
        db._init_schema()
        return db

    def test_groups_by_pass_type(self):
        db = self._make_db()
        db.write_request("r1", "AAPL", pass_type="vip",  country="US")
        db.write_request("r2", "TSLA", pass_type="free", country="US")
        db.write_request("r3", "MSFT", pass_type="free", country="CA")
        stats = db.query_vip_stats()
        self.assertEqual(stats["vip"], 1)
        self.assertEqual(stats["free"], 2)

    def test_disabled_returns_empty_dict(self):
        db = TelemetryDB.__new__(TelemetryDB)
        db.disabled = True
        self.assertEqual(db.query_vip_stats(), {})


if __name__ == "__main__":
    unittest.main()
