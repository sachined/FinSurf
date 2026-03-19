import datetime
import unittest
import pandas as pd
import pytest
from unittest.mock import MagicMock, patch
from backend.data_fetcher import (
    fetch_price_on_date,
    _extract_recommendations_data,
    fetch_research_data,
    calculate_pnl,
    _price_from_history,
)

def test_fetch_price_on_date_multiindex():
    # Mocking yf.Ticker
    with patch("yfinance.Ticker") as MockTicker:
        mock_ticker = MockTicker.return_value
        
        # Create a MultiIndex DataFrame similar to yf.history() for multiple symbols or some configurations
        mi = pd.MultiIndex.from_tuples([('AAPL', 'Close'), ('AAPL', 'Open')], names=['Ticker', 'Price'])
        df = pd.DataFrame([[150.0, 148.0]], columns=mi, index=[pd.Timestamp("2024-01-01")])
        mock_ticker.history.return_value = df
        
        price = fetch_price_on_date("AAPL", "2024-01-01")
        assert price == 150.0

def test_extract_recommendations_multiindex():
    # Mocking yf.Ticker
    mock_ticker = MagicMock()
    
    # MultiIndex recommendations
    mi = pd.MultiIndex.from_tuples([('buy', 'AAPL'), ('hold', 'AAPL')], names=['Attribute', 'Ticker'])
    df = pd.DataFrame([[10, 5]], columns=mi, index=[pd.Timestamp.now()])
    mock_ticker.recommendations = df
    
    recs = _extract_recommendations_data(mock_ticker)
    assert recs.get("buy") == 10
    assert recs.get("hold") == 5

def test_fetch_research_data_multiindex():
    with patch("yfinance.Ticker") as MockTicker:
        mock_ticker = MockTicker.return_value
        mock_ticker.info = {"currentPrice": 150.0, "quoteType": "EQUITY"}

        # MultiIndex history
        mi = pd.MultiIndex.from_tuples([('AAPL', 'Close'), ('AAPL', 'Open')], names=['Ticker', 'Price'])
        df = pd.DataFrame([[150.0, 148.0]], columns=mi, index=[pd.Timestamp("2024-01-01")])
        mock_ticker.history.return_value = df

        data = fetch_research_data("AAPL")
        assert data is not None
        assert len(data["price_history"]) == 1
        assert data["price_history"][0]["close"] == 150.0


# ---------------------------------------------------------------------------
# TestCalculatePnl — pure arithmetic, no mocks needed
# ---------------------------------------------------------------------------

class TestCalculatePnl(unittest.TestCase):
    def test_realized_gain(self):
        result = calculate_pnl(100.0, 120.0, None, 10.0, "2023-01-01", "2023-06-01")
        self.assertAlmostEqual(result["realized_gain"], 200.0, places=2)
        self.assertAlmostEqual(result["realized_gain_pct"], 20.0, places=2)
        self.assertIsNone(result["unrealized_gain"])

    def test_unrealized_gain_no_sell(self):
        result = calculate_pnl(100.0, None, 130.0, 10.0, "2023-01-01", "")
        self.assertAlmostEqual(result["unrealized_gain"], 300.0, places=2)
        self.assertAlmostEqual(result["unrealized_gain_pct"], 30.0, places=2)
        self.assertIsNone(result["realized_gain"])

    def test_long_term_holding(self):
        result = calculate_pnl(100.0, 120.0, None, 5.0, "2022-01-01", "2023-06-01")
        self.assertTrue(result["is_long_term"])
        self.assertGreater(result["holding_days"], 365)

    def test_short_term_holding(self):
        result = calculate_pnl(100.0, 110.0, None, 5.0, "2023-01-01", "2023-06-01")
        self.assertFalse(result["is_long_term"])
        self.assertLess(result["holding_days"], 365)

    def test_none_prices_gracefully(self):
        result = calculate_pnl(None, None, None, 10.0, "", "")
        self.assertIsNone(result["realized_gain"])
        self.assertIsNone(result["unrealized_gain"])
        self.assertIsNone(result["holding_days"])
        self.assertIsNone(result["is_long_term"])


# ---------------------------------------------------------------------------
# TestPriceFromHistory — pure list logic, no mocks
# ---------------------------------------------------------------------------

class TestPriceFromHistory(unittest.TestCase):
    _HISTORY = [
        {"date": "2024-01-01", "close": 150.0},
        {"date": "2024-03-01", "close": 160.0},
        {"date": "2024-06-01", "close": 170.0},
    ]

    def test_exact_date_match(self):
        result = _price_from_history(self._HISTORY, "2024-03-01")
        self.assertAlmostEqual(result, 160.0, places=2)

    def test_returns_closest_earlier_date(self):
        result = _price_from_history(self._HISTORY, "2024-04-15")
        self.assertAlmostEqual(result, 160.0, places=2)

    def test_returns_none_before_history_start(self):
        result = _price_from_history(self._HISTORY, "2023-12-01")
        self.assertIsNone(result)

    def test_returns_none_for_empty_history(self):
        result = _price_from_history([], "2024-01-01")
        self.assertIsNone(result)
