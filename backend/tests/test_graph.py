"""
Tests for backend/graph.py — graph routing logic with mocked agent functions.
No real API calls are made; all agent functions are patched.
"""
import json
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Patch at the location where graph.py imports these names — not at their
# definition site. This ensures mocks intercept calls made inside graph nodes.
GRAPH_MODULE = "backend.graph"
AGENTS_MODULE = "backend.financial_agents"
GRAPH_AGENTS = "backend.graph"  # graph.py imports agents from .financial_agents

# ---------------------------------------------------------------------------
# Shared mock responses
# ---------------------------------------------------------------------------

_RESEARCH_DIVIDEND = json.dumps({
    "content": "AAPL pays a dividend yield of 2.5%. Annual dividend per share is growing.",
    "citations": []
})
_RESEARCH_NO_DIVIDEND = json.dumps({
    "content": "GOOGL does not pay dividends. No dividend yield is offered.",
    "citations": []
})
_TAX_RESPONSE = json.dumps({"content": "Long-term capital gains apply.", "citations": []})
_SENTIMENT_RESPONSE = json.dumps({"content": "Bullish overall.", "citations": []})
_DIVIDEND_RESPONSE = {
    "isDividendStock": True,
    "hasDividendHistory": True,
    "analysis": "Solid payer."
}


class TestGuardrailNode(unittest.TestCase):
    def test_safe_ticker_sets_is_safe_true(self):
        from backend.graph import guardrail_node, FinSurfState
        state: FinSurfState = _make_state("AAPL")
        # Patch in the graph module namespace (where guardrail_node calls security_guardrail)
        with patch(f"{GRAPH_MODULE}.security_guardrail", return_value=True):
            result = guardrail_node(state)
        self.assertTrue(result["is_safe"])

    def test_blocked_ticker_sets_is_safe_false(self):
        from backend.graph import guardrail_node, FinSurfState
        # Use a long ticker to avoid short-circuit; patch in both namespaces
        state: FinSurfState = _make_state("Apple Computer Company")
        with patch(f"{GRAPH_MODULE}.security_guardrail", return_value=False):
            result = guardrail_node(state)
        self.assertFalse(result["is_safe"])

    def test_guardrail_exception_sets_is_safe_false_and_records_error(self):
        from backend.graph import guardrail_node, FinSurfState
        # Use a long ticker so short-circuit doesn't bypass security_guardrail
        state: FinSurfState = _make_state("Apple Computer Company")
        with patch(f"{GRAPH_MODULE}.security_guardrail", side_effect=Exception("API down")):
            result = guardrail_node(state)
        self.assertFalse(result["is_safe"])
        self.assertTrue(len(result.get("errors", [])) > 0)


class TestResearchNode(unittest.TestCase):
    def test_dividend_stock_detected(self):
        from backend.graph import research_node, FinSurfState
        state: FinSurfState = _make_state("AAPL", is_safe=True)
        with patch(f"{GRAPH_MODULE}.research_agent", return_value=_RESEARCH_DIVIDEND):
            result = research_node(state)
        self.assertTrue(result["is_dividend_stock"])
        self.assertEqual(result["research_output"], _RESEARCH_DIVIDEND)

    def test_non_dividend_stock_detected(self):
        from backend.graph import research_node, FinSurfState
        state: FinSurfState = _make_state("GOOGL", is_safe=True)
        with patch(f"{GRAPH_MODULE}.research_agent", return_value=_RESEARCH_NO_DIVIDEND):
            result = research_node(state)
        self.assertFalse(result["is_dividend_stock"])

    def test_research_exception_records_error(self):
        from backend.graph import research_node, FinSurfState
        state: FinSurfState = _make_state("AAPL", is_safe=True)
        with patch(f"{GRAPH_MODULE}.research_agent", side_effect=Exception("LLM failed")):
            result = research_node(state)
        self.assertFalse(result["is_dividend_stock"])
        self.assertTrue(len(result.get("errors", [])) > 0)


class TestTaxDividendNode(unittest.TestCase):
    def test_returns_tax_and_dividend_output(self):
        from backend.graph import tax_dividend_node, FinSurfState
        state: FinSurfState = _make_state("AAPL", purchase_date="2022-01-01", sell_date="2023-06-01")
        with patch(f"{GRAPH_MODULE}.tax_dividend_agent", return_value=(_TAX_RESPONSE, _DIVIDEND_RESPONSE)):
            result = tax_dividend_node(state)
        self.assertEqual(result["tax_output"], _TAX_RESPONSE)
        self.assertEqual(result["dividend_output"], _DIVIDEND_RESPONSE)

    def test_exception_records_error_and_fallback(self):
        from backend.graph import tax_dividend_node, FinSurfState
        state: FinSurfState = _make_state("AAPL")
        with patch(f"{GRAPH_MODULE}.tax_dividend_agent", side_effect=Exception("LLM error")):
            result = tax_dividend_node(state)
        self.assertIn("Unavailable", result["tax_output"])
        self.assertTrue(len(result.get("errors", [])) > 0)


class TestSentimentNode(unittest.TestCase):
    def test_returns_sentiment_output(self):
        from backend.graph import sentiment_node, FinSurfState
        state: FinSurfState = _make_state("TSLA")
        with patch(f"{GRAPH_MODULE}.social_sentiment_agent", return_value=_SENTIMENT_RESPONSE):
            result = sentiment_node(state)
        self.assertEqual(result["sentiment_output"], _SENTIMENT_RESPONSE)



# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _make_state(ticker: str, **kwargs) -> dict:
    """Build a minimal FinSurfState-compatible dict for testing."""
    defaults = {
        "ticker": ticker,
        "purchase_date": "2023-01-01",
        "sell_date": "2024-01-01",
        "shares": 10.0,
        "years": 3,
        "skip_guardrail": False,
        "is_safe": True,
        "is_dividend_stock": False,
        "research_output": None,
        "tax_output": None,
        "sentiment_output": None,
        "dividend_output": None,
        "errors": [],
    }
    defaults.update(kwargs)
    return defaults


if __name__ == "__main__":
    unittest.main()
