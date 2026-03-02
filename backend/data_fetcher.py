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
            "annual_dividend_per_share": _fmt_usd(annual_div),
            "current_yield": _fmt_pct(info.get("dividendYield")),
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
    Return key fundamental metrics for *ticker* using yfinance.

    Returns None on any failure so the research agent can fall back to a
    full Perplexity/Gemini lookup.
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

        return {
            "pe_trailing": _fmt_ratio(info.get("trailingPE")),
            "pe_forward": _fmt_ratio(info.get("forwardPE")),
            "revenue_growth_yoy": revenue_growth,
            "institutional_ownership": _fmt_pct(inst_pct, decimals=1),
        }
    except Exception as exc:
        print(f"data_fetcher: fetch_research_data({ticker}) failed: {exc}", file=sys.stderr)
        return None
