"""
Social sentiment agent — market sentiment analysis grounded by yfinance data.
"""
import json
from typing import Dict, Any, Optional
from ..llm_providers import call_gemini
from ..data_fetcher import (
    fetch_sentiment_data,
    fetch_stocktwits_sentiment,
    fetch_alphavantage_sentiment,
    fetch_finnhub_sentiment,
    fetch_edgar_filings,
)
from ._helpers import _error_json, _perplexity_with_gemini_fallback
from ..retry_utils import with_guardrail


@with_guardrail
def social_sentiment_agent(ticker: str, skip_guardrail: bool = False, prefetched_data: Optional[Dict[str, Any]] = None) -> str:
    """Agent that analyzes market sentiment, grounded by yfinance data first.

    Data priority:
      1. Prefetched_data (provided by the graph node to save YF calls)
      2. Finance news headlines and analyst recommendations (free, no API key)
      3. StockTwits public stream — live bullish/bearish counts + recent posts (no key needed)
      4. Perplexity (live web search) — only called when yfinance data is thin
         AND no StockTwits data is available
      5. Gemini — fallback when Perplexity fails or is unavailable

    Returns a JSON string: {content, citations}.
    """
    yf_data = prefetched_data if prefetched_data else fetch_sentiment_data(ticker)
    stocktwits  = fetch_stocktwits_sentiment(ticker)
    av_news     = fetch_alphavantage_sentiment(ticker)
    finnhub     = fetch_finnhub_sentiment(ticker)
    edgar       = fetch_edgar_filings(ticker)

    news_items = yf_data.get("news", []) if yf_data else []
    recommendations = yf_data.get("recommendations", {}) if yf_data else {}

    has_enough_news = len(news_items) >= 3
    has_analyst_recs = bool(recommendations)
    has_social = bool(stocktwits or av_news or finnhub or edgar)
    # Skip Perplexity when live social/news-sentiment data compensates for thin yf data
    needs_llm = (not has_enough_news or not has_analyst_recs) and not has_social

    data_sections: list = []

    if news_items:
        headlines = "\n".join(
            f"  - [{item['publisher']}] {item['title']}" for item in news_items
        )
        data_sections.append(f"Recent news headlines for {ticker}:\n{headlines}")

    if recommendations:
        rec_parts = ", ".join(f"{k}: {v}" for k, v in recommendations.items())
        data_sections.append(f"Analyst recommendations (last 3 months) — {rec_parts}")

    if stocktwits:
        st_lines = [
            f"StockTwits — last 30 messages for {ticker}:",
            f"  Bullish: {stocktwits['bullish_count']} ({stocktwits['bullish_pct']}%)"
            if stocktwits['bullish_pct'] is not None else f"  Bullish: {stocktwits['bullish_count']}",
            f"  Bearish: {stocktwits['bearish_count']} ({stocktwits['bearish_pct']}%)"
            if stocktwits['bearish_pct'] is not None else f"  Bearish: {stocktwits['bearish_count']}",
        ]
        if stocktwits.get("posts"):
            st_lines.append("  Recent posts (sample):")
            st_lines.extend(f"    • {p}" for p in stocktwits["posts"])
        data_sections.append("\n".join(st_lines))

    if av_news:
        av_lines = [
            f"Alpha Vantage News Sentiment — {av_news['total_articles']} relevant articles for {ticker}:",
            f"  Bullish: {av_news['bullish_count']} ({av_news['bullish_pct']}%)"
            f"  |  Bearish: {av_news['bearish_count']} ({av_news['bearish_pct']}%)"
            f"  |  Neutral: {av_news['neutral_count']}",
        ]
        if av_news.get("articles"):
            av_lines.append("  Top articles:")
            for a in av_news["articles"][:5]:
                av_lines.append(f"    • [{a['source']}] {a['title']} → {a['sentiment']}")
        data_sections.append("\n".join(av_lines))

    if finnhub:
        fh_lines = [f"Finnhub News — {finnhub['total']} recent articles for {ticker}:"]
        for a in finnhub["articles"][:6]:
            fh_lines.append(f"  • [{a['source']}] [{a['date']}] {a['headline']}")
        data_sections.append("\n".join(fh_lines))

    if edgar:
        ed_lines = [f"SEC EDGAR — Recent 8-K filings for {edgar['company']}:"]
        for f in edgar["filings"]:
            ed_lines.append(f"  • [{f['date']}] {f['description']} → {f['url']}")
        data_sections.append("\n".join(ed_lines))

    data_block = "\n\n".join(data_sections)

    if data_block:
        structured_preamble = f"""The following data for '{ticker}' was retrieved from verified market data sources.
Use these facts as the foundation for your report — do not contradict them:

{data_block}

"""
    else:
        structured_preamble = ""

    table_rows = "| 📰 News | 🟢/🔴/🟡/— | one-line note |\n| 📊 Analysts | 🟢/🔴/🟡/— | one-line note |"
    if stocktwits:
        table_rows += "\n| 📣 StockTwits | 🟢/🔴/🟡/— | one-line note |"
    if av_news:
        table_rows += "\n| 📰 News Sentiment | 🟢/🔴/🟡/— | one-line note |"
    if finnhub:
        table_rows += "\n| 📡 Finnhub News | 🟢/🔴/🟡/— | one-line note |"
    if edgar:
        table_rows += "\n| 🏛 SEC Filings | 🟢/🔴/🟡/— | one-line note |"

    live = [s for s, v in [("StockTwits", stocktwits), ("News Sentiment", av_news), ("Finnhub", finnhub), ("SEC EDGAR", edgar)] if v]
    if not live:
        social_note = "\n*No live data feeds available — analysis based on web search.*"
    else:
        social_note = ""

    prompt = f"""{structured_preamble}Output a compact sentiment card for '{ticker}' (past 7 days). Use only the data provided above plus web search where needed. No padding.

Rules:
- '{ticker}' is a US stock ticker (e.g. 'T' = AT&T, 'F' = Ford). Do not confuse it with a common word.
- Ignore cryptocurrency. Focus only on this stock.
- If data for a source is unavailable, write "—" in the table.

**Overall Vibe: [Bullish 🟢 / Bearish 🔴 / Neutral 🟡]** (confidence: High / Medium / Low) — one sentence reason.

| Source | Signal | Key Note |
|---|---|---|
{table_rows}
{social_note}

**⚡ 2 Things to Watch**
- [specific near-term catalyst or risk: earnings date, rate decision, product launch, legal event — no generic observations]
- [specific near-term catalyst or risk]
"""
    system = ("You are a market sentiment analyst. Use provided structured data as ground truth; supplement with web search where needed. "
              "Plain language only. If data is unavailable for a platform, say so. Never cover cryptocurrency — focus only on the stock.")

    if needs_llm:
        return _perplexity_with_gemini_fallback(prompt, system, max_tokens=1200, agent="sentiment")
    else:
        try:
            content = call_gemini(prompt, system, max_tokens=1200, agent="sentiment")
            return _error_json(content)
        except Exception as e:
            print(f"Gemini sentiment failed, trying Perplexity: {e}")
            return _perplexity_with_gemini_fallback(prompt, system, max_tokens=1200, agent="sentiment")