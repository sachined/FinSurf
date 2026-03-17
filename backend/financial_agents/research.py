"""
Research agent — equity analysis grounded by yfinance data.
"""
import json
import sys
from typing import Dict, Any, Optional
from ..llm_providers import call_gemini, call_groq
from ..data_fetcher import (
    calculate_pnl,
    fetch_price_on_date,
    fetch_research_data,
    fetch_finnhub_research,
    _price_from_history,
)
from ._helpers import _blocked_json
from .guardrail import security_guardrail


def research_agent(ticker: str, purchase_date: str = "", sell_date: str = "", skip_guardrail: bool = False, shares: float = 0.0) -> str:
    """Agent that performs general equity research using Gemini, grounded by yfinance data.

    Pre-fetches price, P/E ratios, revenue growth, market cap, beta, institutional
    ownership, and 1-year price history from yfinance so the LLM only needs to
    explain pre-verified numbers — reducing token usage and improving factual accuracy.
    Also fetches point-in-time closing prices for purchase_date and sell_date (any
    historical date, not limited to the 1-year chart window) and computes the shared
    pnl_summary via the calculate_pnl Tax Calculator tool so both Tax and Dividend
    agents can consume it from FinSurfState without re-fetching or duplicating arithmetic.
    Returns a JSON string: {content, citations, price_history, buy_price, sell_price, current_price, pnl_summary}.
    """
    if not skip_guardrail and not security_guardrail(ticker):
        return _blocked_json()

    fetched  = fetch_research_data(ticker)
    finnhub  = fetch_finnhub_research(ticker)
    price_history = fetched.get("price_history", []) if fetched else []
    dividend_data = fetched.get("dividend_data") if fetched else None

    buy_price = _price_from_history(price_history, purchase_date) if purchase_date else None
    if buy_price is None and purchase_date:
        buy_price = fetch_price_on_date(ticker, purchase_date)

    sell_price = _price_from_history(price_history, sell_date) if sell_date else None
    if sell_price is None and sell_date:
        sell_price = fetch_price_on_date(ticker, sell_date)

    current_price_raw: Optional[float] = None
    if fetched:
        try:
            raw = fetched.get("current_price", "N/A")
            current_price_raw = float(str(raw).replace("$", "").replace(",", "")) if raw != "N/A" else None
        except (ValueError, TypeError):
            pass

    if fetched:
        finnhub_lines = []
        if finnhub:
            if finnhub.get("earnings_surprise"):
                es = finnhub["earnings_surprise"]
                if es.get("surprise_pct") is not None:
                    direction = "beat" if es["surprise_pct"] >= 0 else "missed"
                    finnhub_lines.append(
                        f"- Last earnings ({es['period']}): {direction} estimate by {abs(es['surprise_pct']):.1f}%"
                        f" (actual {es['actual']} vs estimate {es['estimate']})"
                    )
            if finnhub.get("insider"):
                ins = finnhub["insider"]
                finnhub_lines.append(
                    f"- Insider activity (last 90 days): {ins['buy_count']} open-market buy(s), {ins['sell_count']} sell(s)"
                )
                for t in ins["recent"][:3]:
                    price_str = f" @ ${t['price']:.2f}" if t.get("price") else ""
                    finnhub_lines.append(f"  • {t['name']}: {t['action']} {t['shares']:,} shares{price_str} on {t['date']}")

        finnhub_block = ("\n" + "\n".join(finnhub_lines)) if finnhub_lines else ""
        insider_question = (
            "\n7. Insiders: Are company insiders net buyers or sellers over the last 90 days, and what does that signal?"
            if finnhub and finnhub.get("insider") else ""
        )
        insider_instruction = " Answer all 7 — do not skip any." if finnhub and finnhub.get("insider") else " Answer all 6 — do not skip any."

        data_block = f"""Here is current data for {ticker} retrieved from market data (do not re-fetch or guess — use only these numbers):
- Current Price: {fetched['current_price']}
- 52-Week High: {fetched['week_52_high']}
- 52-Week Low:  {fetched['week_52_low']}
- Market Cap:   {fetched['market_cap']}
- Beta:         {fetched['beta']}
- Trailing P/E: {fetched['pe_trailing']}
- Forward P/E:  {fetched['pe_forward']}
- Revenue growth (year over year): {fetched['revenue_growth_yoy']}
- Institutional ownership: {fetched['institutional_ownership']}
- Analyst consensus: {fetched['recommendation']} (based on {fetched['analyst_count']} analysts)
- Analyst price target: Low {fetched['analyst_target_low']} / Mean {fetched['analyst_target_mean']} / High {fetched['analyst_target_high']}
- Earnings growth (year over year): {fetched['earnings_growth']}{finnhub_block}
"""
        prompt = f"""{data_block}
Answer each of the points below using only the data above. Each answer must be exactly one sentence.{insider_instruction}

1. Price & Range: Is the stock near its 52-week high, low, or middle, and what does that signal?
2. Size & Volatility: What market cap tier is this (large/mid/small-cap), and is the beta calm, average, or volatile?
3. Valuation: Is the trailing P/E cheap, fair, or stretched, and does the forward P/E suggest the market expects improvement?
4. Growth: Is revenue growing, shrinking, or flat year-over-year?
5. Conviction: Does the combination of institutional ownership and analyst consensus signal confidence or caution?
6. Risk/Reward: How far is the analyst mean price target from the current price, and name the single biggest risk from these categories — valuation (P/E vs growth), debt/leverage, macro sensitivity (rates/cycle), competition, or regulatory?{insider_question}

For any N/A value, write "N/A" in the sentence — do not explain it.
Finish with one sentence verdict: is {ticker} worth further research for a retail investor, and what is the single most important factor (bullish or bearish) driving that view?

If {ticker} is not a recognised stock, say "Ticker Not Found" and stop."""
        max_tokens = 2048
    else:
        prompt = f"""Answer each of the 6 points below for {ticker}. Each answer must be exactly one sentence. Answer all 6 — do not skip any.

    1. Price & Range: Is the stock near its 52-week high, low, or middle, and what does that signal?
    2. Size & Volatility: What market cap tier is this (large/mid/small-cap), and is the beta calm, average, or volatile?
    3. Valuation: Is the trailing P/E cheap, fair, or stretched, and does the forward P/E suggest improvement?
    4. Growth: Is revenue growing, shrinking, or flat year-over-year?
    5. Conviction: Does institutional ownership and analyst consensus signal confidence or caution?
    6. Risk/Reward: How far is the analyst mean price target from the current price, and name the single biggest risk from: valuation (P/E vs growth), debt/leverage, macro sensitivity, competition, or regulatory?

    Use N/A for unavailable data.
    Finish with one sentence verdict: is {ticker} worth further research for a retail investor, and what is the single most important factor (bullish or bearish) driving that view?

    If {ticker} is not a recognised stock or company, say "Ticker Not Found" and stop.
    """
        max_tokens = 2048

    system = ("You are a concise stock research assistant for retail investors. "
              "You must answer every numbered point in the prompt — do not skip any. "
              "Each answer is one sentence only. Use plain English, no jargon, no filler phrases.")

    pnl = calculate_pnl(buy_price, sell_price, current_price_raw, shares, purchase_date, sell_date)

    envelope = {
        "citations": [],
        "price_history": price_history,
        "dividend_data": dividend_data,
        "buy_price": buy_price,
        "sell_price": sell_price,
        "current_price": current_price_raw,
        "pnl_summary": pnl,
        "news": fetched.get("news", []) if fetched else [],
        "recommendations": fetched.get("recommendations", {}) if fetched else {},
    }
    try:
        try:
            content = call_groq(prompt, system, max_tokens=max_tokens, agent="research")
        except Exception as groq_err:
            print(f"Groq research unavailable, falling back to Gemini: {groq_err}", file=sys.stderr)
            content = call_gemini(prompt, system, max_tokens=max_tokens, agent="research")
        return json.dumps({"content": content, **envelope})
    except Exception as e:
        print(f"Research analysis failed: {e}", file=sys.stderr)
        return json.dumps({"content": f"Research data unavailable: {e}", **envelope})