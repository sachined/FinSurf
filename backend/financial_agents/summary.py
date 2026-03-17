"""
Executive summary agent — assembles a cohesive brief from all specialist agents.
"""
import json
from typing import Dict, Any, Optional


def executive_summary_agent(
    ticker: str,
    research_output: Optional[str] = None,
    tax_output: Optional[str] = None,
    sentiment_output: Optional[str] = None,
    dividend_output: Optional[Any] = None,
    pnl_summary: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Template-based summary using pre-computed state — zero LLM tokens.

    Composes a structured summary from existing agent outputs without an
    additional LLM call, extracting key insights from each specialist.
    """

    def _extract(raw: Optional[str]) -> str:
        if not raw:
            return "No data available."
        try:
            return json.loads(raw).get("content") or raw
        except Exception:
            return raw

    def _extract_verdict(text: str, max_sentences: int = 2) -> str:
        if not text or text == "No data available.":
            return ""
        sentences = [s.strip() for s in text.split('.') if s.strip()]
        return '. '.join(sentences[-max_sentences:]) + '.' if sentences else ""

    research_text  = _extract(research_output)
    tax_text       = _extract(tax_output)
    sentiment_text = _extract(sentiment_output)

    dividend_text = ""
    if dividend_output and isinstance(dividend_output, dict):
        dividend_text = dividend_output.get("analysis", "")

    summary_parts = []

    # 1. P&L Context
    if pnl_summary:
        rg  = pnl_summary.get("realized_gain")
        rp  = pnl_summary.get("realized_gain_pct")
        ug  = pnl_summary.get("unrealized_gain")
        up  = pnl_summary.get("unrealized_gain_pct")
        lt  = pnl_summary.get("is_long_term")
        td  = pnl_summary.get("total_dividends")

        if rg is not None and rp is not None:
            term = "long-term" if lt else "short-term"
            direction = "gain" if rg >= 0 else "loss"
            summary_parts.append(
                f"**Position:** Realized ${abs(rg):,.2f} {direction} ({rp:+.2f}%) on this {term} position."
            )
        elif ug is not None and up is not None:
            direction = "gain" if ug >= 0 else "loss"
            summary_parts.append(
                f"**Position:** Currently showing ${abs(ug):,.2f} unrealized {direction} ({up:+.2f}%)."
            )

        if td is not None and td > 0:
            summary_parts.append(
                f"Estimated dividend income: ${td:,.2f} over the projection period."
            )

    # 2. Research Verdict
    research_verdict = _extract_verdict(research_text, max_sentences=1)
    if research_verdict and research_verdict != "No data available.":
        summary_parts.append(f"**Fundamentals:** {research_verdict}")

    # 3. Tax Implications
    if "Takeaway" in tax_text:
        after = tax_text.split("Takeaway")[-1]
        tax_takeaway = next((l.strip() for l in after.split('\n') if l.strip().strip('*')), "")
        if tax_takeaway:
            summary_parts.append(f"**Tax:** {tax_takeaway}")
    elif tax_text and tax_text != "No data available.":
        tax_verdict = _extract_verdict(tax_text, max_sentences=1)
        if tax_verdict:
            summary_parts.append(f"**Tax:** {tax_verdict}")

    # 4. Market Sentiment
    if "Overall Vibe" in sentiment_text:
        for line in sentiment_text.split('\n'):
            if "Overall Vibe" in line:
                summary_parts.append(f"**Sentiment:** {line.strip()}")
                break
    elif sentiment_text and sentiment_text != "No data available.":
        sent_verdict = _extract_verdict(sentiment_text, max_sentences=1)
        if sent_verdict:
            summary_parts.append(f"**Sentiment:** {sent_verdict}")

    # 5. Dividend Summary
    if dividend_text and "does not" not in dividend_text.lower():
        div_verdict = _extract_verdict(dividend_text, max_sentences=1)
        if div_verdict:
            summary_parts.append(f"**Dividends:** {div_verdict}")

    if summary_parts:
        content = "## Executive Summary\n\n" + "\n\n".join(summary_parts)
    else:
        content = f"## Executive Summary\n\nAnalysis for **{ticker}** is complete. Review individual agent reports above for detailed insights."

    return json.dumps({"content": content, "citations": []})