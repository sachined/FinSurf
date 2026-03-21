"""
backend.data — structured market data subpackage.

Re-exports all public symbols so callers can do:
    from backend.data import fetch_research_data, PnLSummary, ...
"""
from .yfinance_fetcher import (
    PnLSummary,
    calculate_pnl,
    fetch_price_on_date,
    fetch_dividend_data,
    fetch_research_data,
    fetch_sentiment_data,
    _extract_last_close,
    _extract_news_data,
    _extract_recommendations_data,
    _extract_dividend_data,
    _price_from_history,
)
from .social import (
    fetch_stocktwits_sentiment,
    fetch_alphavantage_sentiment,
)
from .finnhub import (
    fetch_finnhub_sentiment,
    fetch_finnhub_research,
)
from .edgar import fetch_edgar_filings

__all__ = [
    "PnLSummary",
    "calculate_pnl",
    "fetch_price_on_date",
    "fetch_dividend_data",
    "fetch_research_data",
    "fetch_sentiment_data",
    "_extract_last_close",
    "_extract_news_data",
    "_extract_recommendations_data",
    "_extract_dividend_data",
    "_price_from_history",
    "fetch_stocktwits_sentiment",
    "fetch_alphavantage_sentiment",
    "fetch_finnhub_sentiment",
    "fetch_finnhub_research",
    "fetch_edgar_filings",
]