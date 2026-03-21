"""
Tests for backend/data_fetcher.py (shim) and the backend/data/ subpackage.

Covers:
  - Backward-compat shim: all public names importable from backend.data_fetcher
  - _cache.py: cache miss, hit, TTL expiry
  - _formatters.py: fmt helpers and dividend-period utilities
  - yfinance_fetcher.py: PnLSummary, calculate_pnl, _price_from_history,
                         fetch_price_on_date, fetch_research_data (mocked yfinance)
  - social.py: fetch_stocktwits_sentiment, fetch_alphavantage_sentiment
  - finnhub.py: fetch_finnhub_sentiment, fetch_finnhub_research
  - edgar.py: fetch_edgar_filings
"""
import datetime
import os
import sys
import unittest
import pandas as pd
import pytest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


# ---------------------------------------------------------------------------
# Backward-compatibility shim
# ---------------------------------------------------------------------------

class TestBackwardCompatShim(unittest.TestCase):
    """All public names must be importable from the old backend.data_fetcher path."""

    def test_all_public_names_importable(self):
        from backend.data_fetcher import (
            PnLSummary,
            calculate_pnl,
            fetch_price_on_date,
            fetch_dividend_data,
            fetch_research_data,
            fetch_sentiment_data,
            fetch_stocktwits_sentiment,
            fetch_alphavantage_sentiment,
            fetch_finnhub_sentiment,
            fetch_finnhub_research,
            fetch_edgar_filings,
            _extract_last_close,
            _extract_news_data,
            _extract_recommendations_data,
            _extract_dividend_data,
            _price_from_history,
        )
        # If this class definition raises, the import itself failed
        self.assertTrue(callable(calculate_pnl))

    def test_same_objects_as_subpackage(self):
        """The shim must re-export the exact same objects, not copies."""
        from backend.data_fetcher import calculate_pnl as shim_fn
        from backend.data import calculate_pnl as direct_fn
        self.assertIs(shim_fn, direct_fn)


# ---------------------------------------------------------------------------
# _cache.py
# ---------------------------------------------------------------------------

class TestCache(unittest.TestCase):

    def setUp(self):
        # Fresh dict for every test — no cross-test state
        self.cache: dict = {}

    def test_miss_returns_none(self):
        from backend.data._cache import _cache_get
        result = _cache_get(self.cache, "AAPL", ttl=300)
        self.assertIsNone(result)

    def test_set_then_get_returns_data(self):
        from backend.data._cache import _cache_get, _cache_set
        _cache_set(self.cache, "AAPL", {"price": 182.5})
        result = _cache_get(self.cache, "AAPL", ttl=300)
        self.assertEqual(result, {"price": 182.5})

    def test_internal_ts_key_not_exposed(self):
        from backend.data._cache import _cache_get, _cache_set
        _cache_set(self.cache, "AAPL", {"price": 182.5})
        result = _cache_get(self.cache, "AAPL", ttl=300)
        self.assertNotIn("_ts", result)

    def test_expired_entry_returns_none(self):
        from backend.data._cache import _cache_get, _cache_set
        _cache_set(self.cache, "AAPL", {"price": 182.5})
        # TTL of 0 means expired immediately
        result = _cache_get(self.cache, "AAPL", ttl=0)
        self.assertIsNone(result)


# ---------------------------------------------------------------------------
# _formatters.py
# ---------------------------------------------------------------------------

from backend.data._formatters import _fmt_pct, _fmt_usd, _fmt_ratio

@pytest.mark.parametrize("fn,value,expected", [
    (_fmt_pct,   0.035, "3.50%"),
    (_fmt_pct,   None,  "N/A"),
    (_fmt_usd,   1.5,   "$1.5000"),
    (_fmt_usd,   None,  "N/A"),
    (_fmt_ratio, 24.5,  "24.50x"),
    (_fmt_ratio, None,  "N/A"),
])
def test_formatters(fn, value, expected):
    assert fn(value) == expected


class TestFormatters(unittest.TestCase):

    def test_infer_frequency_quarterly(self):
        from backend.data._formatters import _infer_payment_frequency
        now = pd.Timestamp.now(tz="UTC")
        dates = pd.DatetimeIndex([now - pd.DateOffset(days=d) for d in (270, 180, 90, 1)])
        dividends = pd.Series([0.25] * 4, index=dates)
        self.assertEqual(_infer_payment_frequency(dividends), "Quarterly")

    def test_infer_frequency_monthly(self):
        from backend.data._formatters import _infer_payment_frequency
        now = pd.Timestamp.now(tz="UTC")
        dates = pd.DatetimeIndex([now - pd.DateOffset(months=i) for i in range(11, -1, -1)])
        dividends = pd.Series([0.10] * 12, index=dates)
        self.assertEqual(_infer_payment_frequency(dividends), "Monthly")

    def test_infer_frequency_empty(self):
        from backend.data._formatters import _infer_payment_frequency
        self.assertEqual(_infer_payment_frequency(pd.Series([], dtype=float)), "N/A")

    def test_consecutive_years_three(self):
        from backend.data._formatters import _consecutive_dividend_years
        dates = pd.date_range("2022-03-01", periods=3, freq="YE")
        dividends = pd.Series([1.0, 1.0, 1.0], index=dates)
        self.assertEqual(_consecutive_dividend_years(dividends), "3")

    def test_consecutive_years_gap_stops_count(self):
        from backend.data._formatters import _consecutive_dividend_years
        # 2024, 2022 — gap at 2023 → only 1 consecutive year from the top
        dates = pd.DatetimeIndex(["2022-12-31", "2024-12-31"])
        dividends = pd.Series([1.0, 1.0], index=dates)
        result = _consecutive_dividend_years(dividends)
        self.assertEqual(result, "1")

    def test_consecutive_years_empty(self):
        from backend.data._formatters import _consecutive_dividend_years
        self.assertEqual(_consecutive_dividend_years(pd.Series([], dtype=float)), "0")


# ---------------------------------------------------------------------------
# yfinance_fetcher.py — calculate_pnl (pure arithmetic)
# ---------------------------------------------------------------------------

class TestCalculatePnl(unittest.TestCase):
    def test_realized_gain(self):
        from backend.data_fetcher import calculate_pnl
        result = calculate_pnl(100.0, 120.0, None, 10.0, "2023-01-01", "2023-06-01")
        self.assertAlmostEqual(result["realized_gain"], 200.0, places=2)
        self.assertAlmostEqual(result["realized_gain_pct"], 20.0, places=2)
        self.assertIsNone(result["unrealized_gain"])

    def test_unrealized_gain_no_sell(self):
        from backend.data_fetcher import calculate_pnl
        result = calculate_pnl(100.0, None, 130.0, 10.0, "2023-01-01", "")
        self.assertAlmostEqual(result["unrealized_gain"], 300.0, places=2)
        self.assertAlmostEqual(result["unrealized_gain_pct"], 30.0, places=2)
        self.assertIsNone(result["realized_gain"])

    def test_long_term_holding(self):
        from backend.data_fetcher import calculate_pnl
        result = calculate_pnl(100.0, 120.0, None, 5.0, "2022-01-01", "2023-06-01")
        self.assertTrue(result["is_long_term"])
        self.assertGreater(result["holding_days"], 365)

    def test_short_term_holding(self):
        from backend.data_fetcher import calculate_pnl
        result = calculate_pnl(100.0, 110.0, None, 5.0, "2023-01-01", "2023-06-01")
        self.assertFalse(result["is_long_term"])
        self.assertLess(result["holding_days"], 365)

    def test_none_prices_gracefully(self):
        from backend.data_fetcher import calculate_pnl
        result = calculate_pnl(None, None, None, 10.0, "", "")
        self.assertIsNone(result["realized_gain"])
        self.assertIsNone(result["unrealized_gain"])
        self.assertIsNone(result["holding_days"])
        self.assertIsNone(result["is_long_term"])


# ---------------------------------------------------------------------------
# yfinance_fetcher.py — _price_from_history (pure list logic)
# ---------------------------------------------------------------------------

class TestPriceFromHistory(unittest.TestCase):
    _HISTORY = [
        {"date": "2024-01-01", "close": 150.0},
        {"date": "2024-03-01", "close": 160.0},
        {"date": "2024-06-01", "close": 170.0},
    ]

    def test_exact_date_match(self):
        from backend.data_fetcher import _price_from_history
        self.assertAlmostEqual(_price_from_history(self._HISTORY, "2024-03-01"), 160.0)

    def test_returns_closest_earlier_date(self):
        from backend.data_fetcher import _price_from_history
        self.assertAlmostEqual(_price_from_history(self._HISTORY, "2024-04-15"), 160.0)

    def test_returns_none_before_history_start(self):
        from backend.data_fetcher import _price_from_history
        self.assertIsNone(_price_from_history(self._HISTORY, "2023-12-01"))

    def test_returns_none_for_empty_history(self):
        from backend.data_fetcher import _price_from_history
        self.assertIsNone(_price_from_history([], "2024-01-01"))


# ---------------------------------------------------------------------------
# yfinance_fetcher.py — mocked yfinance calls
# ---------------------------------------------------------------------------

def test_fetch_price_on_date_multiindex():
    from backend.data_fetcher import fetch_price_on_date
    with patch("yfinance.Ticker") as MockTicker:
        mock_ticker = MockTicker.return_value
        mi = pd.MultiIndex.from_tuples(
            [("AAPL", "Close"), ("AAPL", "Open")], names=["Ticker", "Price"]
        )
        df = pd.DataFrame([[150.0, 148.0]], columns=mi, index=[pd.Timestamp("2024-01-01")])
        mock_ticker.history.return_value = df
        assert fetch_price_on_date("AAPL", "2024-01-01") == 150.0


def test_extract_recommendations_multiindex():
    from backend.data_fetcher import _extract_recommendations_data
    mock_ticker = MagicMock()
    mi = pd.MultiIndex.from_tuples(
        [("buy", "AAPL"), ("hold", "AAPL")], names=["Attribute", "Ticker"]
    )
    df = pd.DataFrame([[10, 5]], columns=mi, index=[pd.Timestamp.now()])
    mock_ticker.recommendations = df
    recs = _extract_recommendations_data(mock_ticker)
    assert recs.get("buy") == 10
    assert recs.get("hold") == 5


def test_fetch_research_data_multiindex():
    from backend.data_fetcher import fetch_research_data
    with patch("yfinance.Ticker") as MockTicker:
        mock_ticker = MockTicker.return_value
        mock_ticker.info = {"currentPrice": 150.0, "quoteType": "EQUITY"}
        mi = pd.MultiIndex.from_tuples(
            [("AAPL", "Close"), ("AAPL", "Open")], names=["Ticker", "Price"]
        )
        df = pd.DataFrame([[150.0, 148.0]], columns=mi, index=[pd.Timestamp("2024-01-01")])
        mock_ticker.history.return_value = df
        data = fetch_research_data("AAPL")
        assert data is not None
        assert len(data["price_history"]) == 1
        assert data["price_history"][0]["close"] == 150.0


# ---------------------------------------------------------------------------
# social.py — fetch_stocktwits_sentiment
# ---------------------------------------------------------------------------

class TestStockTwitsSentiment(unittest.TestCase):

    def _mock_response(self, messages):
        r = MagicMock()
        r.status_code = 200
        r.json.return_value = {"messages": messages}
        return r

    def test_counts_bullish_and_bearish(self):
        from backend.data.social import fetch_stocktwits_sentiment
        msgs = [
            {"body": "ZZZT moon!", "entities": {"sentiment": {"basic": "Bullish"}}},
            {"body": "ZZZT crash", "entities": {"sentiment": {"basic": "Bearish"}}},
            {"body": "Holding",    "entities": {"sentiment": None}},
        ]
        with patch("requests.get", return_value=self._mock_response(msgs)):
            result = fetch_stocktwits_sentiment("ZZZT")
        self.assertEqual(result["bullish_count"], 1)
        self.assertEqual(result["bearish_count"], 1)
        self.assertEqual(result["bullish_pct"], 50)

    def test_non_200_returns_none(self):
        from backend.data.social import fetch_stocktwits_sentiment
        r = MagicMock()
        r.status_code = 403
        with patch("requests.get", return_value=r):
            self.assertIsNone(fetch_stocktwits_sentiment("ZZZFAIL"))

    def test_empty_messages_returns_none(self):
        from backend.data.social import fetch_stocktwits_sentiment
        with patch("requests.get", return_value=self._mock_response([])):
            self.assertIsNone(fetch_stocktwits_sentiment("ZZZMT"))


# ---------------------------------------------------------------------------
# social.py — fetch_alphavantage_sentiment
# ---------------------------------------------------------------------------

class TestAlphaVantageSentiment(unittest.TestCase):

    def _mock_feed_response(self, ticker="ZZZAV"):
        r = MagicMock()
        r.status_code = 200
        r.json.return_value = {
            "feed": [
                {
                    "title": "Strong results",
                    "source": "Bloomberg",
                    "summary": "Revenue up",
                    "ticker_sentiment": [
                        {
                            "ticker": ticker,
                            "relevance_score": "0.6",
                            "ticker_sentiment_label": "Bullish",
                        }
                    ],
                },
                {
                    "title": "Weak guidance",
                    "source": "CNBC",
                    "summary": "Forecast cut",
                    "ticker_sentiment": [
                        {
                            "ticker": ticker,
                            "relevance_score": "0.5",
                            "ticker_sentiment_label": "Bearish",
                        }
                    ],
                },
            ]
        }
        return r

    def test_counts_sentiment_labels(self):
        from backend.data.social import fetch_alphavantage_sentiment
        with patch.dict(os.environ, {"ALPHA_VANTAGE_API_KEY": "test-key"}):
            with patch("requests.get", return_value=self._mock_feed_response("ZZZAV2")):
                result = fetch_alphavantage_sentiment("ZZZAV2")
        self.assertEqual(result["bullish_count"], 1)
        self.assertEqual(result["bearish_count"], 1)
        self.assertEqual(result["total_articles"], 2)

    def test_no_api_key_returns_none(self):
        from backend.data.social import fetch_alphavantage_sentiment
        env = {k: v for k, v in os.environ.items() if k != "ALPHA_VANTAGE_API_KEY"}
        with patch.dict(os.environ, env, clear=True):
            self.assertIsNone(fetch_alphavantage_sentiment("ZZZNOKEY"))

    def test_rate_limit_note_returns_none(self):
        from backend.data.social import fetch_alphavantage_sentiment
        r = MagicMock()
        r.status_code = 200
        r.json.return_value = {"Note": "Thank you for using Alpha Vantage!"}
        with patch.dict(os.environ, {"ALPHA_VANTAGE_API_KEY": "test-key"}):
            with patch("requests.get", return_value=r):
                self.assertIsNone(fetch_alphavantage_sentiment("ZZZRL"))


# ---------------------------------------------------------------------------
# finnhub.py — fetch_finnhub_sentiment
# ---------------------------------------------------------------------------

class TestFinnhubSentiment(unittest.TestCase):

    def test_no_api_key_returns_none(self):
        from backend.data.finnhub import fetch_finnhub_sentiment
        env = {k: v for k, v in os.environ.items() if k != "FINNHUB_API_KEY"}
        with patch.dict(os.environ, env, clear=True):
            self.assertIsNone(fetch_finnhub_sentiment("ZZZNOFH"))

    def test_parses_articles(self):
        from backend.data.finnhub import fetch_finnhub_sentiment
        now_ts = int(datetime.datetime.now().timestamp())
        r = MagicMock()
        r.status_code = 200
        r.json.return_value = [
            {"headline": "ZZZFH hits record", "source": "Reuters",
             "datetime": now_ts, "url": "https://example.com", "summary": "Record."},
        ]
        with patch.dict(os.environ, {"FINNHUB_API_KEY": "test-key"}):
            with patch("requests.get", return_value=r):
                result = fetch_finnhub_sentiment("ZZZFH")
        self.assertEqual(result["total"], 1)
        self.assertEqual(result["articles"][0]["headline"], "ZZZFH hits record")


# ---------------------------------------------------------------------------
# finnhub.py — fetch_finnhub_research
# ---------------------------------------------------------------------------

class TestFinnhubResearch(unittest.TestCase):

    def test_no_api_key_returns_none(self):
        from backend.data.finnhub import fetch_finnhub_research
        env = {k: v for k, v in os.environ.items() if k != "FINNHUB_API_KEY"}
        with patch.dict(os.environ, env, clear=True):
            self.assertIsNone(fetch_finnhub_research("ZZZNOKEY"))

    def test_returns_insider_and_earnings(self):
        from backend.data.finnhub import fetch_finnhub_research

        insider_response = MagicMock()
        insider_response.status_code = 200
        insider_response.json.return_value = {
            "data": [
                {
                    "transactionCode": "P", "name": "CEO",
                    "change": 500, "transactionPrice": 150.0,
                    "transactionDate": "2024-01-15",
                }
            ]
        }

        earnings_response = MagicMock()
        earnings_response.status_code = 200
        earnings_response.json.return_value = [
            {"period": "2024-Q1", "actual": 2.18, "estimate": 2.10, "surprisePercent": 3.8}
        ]

        with patch.dict(os.environ, {"FINNHUB_API_KEY": "test-key"}):
            with patch("requests.get", side_effect=[insider_response, earnings_response]):
                result = fetch_finnhub_research("ZZZFHR")

        self.assertIn("insider", result)
        self.assertEqual(result["insider"]["buy_count"], 1)
        self.assertIn("earnings_surprise", result)
        self.assertAlmostEqual(result["earnings_surprise"]["actual"], 2.18)


# ---------------------------------------------------------------------------
# edgar.py — fetch_edgar_filings
# ---------------------------------------------------------------------------

class TestEdgarFilings(unittest.TestCase):

    def test_cik_lookup_failure_returns_none(self):
        from backend.data.edgar import fetch_edgar_filings
        r = MagicMock()
        r.status_code = 404
        with patch("requests.get", return_value=r):
            self.assertIsNone(fetch_edgar_filings("ZZZEG"))

    def test_parses_8k_filings(self):
        from backend.data.edgar import fetch_edgar_filings
        import datetime as dt

        # Response 1: CIK lookup via browse-edgar
        cik_response = MagicMock()
        cik_response.status_code = 200
        cik_response.text = "CIK0000320193 for ZZZEG"

        # Response 2: submissions JSON
        recent_date = (dt.date.today() - dt.timedelta(days=5)).isoformat()
        submissions_response = MagicMock()
        submissions_response.status_code = 200
        submissions_response.json.return_value = {
            "name": "TestCorp",
            "filings": {
                "recent": {
                    "form":                   ["8-K", "10-K"],
                    "filingDate":             [recent_date, recent_date],
                    "accessionNumber":        ["0000320193-24-000001", "0000320193-24-000002"],
                    "primaryDocDescription":  ["Material Event", "Annual Report"],
                }
            },
        }

        with patch("requests.get", side_effect=[cik_response, submissions_response]):
            result = fetch_edgar_filings("ZZZEG")

        self.assertIsNotNone(result)
        self.assertEqual(result["company"], "TestCorp")
        self.assertEqual(len(result["filings"]), 1)  # only the 8-K, not the 10-K
        self.assertEqual(result["filings"][0]["description"], "Material Event")


if __name__ == "__main__":
    unittest.main()
