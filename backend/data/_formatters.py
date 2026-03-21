"""
Display-formatting helpers and dividend-period utilities.

All functions are pure (no I/O, no network) and depend only on stdlib + pandas.
"""
import pandas as pd
from typing import Optional


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
