"""
Finnhub data fetchers — company news, insider transactions, earnings surprises.

All functions require FINNHUB_API_KEY env var (free tier: 60 req/min).
Both return None on any failure so callers degrade gracefully.
"""
import datetime
import os
import sys
from typing import Any, Dict, Optional

import requests

from ._cache import _cache_get, _cache_set


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
                    "date":     datetime.datetime.fromtimestamp(a["datetime"], datetime.UTC).strftime("%Y-%m-%d") if a.get("datetime") else "",
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