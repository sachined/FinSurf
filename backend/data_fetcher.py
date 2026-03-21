"""
data_fetcher.py — backward-compatible shim.

All implementations have moved to the backend.data subpackage.
This file re-exports every public name so existing callers require zero changes.
"""
from backend.data import (  # noqa: F401
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