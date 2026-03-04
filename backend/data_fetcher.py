"""
data_fetcher.py — Structured market data via yfinance.

Both public functions return None on any failure so callers can degrade
gracefully to a pure-LLM fallback without crashing.
"""
import sys
from typing import Optional, Dict, Any

import yfinance as yf


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
        import pandas as pd
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
    except Exception:
        return "N/A"


def _consecutive_dividend_years(dividends) -> str:
    """Count consecutive calendar years with at least one dividend payment."""
    try:
        if dividends is None or len(dividends) == 0:
            return "0"
        import pandas as pd
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
    except Exception:
        return "N/A"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def fetch_dividend_data(ticker: str) -> Optional[Dict[str, Any]]:
    """
    Return structured dividend data for *ticker* using yfinance.

    Returns None if yfinance is unavailable, the ticker is invalid, or any
    other error occurs — callers should fall back to a pure-LLM lookup.
    """
    try:
        t = yf.Ticker(ticker)
        info = t.info

        # An empty or minimal info dict means the ticker was not found.
        if not info or info.get("quoteType") is None:
            return None

        annual_div: Optional[float] = info.get("dividendRate") or info.get(
            "trailingAnnualDividendRate"
        )
        is_dividend_stock = bool(annual_div and float(annual_div) > 0)

        dividends = t.dividends
        has_history = dividends is not None and len(dividends) > 0

        # exDividendDate arrives as a Unix timestamp integer from yfinance
        ex_date_raw = info.get("exDividendDate")
        if ex_date_raw:
            try:
                import datetime
                ex_date = datetime.datetime.utcfromtimestamp(int(ex_date_raw)).strftime(
                    "%Y-%m-%d"
                )
            except Exception:
                ex_date = "N/A"
        else:
            ex_date = "N/A"

        return {
            "is_dividend_stock": is_dividend_stock,
            "has_history": has_history,
            "annual_dividend_per_share": _fmt_usd(annual_div, 2),
            "current_yield": (
                f"{info['dividendYield']:.2f}%"
                if info.get("dividendYield") is not None
                else "N/A"
            ),
            "payout_ratio": _fmt_pct(info.get("payoutRatio")),
            "five_year_avg_yield": (
                f"{info['fiveYearAvgDividendYield']:.2f}%"
                if info.get("fiveYearAvgDividendYield")
                else "N/A"
            ),
            "ex_dividend_date": ex_date,
            "payment_frequency": _infer_payment_frequency(dividends),
            "consecutive_years": _consecutive_dividend_years(dividends),
        }
    except Exception as exc:
        print(f"data_fetcher: fetch_dividend_data({ticker}) failed: {exc}", file=sys.stderr)
        return None


def fetch_research_data(ticker: str) -> Optional[Dict[str, Any]]:
    """
    Return key fundamental metrics and price history for *ticker* using yfinance.

    Returns None on any failure so the research agent can fall back to a
    full Gemini lookup.
    """
    try:
        t = yf.Ticker(ticker)
        info = t.info

        if not info or info.get("quoteType") is None:
            return None

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
        except Exception:
            pass

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

        # 1-year daily price history for chart rendering
        price_history: list = []
        try:
            hist = t.history(period="1y")
            if hist is not None and not hist.empty:
                price_history = [
                    {"date": str(idx.date()), "close": round(float(row["Close"]), 4)}
                    for idx, row in hist.iterrows()
                ]
        except Exception:
            pass

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
            annual_div = info.get("dividendRate") or info.get("trailingAnnualDividendRate")
            is_div_stock = bool(annual_div and float(annual_div) > 0)
            dividends = t.dividends
            has_history = dividends is not None and len(dividends) > 0

            ex_date_raw = info.get("exDividendDate")
            if ex_date_raw:
                try:
                    import datetime
                    ex_date = datetime.datetime.utcfromtimestamp(int(ex_date_raw)).strftime("%Y-%m-%d")
                except Exception:
                    ex_date = "N/A"
            else:
                ex_date = "N/A"

            dividend_data = {
                "is_dividend_stock": is_div_stock,
                "has_history": has_history,
                "annual_dividend_per_share": _fmt_usd(annual_div, 2),
                "current_yield": (
                    f"{info['dividendYield']:.2f}%"
                    if info.get("dividendYield") is not None
                    else "N/A"
                ),
                "payout_ratio": _fmt_pct(info.get("payoutRatio")),
                "five_year_avg_yield": (
                    f"{info['fiveYearAvgDividendYield']:.2f}%"
                    if info.get("fiveYearAvgDividendYield")
                    else "N/A"
                ),
                "ex_dividend_date": ex_date,
                "payment_frequency": _infer_payment_frequency(dividends),
                "consecutive_years": _consecutive_dividend_years(dividends),
            }
        except Exception as div_exc:
            print(f"data_fetcher: dividend sub-fetch for {ticker} failed: {div_exc}", file=sys.stderr)

        return {
            "pe_trailing": _fmt_ratio(info.get("trailingPE")),
            "pe_forward": _fmt_ratio(info.get("forwardPE")),
            "revenue_growth_yoy": revenue_growth,
            "institutional_ownership": _fmt_pct(inst_pct, decimals=1),
            "current_price": _fmt_usd(info.get("currentPrice") or info.get("regularMarketPrice"), decimals=2),
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
        }
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
        import pandas as pd
        t = yf.Ticker(ticker)
        info = t.info

        if not info or info.get("quoteType") is None:
            return None

        # Recent news headlines (up to 10)
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
        except Exception:
            pass

        # Analyst recommendations — aggregate buy/hold/sell from last 3 months
        recommendations: Dict[str, int] = {}
        try:
            rec = t.recommendations
            if rec is not None and not rec.empty:
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
        except Exception:
            pass

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

def fetch_stocktwits_sentiment(ticker: str) -> Optional[Dict[str, Any]]:
    """Return StockTwits sentiment data for *ticker*.

    TODO: Integrate the StockTwits public API
          (https://api.stocktwits.com/api/2/streams/symbol/{ticker}.json)
          and return a dict with keys: {bullish_count, bearish_count, posts}.
    """
    return None


def fetch_reddit_sentiment(ticker: str) -> Optional[Dict[str, Any]]:
    """Return Reddit sentiment data for *ticker*.

    TODO: Integrate Reddit API (PRAW or pushshift) to fetch posts from
          r/stocks, r/investing, r/wallstreetbets mentioning *ticker*,
          and return a dict with keys: {posts, upvote_ratio, sentiment_label}.
    """
    return None


def fetch_twitter_sentiment(ticker: str) -> Optional[Dict[str, Any]]:
    """Return X/Twitter sentiment data for *ticker*.

    TODO: Integrate the X/Twitter API v2 (Tweepy or httpx) to search recent
          tweets mentioning ${ticker}, and return a dict with keys:
          {tweets, positive_count, negative_count, neutral_count}.
    """
    return None
