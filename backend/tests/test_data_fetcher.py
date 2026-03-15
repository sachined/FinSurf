import pandas as pd
import pytest
from unittest.mock import MagicMock, patch
from backend.data_fetcher import fetch_price_on_date, _extract_recommendations_data, fetch_research_data

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
