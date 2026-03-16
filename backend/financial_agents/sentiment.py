"""
Social sentiment agent — market sentiment analysis grounded by yfinance data.
"""
import json
from typing import Dict, Any, Optional
from ..llm_providers import call_gemini
from ..data_fetcher import (
    fetch_sentiment_data,
    fetch_stocktwits_sentiment,
    fetch_reddit_sentiment,
    fetch_twitter_sentiment,
)
from ._helpers import _blocked_json, _perplexity_with_gemini_fallback
from .guardrail import security_guardrail


def social_sentiment_agent(ticker: str, skip_guardrail: bool = False, prefetched_data: Optional[Dict[str, Any]] = None) -> str:
    """Agent that analyzes market sentiment, grounded by yfinance data first.

    Data priority:
      1. Prefetched_data (provided by the graph node to save YF calls)
      2. Finance news headlines and analyst recommendations (free, no API key)
      3. Social platform stubs: StockTwits, Reddit, X/Twitter (return None until wired)
      4. Perplexity (live web search) — only called when yfinance data is thin
         (fewer than 3 headlines OR no analyst recommendations)
      5. Gemini — fallback when Perplexity fails or is unavailable

    Returns a JSON string: {content, citations}.
    """
    if not skip_guardrail and not security_guardrail(ticker):
        return _blocked_json()

    yf_data = prefetched_data if prefetched_data else fetch_sentiment_data(ticker)
    stocktwits = fetch_stocktwits_sentiment(ticker)
    reddit = fetch_reddit_sentiment(ticker)
    twitter = fetch_twitter_sentiment(ticker)

    news_items = yf_data.get("news", []) if yf_data else []
    recommendations = yf_data.get("recommendations", {}) if yf_data else {}

    has_enough_news = len(news_items) >= 3
    has_analyst_recs = bool(recommendations)
    needs_llm = not has_enough_news or not has_analyst_recs

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
        data_sections.append(f"StockTwits data: {stocktwits}")

    if reddit:
        data_sections.append(f"Reddit data: {reddit}")

    if twitter:
        data_sections.append(f"X/Twitter data: {twitter}")

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
    if reddit:
        table_rows += "\n| 💬 Reddit | 🟢/🔴/🟡/— | one-line note |"
    if twitter:
        table_rows += "\n| 🐦 X/Twitter | 🟢/🔴/🟡/— | one-line note |"

    social_note = (
        "\n*Social signals (Reddit, StockTwits, X/Twitter) not yet available from direct feeds.*"
        if not (stocktwits or reddit or twitter)
        else ""
    )

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
            return json.dumps({"content": content, "citations": []})
        except Exception as e:
            print(f"Gemini sentiment failed, trying Perplexity: {e}")
            return _perplexity_with_gemini_fallback(prompt, system, max_tokens=1200, agent="sentiment")