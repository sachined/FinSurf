"""
Social platform data fetchers — StockTwits and Alpha Vantage News Sentiment.

Both return None on any failure so the sentiment agent degrades gracefully.
"""
import os
import sys
from typing import Any, Dict, Optional

import requests

from ._cache import _cache_get, _cache_set


# ---------------------------------------------------------------------------
# StockTwits
# ---------------------------------------------------------------------------
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
# Alpha Vantage
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