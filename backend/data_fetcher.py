"""
data_fetcher.py — Structured market data via yfinance.

Both public functions return None on any failure so callers can degrade
gracefully to a pure-LLM fallback without crashing.

Also exposes the shared Tax Calculator tool: ``calculate_pnl``.
"""
import datetime
import os
import re
import sys

import pandas as pd
import requests
from typing import Optional, Dict, Any

import yfinance as yf


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

def _fmt_pct(value: Optional[float], decimals: int = 2) -> str:
    """Format a decimal fraction as a percentage string (0.035 → '3.50%')."""
    if value is None:
        return "N/A"
    try:
        return f"{float(value) * 100:.{decimals}f}%"
    except (TypeError, ValueError):
        return "N/A"


def _fmt_usd(value: Optional[float], decimals: int = 4) -> str:
    """Format a dollar amount (1.23456 → '$1.2346')."""
    if value is None:
        return "N/A"
    try:
        return f"${float(value):.{decimals}f}"
    except (TypeError, ValueError):
        return "N/A"


def _fmt_ratio(value: Optional[float], decimals: int = 2) -> str:
    """Format a plain ratio or multiple (24.5 → '24.50x')."""
    if value is None:
        return "N/A"
    try:
        return f"{float(value):.{decimals}f}x"
    except (TypeError, ValueError):
        return "N/A"


def _infer_payment_frequency(dividends) -> str:
    """Estimate payment frequency from the last 12 months of dividend history."""
    try:
        if dividends is None or len(dividends) == 0:
            return "N/A"

        one_year_ago = pd.Timestamp.now(tz="UTC") - pd.DateOffset(years=1)
        recent = dividends[dividends.index >= one_year_ago]
        count = len(recent)
        if count >= 11:
            return "Monthly"
        if count >= 3:
            return "Quarterly"
        if count >= 2:
            return "Semi-annual"
        if count == 1:
            return "Annual"
        return "N/A"
    except (TypeError, ValueError, KeyError, IndexError):
        return "N/A"


def _consecutive_dividend_years(dividends) -> str:
    """Count consecutive calendar years with at least one dividend payment."""
    try:
        if dividends is None or len(dividends) == 0:
            return "0"

        annual = dividends.resample("YE").sum()
        paying_years = sorted(
            [y.year for y, v in annual.items() if v > 0], reverse=True
        )
        if not paying_years:
            return "0"
        count = 1
        for i in range(1, len(paying_years)):
            if paying_years[i - 1] - paying_years[i] == 1:
                count += 1
            else:
                break
        return str(count)
    except (ValueError, KeyError, IndexError, TypeError):
        return "N/A"


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


# ---------------------------------------------------------------------------
# YFinance caching — avoid redundant API calls for the same ticker
# ---------------------------------------------------------------------------
_yfinance_cache: Dict[str, Dict[str, Any]] = {}
_YFINANCE_TTL = 60 * 15  # 15 minutes for price data
_YFINANCE_FUNDAMENTALS_TTL = 60 * 60 * 24  # 24 hours for fundamentals


def _cache_get(cache: Dict[str, Dict[str, Any]], key: str, ttl: float) -> Optional[Dict[str, Any]]:
    """Return cached entry if present and within TTL, else None."""
    entry = cache.get(key)
    if entry and (datetime.datetime.utcnow().timestamp() - entry["_ts"] < ttl):
        return {k: v for k, v in entry.items() if k != "_ts"}
    return None


def _cache_set(cache: Dict[str, Dict[str, Any]], key: str, data: Dict[str, Any]) -> None:
    """Store data in cache with the current timestamp."""
    cache[key] = {**data, "_ts": datetime.datetime.now(datetime.UTC).timestamp()}


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
        # yfinance sometimes returns a MultiIndex column (ticker, "Close")
        close = _extract_last_close(past)

        return round(float(close), 4)
    except ValueError:
        return None

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


# ---------------------------------------------------------------------------
# Social platform stubs — wired for future API integrations
# ---------------------------------------------------------------------------

# StockTwits in-process cache: avoid re-fetching the same ticker within 1 hour
# and stay well inside the 200 req/hour unauthenticated rate limit.
_stocktwits_cache: Dict[str, Dict[str, Any]] = {}
_STOCKTWITS_TTL = 60 * 60  # 1 hour in seconds


def fetch_stocktwits_sentiment(ticker: str) -> Optional[Dict[str, Any]]:
    """Return StockTwits sentiment data for *ticker* using the public symbol stream.

    No API key required. Rate limit: 200 requests/hour unauthenticated.
    Results are cached for 1 hour per ticker to stay well within that limit.
    Returns None on any failure so the sentiment agent degrades gracefully.
    """
    key = ticker.upper()
    cached = _cache_get(_stocktwits_cache, key, _STOCKTWITS_TTL)
    if cached:
        return cached

    try:
        url = f"https://api.stocktwits.com/api/2/streams/symbol/{key}.json"
        resp = requests.get(url, timeout=8, headers={"User-Agent": "FinSurf/1.0"})
        if resp.status_code != 200:
            print(f"StockTwits: non-200 for {ticker}: {resp.status_code}", file=sys.stderr)
            return None

        messages = resp.json().get("messages", [])
        if not messages:
            return None

        bullish = 0
        bearish = 0
        posts: list[str] = []

        for msg in messages:
            sentiment = (
                msg.get("entities", {})
                   .get("sentiment", {}) or {}
            ).get("basic")

            if sentiment == "Bullish":
                bullish += 1
            elif sentiment == "Bearish":
                bearish += 1

            # Collect up to 8 recent post snippets for the LLM
            if len(posts) < 8:
                body = msg.get("body", "").strip()
                if body:
                    posts.append(body)

        total = bullish + bearish
        bullish_pct = round(bullish / total * 100) if total else None
        bearish_pct = round(bearish / total * 100) if total else None

        result = {
            "bullish_count": bullish,
            "bearish_count": bearish,
            "bullish_pct": bullish_pct,
            "bearish_pct": bearish_pct,
            "total_with_sentiment": total,
            "posts": posts,
        }
        _cache_set(_stocktwits_cache, key, result)
        return result
    except Exception as exc:
        print(f"StockTwits fetch failed for {ticker}: {exc}", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# Alpha Vantage — News & Sentiment
# ---------------------------------------------------------------------------

_av_cache: Dict[str, Dict[str, Any]] = {}
_AV_TTL = 60 * 60  # 1 hour — free tier is 25 calls/day, cache aggressively


def fetch_alphavantage_sentiment(ticker: str) -> Optional[Dict[str, Any]]:
    """Return news sentiment data for *ticker* from Alpha Vantage NEWS_SENTIMENT.

    Each article is pre-scored with a ticker-specific sentiment label
    (Bullish / Somewhat-Bullish / Neutral / Somewhat-Bearish / Bearish)
    and a relevance score.  Only articles with relevance >= 0.3 are counted.

    Requires ALPHA_VANTAGE_API_KEY env var.
    Results cached for 1 hour to stay within the free-tier limit (25 calls/day).
    Returns None on any failure so the sentiment agent degrades gracefully.
    """
    key = ticker.upper()
    cached = _cache_get(_av_cache, key, _AV_TTL)
    if cached:
        return cached

    api_key = os.environ.get("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        return None

    try:
        resp = requests.get(
            "https://www.alphavantage.co/query",
            params={
                "function": "NEWS_SENTIMENT",
                "tickers": key,
                "sort": "RELEVANCE",
                "limit": 20,
                "apikey": api_key,
            },
            timeout=10,
        )
        if resp.status_code != 200:
            print(f"Alpha Vantage error for {ticker}: {resp.status_code}", file=sys.stderr)
            return None

        data = resp.json()

        # Rate-limit or info messages come back as {"Information": "..."} / {"Note": "..."}
        if "Information" in data or "Note" in data:
            print(f"Alpha Vantage rate limit reached for {ticker}", file=sys.stderr)
            return None

        feed = data.get("feed", [])
        if not feed:
            return None

        bullish = bearish = neutral = 0
        articles: list[Dict[str, Any]] = []

        for article in feed:
            # Find the sentiment entry specific to this ticker
            ticker_sentiment = next(
                (ts for ts in article.get("ticker_sentiment", []) if ts.get("ticker") == key),
                None,
            )
            if not ticker_sentiment:
                continue

            relevance = float(ticker_sentiment.get("relevance_score", 0))
            if relevance < 0.3:
                continue  # article barely mentions this ticker — skip

            label = ticker_sentiment.get("ticker_sentiment_label", "Neutral")
            if "Bullish" in label:
                bullish += 1
            elif "Bearish" in label:
                bearish += 1
            else:
                neutral += 1

            if len(articles) < 8:
                articles.append({
                    "title":     article.get("title", ""),
                    "source":    article.get("source", ""),
                    "sentiment": label,
                    "summary":   article.get("summary", "")[:200],
                })

        total = bullish + bearish + neutral
        if total == 0:
            return None

        result: Dict[str, Any] = {
            "bullish_count":  bullish,
            "bearish_count":  bearish,
            "neutral_count":  neutral,
            "total_articles": total,
            "bullish_pct":    round(bullish / total * 100) if total else None,
            "bearish_pct":    round(bearish / total * 100) if total else None,
            "articles":       articles,
        }
        _cache_set(_av_cache, key, result)
        return result

    except Exception as exc:
        print(f"Alpha Vantage fetch failed for {ticker}", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# Finnhub — Company news, insider transactions, earnings surprises
# ---------------------------------------------------------------------------

_finnhub_cache: Dict[str, Dict[str, Any]] = {}
_FINNHUB_TTL = 60 * 30  # 30 minutes


def fetch_finnhub_sentiment(ticker: str) -> Optional[Dict[str, Any]]:
    """Return recent company news from Finnhub for the sentiment agent.

    Requires FINNHUB_API_KEY env var (free tier: 60 req/min).
    Returns None on any failure so the sentiment agent degrades gracefully.
    """
    api_key = os.environ.get("FINNHUB_API_KEY")
    if not api_key:
        return None

    cache_key = f"fh_news_{ticker.upper()}"
    cached = _cache_get(_finnhub_cache, cache_key, _FINNHUB_TTL)
    if cached:
        return cached

    today = datetime.date.today()
    from_date = (today - datetime.timedelta(days=30)).isoformat()

    try:
        resp = requests.get(
            "https://finnhub.io/api/v1/company-news",
            params={"symbol": ticker.upper(), "from": from_date, "to": today.isoformat(), "token": api_key},
            timeout=8,
        )
        if resp.status_code != 200:
            return None

        raw = resp.json()
        if not raw:
            return None

        articles = sorted(raw, key=lambda x: x.get("datetime", 0), reverse=True)[:8]
        result: Dict[str, Any] = {
            "articles": [
                {
                    "headline": a.get("headline", ""),
                    "source":   a.get("source", ""),
                    "date":     datetime.datetime.utcfromtimestamp(a["datetime"]).strftime("%Y-%m-%d") if a.get("datetime") else "",
                    "url":      a.get("url", ""),
                    "summary":  (a.get("summary") or "")[:200],
                }
                for a in articles
            ],
            "total": len(articles),
        }
        _cache_set(_finnhub_cache, cache_key, result)
        return result

    except Exception as exc:
        print(f"Finnhub news fetch failed for {ticker}: {exc}", file=sys.stderr)
        return None


def fetch_finnhub_research(ticker: str) -> Optional[Dict[str, Any]]:
    """Return insider transactions and last earnings surprise from Finnhub.

    Used by the research agent to surface insider buying/selling activity
    and whether the company beat or missed its last earnings estimate.

    Requires FINNHUB_API_KEY env var.
    Returns None when the key is absent or both sub-fetches fail.
    """
    api_key = os.environ.get("FINNHUB_API_KEY")
    if not api_key:
        return None

    cache_key = f"fh_research_{ticker.upper()}"
    cached = _cache_get(_finnhub_cache, cache_key, _FINNHUB_TTL)
    if cached:
        return cached

    result: Dict[str, Any] = {}

    # --- Insider transactions (last 90 days) ---
    try:
        from_date = (datetime.date.today() - datetime.timedelta(days=90)).isoformat()
        resp = requests.get(
            "https://finnhub.io/api/v1/stock/insider-transactions",
            params={"symbol": ticker.upper(), "from": from_date, "token": api_key},
            timeout=8,
        )
        if resp.status_code == 200:
            transactions = resp.json().get("data", [])
            buys  = [t for t in transactions if t.get("transactionCode") == "P"]
            sells = [t for t in transactions if t.get("transactionCode") == "S"]
            if transactions:
                recent = sorted(transactions, key=lambda x: x.get("transactionDate", ""), reverse=True)[:5]
                result["insider"] = {
                    "buy_count":  len(buys),
                    "sell_count": len(sells),
                    "recent": [
                        {
                            "name":   t.get("name", ""),
                            "action": "Buy" if t.get("transactionCode") == "P" else "Sell",
                            "shares": abs(t.get("change", 0)),
                            "price":  t.get("transactionPrice"),
                            "date":   t.get("transactionDate", ""),
                        }
                        for t in recent
                    ],
                }
    except Exception as exc:
        print(f"Finnhub insider fetch failed for {ticker}: {exc}", file=sys.stderr)

    # --- Last earnings surprise ---
    try:
        resp = requests.get(
            "https://finnhub.io/api/v1/stock/earnings",
            params={"symbol": ticker.upper(), "limit": "4", "token": api_key},
            timeout=8,
        )
        if resp.status_code == 200:
            earnings = resp.json()
            if earnings:
                last = earnings[0]
                result["earnings_surprise"] = {
                    "period":       last.get("period", ""),
                    "actual":       last.get("actual"),
                    "estimate":     last.get("estimate"),
                    "surprise_pct": last.get("surprisePercent"),
                }
    except Exception as exc:
        print(f"Finnhub earnings fetch failed for {ticker}: {exc}", file=sys.stderr)

    if not result:
        return None

    _cache_set(_finnhub_cache, cache_key, result)
    return result


# ---------------------------------------------------------------------------
# SEC EDGAR — Recent 8-K filings (material events)
# ---------------------------------------------------------------------------

_edgar_cache: Dict[str, Dict[str, Any]] = {}
_EDGAR_TTL = 60 * 60 * 4  # 4 hours — regulatory filings don't change frequently

# SEC requires a descriptive User-Agent with a contact address.
_EDGAR_HEADERS = {"User-Agent": "FinSurf/1.0 (research tool; contact@finsurf.app)"}


def _get_edgar_cik(ticker: str) -> Optional[str]:
    """Return the 10-digit CIK string for a given ticker, or None."""
    try:
        resp = requests.get(
            "https://www.sec.gov/cgi-bin/browse-edgar",
            params={
                "action": "getcompany", "ticker": ticker.upper(),
                "type": "8-K", "owner": "include", "count": "1", "output": "atom",
            },
            headers=_EDGAR_HEADERS,
            timeout=8,
        )
        if resp.status_code != 200:
            return None
        match = re.search(r"CIK(\d+)", resp.text)
        return match.group(1) if match else None
    except Exception:
        return None


def fetch_edgar_filings(ticker: str) -> Optional[Dict[str, Any]]:
    """Return recent 8-K filings for ticker from SEC EDGAR.

    8-K forms disclose material events: M&A, leadership changes, earnings
    releases, guidance updates, restatements, etc. — high-signal inputs for
    both pre-trade and post-trade analysis.

    No API key required. Results cached 4 hours per ticker.
    Returns None on any failure so agents degrade gracefully.
    """
    cache_key = ticker.upper()
    cached = _cache_get(_edgar_cache, cache_key, _EDGAR_TTL)
    if cached:
        return cached

    cik = _get_edgar_cik(ticker)
    if not cik:
        return None

    try:
        padded_cik = cik.zfill(10)
        resp = requests.get(
            f"https://data.sec.gov/submissions/CIK{padded_cik}.json",
            headers=_EDGAR_HEADERS,
            timeout=10,
        )
        if resp.status_code != 200:
            return None

        data = resp.json()
        recent = data.get("filings", {}).get("recent", {})
        forms       = recent.get("form", [])
        dates       = recent.get("filingDate", [])
        accessions  = recent.get("accessionNumber", [])
        descriptions = recent.get("primaryDocDescription", [])

        cutoff = (datetime.date.today() - datetime.timedelta(days=60)).isoformat()
        filings = []
        for form, date, acc, desc in zip(forms, dates, accessions, descriptions):
            if form != "8-K" or date < cutoff:
                continue
            acc_clean = acc.replace("-", "")
            filings.append({
                "date":        date,
                "description": desc or "Material Event",
                "url":         f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc_clean}/{acc}-index.htm",
            })
            if len(filings) >= 6:
                break

        if not filings:
            return None

        result = {"company": data.get("name", ticker.upper()), "filings": filings}
        _cache_set(_edgar_cache, cache_key, result)
        return result

    except Exception as exc:
        print(f"SEC EDGAR fetch failed for {ticker}: {exc}", file=sys.stderr)
        return None
