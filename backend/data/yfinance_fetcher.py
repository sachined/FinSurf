"""
yfinance-backed market data fetching.

Public API:
  calculate_pnl          — pure P&L arithmetic, no network
  fetch_price_on_date    — closing price for any historical date
  fetch_research_data    — full fundamentals + 2y price history (cached 15 min)
  fetch_dividend_data    — dividend stats only (cached via fetch_research_data)
  fetch_sentiment_data   — news + analyst recs for sentiment agent
  _price_from_history    — lookup in already-fetched price_history list
"""
import datetime
import sys
from typing import Any, Dict, Optional

import pandas as pd
import yfinance as yf

from ._cache import _cache_get, _cache_set
from ._formatters import (
    _fmt_pct,
    _fmt_usd,
    _fmt_ratio,
    _infer_payment_frequency,
    _consecutive_dividend_years,
)


# ---------------------------------------------------------------------------
# Shared P&L data structure
# ---------------------------------------------------------------------------

class PnLSummary(Dict[str, Any]):
    """
    Carries realized/unrealized gains and total dividends through LangGraph state.

    Fields (all Optional unless noted):
      buy_price            – purchase price per share (float)
      sell_price           – sale price per share (float)
      current_price        – latest market price per share (float)
      shares               – number of shares (float, required)
      realized_gain        – (sell - buy) × shares  [when sell_price available]
      realized_gain_pct    – % return on realized position
      unrealized_gain      – (current - buy) × shares  [when no sell_price]
      unrealized_gain_pct  – % return on unrealized position
      holding_days         – calendar days from purchase_date to sell_date (int)
      is_long_term         – True when holding_days > 365
      total_dividends      – estimated dividend income over projection period
                             (written by dividend_node after dividend_agent runs)
    """


def calculate_pnl(
    buy_price: Optional[float],
    sell_price: Optional[float],
    current_price: Optional[float],
    shares: float,
    purchase_date: str = "",
    sell_date: str = "",
) -> Dict[str, Any]:
    """
    Shared Tax Calculator tool — pure calculation, no network calls.

    Computes realized gain (when sell_price is available) OR unrealized gain
    (when only current_price is known) and determines the holding period.
    Both Tax and Dividend agents call this instead of duplicating arithmetic.

    Returns a PnLSummary-shaped dict that is stored in FinSurfState.pnl_summary
    and forwarded to the frontend via the /api/research response envelope.
    """
    result: Dict[str, Any] = {
        "buy_price": buy_price,
        "sell_price": sell_price,
        "current_price": current_price,
        "shares": shares,
        "realized_gain": None,
        "realized_gain_pct": None,
        "unrealized_gain": None,
        "unrealized_gain_pct": None,
        "holding_days": None,
        "is_long_term": None,
        "total_dividends": None,
    }

    # Realized gain — both buy and sell prices known
    if buy_price is not None and sell_price is not None and shares > 0:
        realized = (sell_price - buy_price) * shares
        result["realized_gain"] = round(realized, 2)
        result["realized_gain_pct"] = (
            round((sell_price - buy_price) / buy_price * 100, 4)
            if buy_price != 0 else None
        )

    # Unrealized gain — no sell price yet
    if buy_price is not None and current_price is not None and sell_price is None and shares > 0:
        unrealized = (current_price - buy_price) * shares
        result["unrealized_gain"] = round(unrealized, 2)
        result["unrealized_gain_pct"] = (
            round((current_price - buy_price) / buy_price * 100, 4)
            if buy_price != 0 else None
        )

    # Holding period
    if purchase_date and sell_date:
        try:
            d0 = datetime.date.fromisoformat(purchase_date)
            d1 = datetime.date.fromisoformat(sell_date)
            holding_days = (d1 - d0).days
            result["holding_days"] = holding_days
            result["is_long_term"] = holding_days > 365
        except ValueError:
            pass

    return result


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_last_close(df: "pd.DataFrame") -> float:
    """Return the last Close price from a yfinance history DataFrame.

    Handles both flat and MultiIndex column layouts, and the edge case where
    ``xs`` still returns a Series when multiple ticker columns are present.
    """
    if df.columns.nlevels > 1:
        level = 1 if "Close" in df.columns.get_level_values(1) else 0
        close_series = df.xs("Close", axis=1, level=level)
    else:
        close_series = df["Close"]

    last_row = close_series.iloc[-1]
    # xs() can return a Series when multiple tickers match; take the first value.
    return float(last_row.iloc[0] if hasattr(last_row, "iloc") else last_row)


def _price_from_history(price_history: list, date_str: str) -> Optional[float]:
    """Look up a closing price in an already-fetched price_history list.

    price_history is the list of {"date": "YYYY-MM-DD", "close": float} dicts
    returned by fetch_research_data.  Returns the close for the latest trading
    day on or before date_str, or None if date_str is outside the window.
    """
    if not price_history or not date_str:
        return None
    try:
        target = datetime.date.fromisoformat(date_str)
        best: Optional[float] = None
        for entry in price_history:
            entry_date = datetime.date.fromisoformat(entry["date"])
            if entry_date <= target:
                best = entry["close"]
            else:
                break
        return best
    except (ValueError, KeyError, TypeError):
        return None


def _extract_news_data(t: yf.Ticker) -> list:
    """Extract recent news headlines from yf.Ticker object."""
    news_items: list = []
    try:
        raw_news = t.news
        if raw_news:
            for item in raw_news[:10]:
                title = item.get("content", {}).get("title") or item.get("title", "")
                publisher = (
                    item.get("content", {}).get("provider", {}).get("displayName")
                    or item.get("publisher", "")
                )
                link = (
                    item.get("content", {}).get("canonicalUrl", {}).get("url")
                    or item.get("link", "")
                )
                if title:
                    news_items.append({
                        "title": title,
                        "publisher": publisher,
                        "link": link,
                    })
    except TypeError:
        return news_items
    return news_items


def _extract_recommendations_data(t: yf.Ticker) -> Dict[str, int]:
    """Extract analyst recommendations from yf.Ticker object."""
    recommendations: Dict[str, int] = {}
    try:
        rec = t.recommendations
        if rec is not None and not rec.empty:

            # Robust MultiIndex check
            if rec.columns.nlevels > 1:
                # Find which level contains our recommendation columns
                level = 1 if any(c in rec.columns.get_level_values(1) for c in ["buy", "hold", "sell"]) else 0
                rec.columns = rec.columns.get_level_values(level)

            three_months_ago = pd.Timestamp.now(tz="UTC") - pd.DateOffset(months=3)
            # recommendations index may or may not be tz-aware
            try:
                recent_rec = rec[rec.index >= three_months_ago]
            except TypeError:
                recent_rec = rec[rec.index >= three_months_ago.replace(tzinfo=None)]
            if not recent_rec.empty:
                for col in ["strongBuy", "buy", "hold", "sell", "strongSell"]:
                    if col in recent_rec.columns:
                        recommendations[col] = int(recent_rec[col].sum())
    except TypeError:
        return recommendations
    return recommendations


def _extract_dividend_data(t: yf.Ticker, info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Helper to extract and format dividend data from a yf.Ticker object and its info.
    Shared by fetch_dividend_data and fetch_research_data.
    """
    annual_div = info.get("dividendRate") or info.get("trailingAnnualDividendRate")

    try:
        dividends = t.dividends
    except Exception:
        dividends = None
    has_history = dividends is not None and len(dividends) > 0

    # Robust check: either the info explicitly says so, or we have actual payments in history
    is_dividend_stock = bool(annual_div and float(annual_div) > 0) or has_history

    ex_date_raw = info.get("exDividendDate")
    if ex_date_raw:
        try:
            ex_date = datetime.datetime.fromtimestamp(int(ex_date_raw), datetime.timezone.utc).strftime("%Y-%m-%d")
        except ValueError:
            ex_date = "N/A"
    else:
        ex_date = "N/A"

    return {
        "is_dividend_stock": is_dividend_stock,
        "has_history": has_history,
        "annual_dividend_per_share": _fmt_usd(annual_div, 2),
        "current_yield": _fmt_pct(info.get("dividendYield")),
        "payout_ratio": _fmt_pct(info.get("payoutRatio")),
        "five_year_avg_yield": (
            f"{info['fiveYearAvgDividendYield']:.2f}%"
            if info.get("fiveYearAvgDividendYield") is not None
            else "N/A"
        ),
        "ex_dividend_date": ex_date,
        "payment_frequency": _infer_payment_frequency(dividends),
        "consecutive_years": _consecutive_dividend_years(dividends),
    }


# ---------------------------------------------------------------------------
# YFinance in-process cache
# ---------------------------------------------------------------------------
_yfinance_cache: Dict[str, Dict[str, Any]] = {}
_YFINANCE_TTL = 60 * 15           # 15 minutes for price data
_YFINANCE_FUNDAMENTALS_TTL = 60 * 60 * 24  # 24 hours for fundamentals


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def fetch_price_on_date(ticker: str, date_str: str) -> Optional[float]:
    """
    Return the closing price for *ticker* on or just before *date_str* (YYYY-MM-DD).

    Uses a ±10-day window around the target date so weekends, market holidays,
    and any date in history are handled correctly — not limited to the 1-year
    price_history window used for chart rendering.

    Returns None on any failure so callers can show N/A gracefully.
    """
    if not date_str:
        return None
    try:
        target = datetime.date.fromisoformat(date_str)
        start  = target - datetime.timedelta(days=10)
        end    = target + datetime.timedelta(days=1)   # yfinance end is exclusive

        t = yf.Ticker(ticker)

        hist = t.history(
            start=str(start),
            end=str(end),
            auto_adjust=True,
        )
        if hist is None or hist.empty:
            return None
        # Normalise index to plain date objects for comparison
        hist.index = [ts.date() if hasattr(ts, "date") else ts for ts in hist.index]
        past = hist[hist.index <= target]
        if past.empty:
            return None
        close = _extract_last_close(past)

        return round(float(close), 4)
    except ValueError:
        return None


def fetch_dividend_data(ticker: str) -> Optional[Dict[str, Any]]:
    """
    Return structured dividend data for *ticker* using yfinance.

    Returns None if yfinance is unavailable, the ticker is invalid, or any
    other error occurs — callers should fall back to a pure-LLM lookup.
    """
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}

        # An empty or minimal info dict means the ticker was not found.
        if not info or info.get("quoteType") is None:
            return None
        return _extract_dividend_data(t, info)
    except Exception as exc:
        print(f"data_fetcher: fetch_dividend_data({ticker}) failed: {exc}", file=sys.stderr)
        return None


def fetch_research_data(ticker: str) -> Optional[Dict[str, Any]]:
    """
    Return key fundamental metrics and price history for *ticker* using yfinance.

    Returns None on any failure so the research agent can fall back to a
    full Gemini lookup.

    Results are cached for 15 minutes to reduce API load and speed up responses.
    """
    cache_key = f"research_{ticker.upper()}"
    cached = _cache_get(_yfinance_cache, cache_key, _YFINANCE_TTL)
    if cached:
        return cached

    try:
        t = yf.Ticker(ticker)
        info = t.info or {}

        current_price_raw = info.get("currentPrice") or info.get("regularMarketPrice")

        price_history: list = []
        try:
            hist = t.history(period="2y")
            if hist is not None and not hist.empty:
                if hist.columns.nlevels > 1:
                    level = 1 if "Close" in hist.columns.get_level_values(1) else 0
                    hist.columns = hist.columns.get_level_values(level)

                price_history = [
                    {"date": str(idx.date()), "close": round(float(row["Close"]), 4)}
                    for idx, row in hist.iterrows()
                ]
        except ValueError:
            return None

        # Plan B: Current Price Fallback
        if current_price_raw is None:
            try:
                # Fallback to history if info is blocked/empty
                latest_hist = t.history(period="1d")
                if not latest_hist.empty:
                    # Apply robust column access to fallback
                    current_price_raw = _extract_last_close(latest_hist)
            except ValueError:
                return None

            if not info and not current_price_raw:
                return None
        if not info or info.get("quoteType") is None: info = {}
        # Revenue growth: compare most recent two annual revenue figures
        revenue_growth = "N/A"
        try:
            financials = t.financials
            if (
                financials is not None
                and "Total Revenue" in financials.index
                and len(financials.columns) >= 2
            ):
                rev = financials.loc["Total Revenue"]
                latest = rev.iloc[0]
                prior = rev.iloc[1]
                if prior and prior != 0:
                    growth = (latest - prior) / abs(prior) * 100
                    revenue_growth = f"{growth:.1f}%"
        except ValueError:
            return None

        inst_pct: Optional[float] = info.get("heldPercentInstitutions")

        # Market cap formatting
        market_cap_raw: Optional[float] = info.get("marketCap")
        if market_cap_raw is not None:
            try:
                mc = float(market_cap_raw)
                if mc >= 1e12:
                    market_cap = f"${mc / 1e12:.2f}T"
                elif mc >= 1e9:
                    market_cap = f"${mc / 1e9:.2f}B"
                elif mc >= 1e6:
                    market_cap = f"${mc / 1e6:.2f}M"
                else:
                    market_cap = f"${mc:,.0f}"
            except (TypeError, ValueError):
                market_cap = "N/A"
        else:
            market_cap = "N/A"

        # Analyst price targets
        analyst_target_mean = _fmt_usd(info.get("targetMeanPrice"), decimals=2)
        analyst_target_high = _fmt_usd(info.get("targetHighPrice"), decimals=2)
        analyst_target_low  = _fmt_usd(info.get("targetLowPrice"), decimals=2)
        analyst_count_raw   = info.get("numberOfAnalystOpinions")
        analyst_count       = str(int(analyst_count_raw)) if analyst_count_raw is not None else "N/A"
        recommendation      = info.get("recommendationKey", "N/A").capitalize() if info.get("recommendationKey") else "N/A"

        # Earnings growth (YoY) — proxy for whether earnings surprised to the upside or downside
        earnings_growth = _fmt_pct(info.get("earningsGrowth"), decimals=1)

        # Dividend data — computed here to avoid a second yfinance Ticker() call
        # in fetch_dividend_data when the dividend node runs later.
        dividend_data: Optional[Dict[str, Any]] = None
        try:
            dividend_data = _extract_dividend_data(t, info)
        except (TypeError, ValueError):
            pass

        # Pre-fetch sentiment data (news/recommendations) to avoid redundant
        # calls in the sentiment node.
        news = _extract_news_data(t)
        recommendations = _extract_recommendations_data(t)

        result = {
            "pe_trailing": _fmt_ratio(info.get("trailingPE")),
            "pe_forward": _fmt_ratio(info.get("forwardPE")),
            "revenue_growth_yoy": revenue_growth,
            "institutional_ownership": _fmt_pct(inst_pct, decimals=1),
            "current_price": _fmt_usd(current_price_raw, decimals=2),
            "week_52_high": _fmt_usd(info.get("fiftyTwoWeekHigh"), decimals=2),
            "week_52_low": _fmt_usd(info.get("fiftyTwoWeekLow"), decimals=2),
            "market_cap": market_cap,
            "beta": _fmt_ratio(info.get("beta"), decimals=2),
            "analyst_target_mean": analyst_target_mean,
            "analyst_target_high": analyst_target_high,
            "analyst_target_low": analyst_target_low,
            "analyst_count": analyst_count,
            "recommendation": recommendation,
            "earnings_growth": earnings_growth,
            "price_history": price_history,
            "dividend_data": dividend_data,
            "news": news,
            "recommendations": recommendations,
        }
        _cache_set(_yfinance_cache, cache_key, result)
        return result
    except Exception as exc:
        print(f"data_fetcher: fetch_research_data({ticker}) failed: {exc}", file=sys.stderr)
        return None


def fetch_sentiment_data(ticker: str) -> Optional[Dict[str, Any]]:
    """
    Return recent news headlines and analyst recommendation counts for *ticker*
    using yfinance. Used to ground the Sentiment Agent before any LLM call.

    Returns None on any failure so the sentiment agent can fall back gracefully.
    """
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}

        if not info or info.get("quoteType") is None:
            return None

        # Recent news headlines (up to 10)
        news_items = _extract_news_data(t)

        # Analyst recommendations — aggregate buy/hold/sell from last 3 months
        recommendations = _extract_recommendations_data(t)

        # Only return a result dict when at least some data was retrieved
        if not news_items and not recommendations:
            return None

        return {
            "news": news_items,
            "recommendations": recommendations,
        }
    except Exception as exc:
        print(f"data_fetcher: fetch_sentiment_data({ticker}) failed: {exc}", file=sys.stderr)
        return None
