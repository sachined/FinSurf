"""
SEC EDGAR data fetcher — recent 8-K filings (material events).

No API key required. Results cached 4 hours per ticker.
Returns None on any failure so agents degrade gracefully.
"""
import datetime
import re
import sys
from typing import Any, Dict, Optional

import requests

from ._cache import _cache_get, _cache_set


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