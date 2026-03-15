"""
Tests for backend/financial_agents.py — agent logic with mocked LLM providers.
No real API calls are made; all provider functions are patched.
"""
import json
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Patch LLM providers at the module level before importing agents
PROVIDERS_MODULE = "backend.financial_agents"

# Reusable mock payloads for the yfinance data fetcher
MOCK_RESEARCH_DATA = {
    "pe_trailing": "28.50x",
    "pe_forward": "24.10x",
    "revenue_growth_yoy": "8.3%",
    "institutional_ownership": "62.1%",
    "current_price": "$182.50",
    "week_52_high": "$199.62",
    "week_52_low": "$143.90",
    "market_cap": "$2.81T",
    "beta": "1.24x",
    "analyst_target_mean": "$210.00",
    "analyst_target_high": "$240.00",
    "analyst_target_low": "$180.00",
    "analyst_count": "38",
    "recommendation": "Buy",
    "earnings_growth": "11.2%",
    "price_history": [
        {"date": "2024-03-01", "close": 170.12},
        {"date": "2024-06-01", "close": 180.45},
        {"date": "2024-09-01", "close": 175.30},
        {"date": "2025-03-01", "close": 182.50},
    ],
    "dividend_data": {
        "is_dividend_stock": True,
        "has_history": True,
        "annual_dividend_per_share": "$0.96",
        "current_yield": "0.52%",
        "payout_ratio": "15.10%",
        "five_year_avg_yield": "0.60%",
        "ex_dividend_date": "2024-02-09",
        "payment_frequency": "Quarterly",
        "consecutive_years": "12",
    },
}

MOCK_SENTIMENT_DATA = {
    "news": [
        {"title": "AAPL hits record high", "publisher": "Reuters", "link": "https://reuters.com/1"},
        {"title": "Apple Vision Pro sales disappoint", "publisher": "Bloomberg", "link": "https://bloomberg.com/1"},
        {"title": "Warren Buffett trims Apple stake", "publisher": "CNBC", "link": "https://cnbc.com/1"},
    ],
    "recommendations": {"strongBuy": 12, "buy": 18, "hold": 8, "sell": 2, "strongSell": 0},
}

MOCK_DIVIDEND_DATA = {
    "is_dividend_stock": True,
    "has_history": True,
    "annual_dividend_per_share": "$3.08",
    "current_yield": "0.87%",
    "payout_ratio": "14.60%",
    "five_year_avg_yield": "0.70%",
    "ex_dividend_date": "2024-02-09",
    "payment_frequency": "Quarterly",
    "consecutive_years": "12",
}


class TestValidateTicker(unittest.TestCase):
    def setUp(self):
        from backend.financial_agents import validate_ticker
        self.validate_ticker = validate_ticker

    def test_valid_uppercase_ticker(self):
        self.assertTrue(self.validate_ticker("AAPL"))

    def test_valid_with_dot(self):
        self.assertTrue(self.validate_ticker("BRK.B"))

    def test_valid_with_hyphen(self):
        self.assertTrue(self.validate_ticker("BF-B"))

    def test_empty_string_invalid(self):
        self.assertFalse(self.validate_ticker(""))

    def test_too_long_invalid(self):
        # Max length is 10 chars (tightened from 50 during security hardening).
        self.assertFalse(self.validate_ticker("A" * 11))

    def test_special_chars_invalid(self):
        self.assertFalse(self.validate_ticker("AAPL; DROP TABLE"))


class TestSecurityGuardrail(unittest.TestCase):
    def setUp(self):
        from backend.financial_agents import security_guardrail
        self.guardrail = security_guardrail

    def test_short_clean_ticker_bypasses_llm(self):
        # Pure ticker-like input (A–Z/0–9/.- up to 10 chars) should short-circuit
        # without calling Gemini at all
        with patch(f"{PROVIDERS_MODULE}.call_gemini") as mock_gemini:
            result = self.guardrail("AAPL")
            mock_gemini.assert_not_called()
            self.assertTrue(result)

    def test_empty_string_blocked_without_llm(self):
        with patch(f"{PROVIDERS_MODULE}.call_gemini") as mock_gemini:
            result = self.guardrail("")
            mock_gemini.assert_not_called()
            self.assertFalse(result)

    def test_too_long_input_blocked_without_llm(self):
        with patch(f"{PROVIDERS_MODULE}.call_gemini") as mock_gemini:
            result = self.guardrail("A" * 51)
            mock_gemini.assert_not_called()
            self.assertFalse(result)

    def test_gemini_failure_returns_false(self):
        with patch(f"{PROVIDERS_MODULE}.call_gemini", side_effect=Exception("API error")):
            result = self.guardrail("Some Company Name")
            self.assertFalse(result)


class TestBlockedResponseFormat(unittest.TestCase):
    """Verify all agents return consistent output when the guardrail blocks."""

    def test_research_agent_blocked_is_json(self):
        from backend.financial_agents import research_agent
        with patch(f"{PROVIDERS_MODULE}.security_guardrail", return_value=False):
            raw = research_agent("INJECTION", skip_guardrail=False)
            data = json.loads(raw)
            self.assertIn("content", data)
            self.assertIn("citations", data)
            self.assertIn("Blocked", data["content"])

    def test_dividend_agent_blocked_is_dict(self):
        from backend.financial_agents import dividend_agent
        with patch(f"{PROVIDERS_MODULE}.security_guardrail", return_value=False):
            result = dividend_agent("INJECTION", 10.0, 3, skip_guardrail=False)
            self.assertIsInstance(result, dict)
            self.assertFalse(result["isDividendStock"])
            self.assertIn("Blocked", result["analysis"])


class TestResearchAgent(unittest.TestCase):
    def test_returns_json_with_content_citations_and_price_history(self):
        """research_agent must return {content, citations, price_history, buy_price,
        sell_price, current_price} envelope with yfinance data forwarded."""
        from backend.financial_agents import research_agent
        with patch(f"{PROVIDERS_MODULE}.fetch_research_data", return_value=MOCK_RESEARCH_DATA):
            with patch(f"{PROVIDERS_MODULE}.call_gemini", return_value="Stock looks great."):
                result = research_agent("AAPL", skip_guardrail=True)
                data = json.loads(result)
                self.assertEqual(data["content"], "Stock looks great.")
                self.assertEqual(data["citations"], [])
                self.assertEqual(data["price_history"], MOCK_RESEARCH_DATA["price_history"])
                # No dates supplied — buy_price and sell_price must be None
                self.assertIsNone(data["buy_price"])
                self.assertIsNone(data["sell_price"])
                # current_price parsed from MOCK_RESEARCH_DATA["current_price"] = "$182.50"
                self.assertAlmostEqual(data["current_price"], 182.50, places=1)

    def test_price_history_empty_when_yfinance_unavailable(self):
        """When fetch_research_data returns None, price_history must be an
        empty list so the frontend chart renders nothing gracefully."""
        from backend.financial_agents import research_agent
        with patch(f"{PROVIDERS_MODULE}.fetch_research_data", return_value=None):
            with patch(f"{PROVIDERS_MODULE}.call_gemini", return_value="Fallback content."):
                result = research_agent("AAPL", skip_guardrail=True)
                data = json.loads(result)
                self.assertEqual(data["content"], "Fallback content.")
                self.assertEqual(data["price_history"], [])

    def test_buy_sell_prices_returned_when_dates_supplied(self):
        """When purchase_date and sell_date are provided, fetch_price_on_date is
        called for each and the results are included in the JSON envelope."""
        from backend.financial_agents import research_agent
        with patch(f"{PROVIDERS_MODULE}.fetch_research_data", return_value=MOCK_RESEARCH_DATA):
            with patch(f"{PROVIDERS_MODULE}.fetch_price_on_date", side_effect=[150.00, 182.50]) as mock_fpod:
                with patch(f"{PROVIDERS_MODULE}.call_gemini", return_value="Analysis."):
                    result = research_agent("AAPL", purchase_date="2023-01-15", sell_date="2025-01-15", skip_guardrail=True)
                    data = json.loads(result)
                    self.assertAlmostEqual(data["buy_price"], 150.00, places=2)
                    self.assertAlmostEqual(data["sell_price"], 182.50, places=2)
                    self.assertEqual(mock_fpod.call_count, 2)

    def test_uses_gemini_not_perplexity_for_research(self):
        """research_agent now uses Gemini directly — Perplexity must never be
        called for research regardless of yfinance availability."""
        from backend.financial_agents import research_agent
        with patch(f"{PROVIDERS_MODULE}.fetch_research_data", return_value=MOCK_RESEARCH_DATA):
            with patch(f"{PROVIDERS_MODULE}.call_gemini", return_value="Gemini content.") as mock_gemini:
                with patch(f"{PROVIDERS_MODULE}.call_perplexity") as mock_perplexity:
                    research_agent("AAPL", skip_guardrail=True)
                    mock_gemini.assert_called_once()
                    mock_perplexity.assert_not_called()


class TestTaxAgent(unittest.TestCase):
    def test_returns_json_envelope_on_success(self):
        from backend.financial_agents import tax_agent
        with patch(f"{PROVIDERS_MODULE}.call_groq", return_value="Tax explanation here."):
            result = tax_agent("AAPL", "2022-01-01", "2023-06-01", skip_guardrail=True)
            data = json.loads(result)
            self.assertIn("content", data)
            self.assertIn("citations", data)
            self.assertEqual(data["content"], "Tax explanation here.")
            self.assertEqual(data["citations"], [])

    def test_returns_graceful_error_when_all_providers_fail(self):
        from backend.financial_agents import tax_agent
        with patch(f"{PROVIDERS_MODULE}.call_groq", side_effect=Exception("Groq down")):
            with patch(f"{PROVIDERS_MODULE}.call_gemini", side_effect=Exception("Gemini down")):
                result = tax_agent("AAPL", "2022-01-01", "2023-06-01", skip_guardrail=True)
                data = json.loads(result)
                self.assertIn("content", data)
                self.assertIn("citations", data)
                self.assertIn("unavailable", data["content"].lower())

    def test_pnl_block_embedded_when_prices_provided(self):
        """When buy_price, sell_price, and shares are supplied, the prompt must
        include the Realised P&L block and fetch_price_on_date must not be called."""
        from backend.financial_agents import tax_agent
        captured_prompts: list = []
        def capture_groq(prompt, system, **kwargs):
            captured_prompts.append(prompt)
            return "Tax table."
        with patch(f"{PROVIDERS_MODULE}.call_groq", side_effect=capture_groq):
            with patch(f"{PROVIDERS_MODULE}.fetch_price_on_date") as mock_fpod:
                result = tax_agent(
                    "AAPL", "2022-01-01", "2023-06-01",
                    skip_guardrail=True,
                    buy_price=130.0, sell_price=180.0, shares=10.0,
                )
                mock_fpod.assert_not_called()
                self.assertIn("Realised P&L", captured_prompts[0])
                self.assertIn("$500.00", captured_prompts[0])  # (180-130)*10

    def test_fetches_prices_when_not_provided(self):
        """When buy_price/sell_price are omitted, fetch_price_on_date must be
        called for each date so the prompt still contains P&L data."""
        from backend.financial_agents import tax_agent
        with patch(f"{PROVIDERS_MODULE}.fetch_price_on_date", side_effect=[130.0, 180.0]) as mock_fpod:
            with patch(f"{PROVIDERS_MODULE}.call_groq", return_value="Tax table."):
                tax_agent("AAPL", "2022-01-01", "2023-06-01", skip_guardrail=True, shares=5.0)
                self.assertEqual(mock_fpod.call_count, 2)


class TestSentimentAgent(unittest.TestCase):
    def test_uses_gemini_directly_when_yfinance_data_is_sufficient(self):
        """When yfinance returns >=3 headlines AND analyst recs, the agent must
        use Gemini directly and skip the Perplexity call entirely."""
        from backend.financial_agents import social_sentiment_agent
        with patch(f"{PROVIDERS_MODULE}.fetch_sentiment_data", return_value=MOCK_SENTIMENT_DATA):
            with patch(f"{PROVIDERS_MODULE}.fetch_stocktwits_sentiment", return_value=None):
                with patch(f"{PROVIDERS_MODULE}.fetch_reddit_sentiment", return_value=None):
                    with patch(f"{PROVIDERS_MODULE}.fetch_twitter_sentiment", return_value=None):
                        with patch(f"{PROVIDERS_MODULE}.call_gemini", return_value="Bullish.") as mock_gemini:
                            with patch(f"{PROVIDERS_MODULE}.call_perplexity") as mock_perplexity:
                                result = social_sentiment_agent("AAPL", skip_guardrail=True)
                                data = json.loads(result)
                                self.assertEqual(data["content"], "Bullish.")
                                mock_gemini.assert_called_once()
                                mock_perplexity.assert_not_called()

    def test_calls_perplexity_when_news_is_thin(self):
        """When yfinance returns fewer than 3 headlines, Perplexity must be
        called to supplement with live web search data."""
        from backend.financial_agents import social_sentiment_agent
        thin_data = {"news": [{"title": "One headline", "publisher": "X", "link": ""}], "recommendations": {"buy": 5}}
        perplexity_response = json.dumps({"content": "Perplexity sentiment.", "citations": ["https://reddit.com"]})
        with patch(f"{PROVIDERS_MODULE}.fetch_sentiment_data", return_value=thin_data):
            with patch(f"{PROVIDERS_MODULE}.fetch_stocktwits_sentiment", return_value=None):
                with patch(f"{PROVIDERS_MODULE}.fetch_reddit_sentiment", return_value=None):
                    with patch(f"{PROVIDERS_MODULE}.fetch_twitter_sentiment", return_value=None):
                        with patch(f"{PROVIDERS_MODULE}.call_perplexity", return_value=perplexity_response) as mock_perplexity:
                            result = social_sentiment_agent("TSLA", skip_guardrail=True)
                            data = json.loads(result)
                            self.assertEqual(data["content"], "Perplexity sentiment.")
                            mock_perplexity.assert_called_once()

    def test_falls_back_to_gemini_when_perplexity_fails(self):
        """When data is thin and Perplexity raises, Gemini must be used as the
        final fallback and the result must still be a valid JSON envelope."""
        from backend.financial_agents import social_sentiment_agent
        thin_data = {"news": [], "recommendations": {}}
        with patch(f"{PROVIDERS_MODULE}.fetch_sentiment_data", return_value=thin_data):
            with patch(f"{PROVIDERS_MODULE}.fetch_stocktwits_sentiment", return_value=None):
                with patch(f"{PROVIDERS_MODULE}.fetch_reddit_sentiment", return_value=None):
                    with patch(f"{PROVIDERS_MODULE}.fetch_twitter_sentiment", return_value=None):
                        with patch(f"{PROVIDERS_MODULE}.call_perplexity", side_effect=Exception("down")):
                            with patch(f"{PROVIDERS_MODULE}.call_gemini", return_value="Gemini fallback."):
                                result = social_sentiment_agent("TSLA", skip_guardrail=True)
                                data = json.loads(result)
                                self.assertEqual(data["content"], "Gemini fallback.")
                                self.assertEqual(data["citations"], [])


class TestDividendAgent(unittest.TestCase):
    def test_returns_dict_with_required_keys_on_success(self):
        from backend.financial_agents import dividend_agent
        mock_json = json.dumps({
            "isDividendStock": True,
            "hasDividendHistory": True,
            "analysis": "Solid dividend payer.",
            "stats": {"currentYield": "3.5%"}
        })
        with patch(f"{PROVIDERS_MODULE}.fetch_dividend_data", return_value=MOCK_DIVIDEND_DATA):
            with patch(f"{PROVIDERS_MODULE}.call_groq", return_value=mock_json):
                result = dividend_agent("MSFT", 50.0, 3, skip_guardrail=True)
                self.assertTrue(result["isDividendStock"])
                self.assertIn("analysis", result)
                # Stats should be overwritten with verified yfinance values
                self.assertEqual(result["stats"]["currentYield"], MOCK_DIVIDEND_DATA["current_yield"])
                self.assertEqual(result["stats"]["paymentFrequency"], MOCK_DIVIDEND_DATA["payment_frequency"])

    def test_returns_yfinance_fallback_when_all_providers_fail(self):
        """When Groq AND Gemini both fail but yfinance data is available, the
        agent must return a valid factual response from yfinance rather than an
        error dict — so the user always sees real numbers."""
        from backend.financial_agents import dividend_agent
        with patch(f"{PROVIDERS_MODULE}.fetch_dividend_data", return_value=MOCK_DIVIDEND_DATA):
            with patch(f"{PROVIDERS_MODULE}.call_groq", side_effect=Exception("Groq error")):
                with patch(f"{PROVIDERS_MODULE}.call_gemini", side_effect=Exception("Gemini error")):
                    result = dividend_agent("MSFT", 50.0, 3, skip_guardrail=True)
                    # isDividendStock must reflect the real yfinance value, not a hardcoded False
                    self.assertEqual(result["isDividendStock"], MOCK_DIVIDEND_DATA["is_dividend_stock"])
                    self.assertIn("analysis", result)
                    # The analysis should contain factual data, not an error message
                    self.assertNotIn("Analysis Unavailable", result["analysis"])
                    # Stats must be populated from yfinance
                    self.assertIn("stats", result)
                    self.assertEqual(result["stats"]["currentYield"], MOCK_DIVIDEND_DATA["current_yield"])

    def test_returns_error_dict_when_all_providers_and_yfinance_fail(self):
        """When Groq, Gemini AND yfinance all fail, the error dict is the
        correct last-resort response."""
        from backend.financial_agents import dividend_agent
        with patch(f"{PROVIDERS_MODULE}.fetch_dividend_data", return_value=None):
            with patch(f"{PROVIDERS_MODULE}.call_groq", side_effect=Exception("Groq error")):
                with patch(f"{PROVIDERS_MODULE}.call_gemini", side_effect=Exception("Gemini error")):
                    result = dividend_agent("MSFT", 50.0, 3, skip_guardrail=True)
                    self.assertFalse(result["isDividendStock"])
                    self.assertIn("Unavailable", result["analysis"])

    def test_prefetched_data_bypasses_fetch_dividend_data(self):
        """When prefetched_data is provided, fetch_dividend_data must never be
        called — the pre-fetched dict from research_node is used directly."""
        from backend.financial_agents import dividend_agent
        mock_json = json.dumps({
            "isDividendStock": True,
            "hasDividendHistory": True,
            "analysis": "Solid dividend payer.",
            "stats": {"currentYield": "3.5%"}
        })
        with patch(f"{PROVIDERS_MODULE}.fetch_dividend_data") as mock_fetch:
            with patch(f"{PROVIDERS_MODULE}.call_groq", return_value=mock_json):
                result = dividend_agent("MSFT", 50.0, 3, skip_guardrail=True,
                                        prefetched_data=MOCK_DIVIDEND_DATA)
                mock_fetch.assert_not_called()
                self.assertTrue(result["isDividendStock"])
                self.assertEqual(result["stats"]["currentYield"], MOCK_DIVIDEND_DATA["current_yield"])


class TestPerplexityGeminiFallback(unittest.TestCase):
    """Test the shared _perplexity_with_gemini_fallback helper directly."""

    def test_uses_perplexity_when_available(self):
        from backend.financial_agents import _perplexity_with_gemini_fallback
        mock_resp = json.dumps({"content": "Perplexity answer", "citations": []})
        with patch(f"{PROVIDERS_MODULE}.call_perplexity", return_value=mock_resp) as mock_p:
            with patch(f"{PROVIDERS_MODULE}.call_gemini") as mock_g:
                result = _perplexity_with_gemini_fallback("prompt", "system", 500)
                mock_p.assert_called_once()
                mock_g.assert_not_called()
                self.assertEqual(json.loads(result)["content"], "Perplexity answer")

    def test_falls_back_to_gemini_on_perplexity_error(self):
        from backend.financial_agents import _perplexity_with_gemini_fallback
        with patch(f"{PROVIDERS_MODULE}.call_perplexity", side_effect=Exception("down")):
            with patch(f"{PROVIDERS_MODULE}.call_gemini", return_value="Gemini fallback"):
                result = _perplexity_with_gemini_fallback("prompt", "system", 500)
                data = json.loads(result)
                self.assertEqual(data["content"], "Gemini fallback")
                self.assertEqual(data["citations"], [])


if __name__ == "__main__":
    unittest.main()
