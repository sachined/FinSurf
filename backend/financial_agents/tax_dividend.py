"""
Combined Tax + Dividend agent — single LLM call for tax, zero tokens for dividend narration.
"""
import json
from typing import Dict, Any, Optional
from ..data_fetcher import calculate_pnl, fetch_price_on_date
from ..utils import calculate_holding_status
from ._helpers import _BLOCKED_MSG, _blocked_json, _groq_with_gemini_fallback
from .guardrail import security_guardrail


def _narrate_dividend(
    ticker: str,
    shares: float,
    years: int,
    stats: Dict[str, Any],
    is_dividend_stock: bool,
    pnl_context: str = "",
) -> str:
    """
    Template-based dividend narration — zero LLM tokens.

    Generates plain-English analysis from verified stats without an LLM call.
    Uses deterministic templates and simple arithmetic for income projections.
    """
    if not is_dividend_stock:
        return (
            f"**{ticker}** does not currently pay dividends based on available market data. "
            f"For investors holding {shares} share(s), this means total return will depend entirely on price appreciation. "
            f"Some growth-focused companies reinvest profits instead of paying dividends, which can lead to higher stock prices over time."
        )

    adps = stats.get('annualDividendPerShare', 'N/A')
    current_yield = stats.get('currentYield', 'N/A')
    payout_ratio = stats.get('payoutRatio', 'N/A')
    five_year_growth = stats.get('fiveYearGrowthRate', 'N/A')
    frequency = stats.get('paymentFrequency', 'N/A')
    ex_date = stats.get('exDividendDate', 'N/A')
    consecutive = stats.get('consecutiveYears', 'N/A')

    sections = []

    safety_note = ""
    if payout_ratio != 'N/A':
        try:
            ratio_val = float(str(payout_ratio).replace('%', '').strip())
            if ratio_val > 90:
                safety_note = f"⚠️ **High payout ratio ({payout_ratio})** — dividend may be at risk if earnings decline."
            elif ratio_val > 70:
                safety_note = f"**Moderate payout ratio ({payout_ratio})** — dividend appears sustainable but has limited room for growth."
            else:
                safety_note = f"**Healthy payout ratio ({payout_ratio})** — dividend appears well-covered by earnings."
        except (ValueError, AttributeError):
            safety_note = f"Payout ratio: {payout_ratio}"

    if safety_note:
        sections.append(safety_note)

    if adps != 'N/A' and shares > 0:
        try:
            adps_val = float(str(adps).replace('$', '').replace(',', '').strip())
            annual_income = adps_val * shares

            conservative_total = sum(annual_income * (1.03 ** year) for year in range(years))
            optimistic_total = sum(annual_income * (1.07 ** year) for year in range(years))

            sections.append(
                f"**Income projection for {shares} share(s) over {years} year(s):**\n"
                f"- Conservative (3% growth): ${conservative_total:,.2f}\n"
                f"- Optimistic (7% growth): ${optimistic_total:,.2f}"
            )
        except (ValueError, AttributeError):
            sections.append(f"Annual dividend: {adps} per share ({frequency})")

    yield_note = f"Current yield: **{current_yield}**"
    if consecutive != 'N/A':
        yield_note += f" | {consecutive} consecutive years of dividends"
    sections.append(yield_note)

    if ex_date != 'N/A':
        sections.append(
            f"**Ex-dividend date:** {ex_date} — you must own shares before this date to receive the next payment."
        )

    if pnl_context:
        sections.append(pnl_context.strip())

    if current_yield != 'N/A' and five_year_growth != 'N/A':
        sections.append(
            f"**Summary:** {ticker} offers a {current_yield} yield with a {five_year_growth} 5-year average. "
            f"{'Dividend appears sustainable.' if 'Healthy' in safety_note or 'Moderate' in safety_note else 'Monitor dividend sustainability closely.'}"
        )

    return "\n\n".join(sections)


def tax_dividend_agent(
    ticker: str,
    purchase_date: str = "",
    sell_date: str = "",
    shares: float = 0.0,
    years: int = 3,
    pnl_summary: Optional[Dict[str, Any]] = None,
    dividend_data: Optional[Dict[str, Any]] = None,
    is_dividend_stock: bool = False,
    skip_guardrail: bool = False,
) -> tuple:
    """Combined tax + dividend agent — single LLM call (or zero for dividend-only).

    Makes one LLM call for tax analysis (when purchase_date is provided) and uses
    the template-based _narrate_dividend() for dividend output (zero LLM tokens).
    Returns (tax_output: str, dividend_output: dict) — same shapes as the individual
    agents so graph state and the frontend require no changes.
    """
    if not skip_guardrail and not security_guardrail(ticker):
        blocked = _blocked_json()
        return blocked, {"isDividendStock": False, "hasDividendHistory": False, "analysis": _BLOCKED_MSG}

    # ── Tax section ──────────────────────────────────────────────────────────
    if purchase_date:
        if pnl_summary is None:
            buy_price = fetch_price_on_date(ticker, purchase_date)
            sell_price = fetch_price_on_date(ticker, sell_date) if sell_date else None
            pnl_summary = calculate_pnl(buy_price, sell_price, None, shares, purchase_date, sell_date)

        bp = pnl_summary.get("buy_price")
        sp = pnl_summary.get("sell_price")
        rg = pnl_summary.get("realized_gain")
        rg_pct = pnl_summary.get("realized_gain_pct")

        pnl_block = ""
        if rg is not None and bp is not None and sp is not None:
            direction = "gain" if rg >= 0 else "loss"
            eff_shares = pnl_summary.get("shares") or shares
            if eff_shares and eff_shares > 0:
                pnl_block = (
                    f"\n**Realised P&L** ({eff_shares} share{'s' if eff_shares != 1 else ''}): "
                    f"Buy @ ${bp:,.4f} → Sell @ ${sp:,.4f} = "
                    f"${abs(rg):,.2f} {direction} ({rg_pct:+.2f}%)\n"
                )
            else:
                pnl_block = (
                    f"\n**Realised P&L** (per share): "
                    f"Buy @ ${bp:,.4f} → Sell @ ${sp:,.4f} = "
                    f"${abs(rg):,.4f} {direction} ({rg_pct:+.2f}%)\n"
                )

        status = calculate_holding_status(purchase_date, sell_date)
        tax_prompt = f"""Summarise the US capital gains tax situation for selling {ticker} after a {status} holding period.{pnl_block}
Output exactly this structure — no extra prose:

**Tax Summary**
| Item | Detail |
|---|---|
| Holding type | Short-term (<1 yr) or Long-term (≥1 yr) |
| Applicable tax | Ordinary income rates (short-term) OR preferential LTCG rates (long-term) |
| Rate range | Relevant IRS bracket range (0%/15%/20% for LT; 10–37% for ST) |
| Key rule | Single most important rule the investor should know |
| Estimated gain/loss | Dollar amount and % return (use Realised P&L above if provided, otherwise N/A) |

**Takeaway**
One sentence: what does this mean in plain English for this investor?

*⚠️ Consult a CPA or tax professional for advice specific to your situation.*"""
        tax_system = (
            "You are a concise tax education assistant for retail investors. "
            "Output only the requested table and takeaway — no introductions, no extra sections. "
            "Use plain English and IRS-accurate rates."
        )
        try:
            tax_content = _groq_with_gemini_fallback(tax_prompt, tax_system, max_tokens=1024, agent="tax")
            tax_output = json.dumps({"content": tax_content, "citations": []})
        except Exception as e:
            tax_output = json.dumps({"content": f"Tax analysis temporarily unavailable: {e}", "citations": []})
    else:
        tax_output = json.dumps({
            "content": (
                "### Tax Summary\n\nNo transaction dates provided. "
                "To see capital gains analysis, please enter a **Purchase Date** and **Sell Date**."
            ),
            "citations": [],
        })

    # ── Dividend section (template-based — zero LLM tokens) ──────────────────
    if is_dividend_stock and dividend_data:
        fetched = dividend_data
        pnl_block_div = ""
        if pnl_summary is not None:
            rg = pnl_summary.get("realized_gain")
            rg_pct = pnl_summary.get("realized_gain_pct")
            bp = pnl_summary.get("buy_price")
            sp = pnl_summary.get("sell_price")
            if rg is not None and bp is not None and sp is not None:
                direction = "gain" if rg >= 0 else "loss"
                pnl_block_div = (
                    f"\n**Realised P&L**: Buy @ ${bp:,.4f} → Sell @ ${sp:,.4f} "
                    f"= ${abs(rg):,.2f} {direction} ({rg_pct:+.2f}%) on {shares} share(s).\n"
                )

        stats = {
            "currentYield": fetched.get("current_yield", "N/A"),
            "annualDividendPerShare": fetched.get("annual_dividend_per_share", "N/A"),
            "payoutRatio": fetched.get("payout_ratio", "N/A"),
            "fiveYearGrowthRate": fetched.get("five_year_avg_yield", "N/A"),
            "paymentFrequency": fetched.get("payment_frequency", "N/A"),
            "exDividendDate": fetched.get("ex_dividend_date", "N/A"),
            "consecutiveYears": fetched.get("consecutive_years", "N/A"),
        }
        analysis = _narrate_dividend(ticker, shares, years, stats, True, pnl_block_div)

        try:
            adps_raw = fetched.get("annual_dividend_per_share", "N/A")
            adps = float(str(adps_raw).replace("$", "").replace(",", "")) if adps_raw != "N/A" else None
            if adps is not None and pnl_summary is not None:
                pnl_summary = dict(pnl_summary)
                pnl_summary["total_dividends"] = round(adps * float(shares) * float(years), 2)
        except (ValueError, TypeError):
            pass

        dividend_output: Dict[str, Any] = {
            "isDividendStock": True,
            "hasDividendHistory": fetched.get("has_history", False),
            "analysis": analysis,
            "stats": stats,
            "pnl_summary": pnl_summary,
        }
    else:
        dividend_output = {
            "isDividendStock": False,
            "hasDividendHistory": False,
            "analysis": f"### No Dividend Data\n\n**{ticker}** does not appear to pay dividends.",
        }

    return tax_output, dividend_output