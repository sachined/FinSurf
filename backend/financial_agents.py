import json
import sys
import os
from typing import Dict, Any
from .llm_providers import call_gemini, call_openai, call_anthropic, call_perplexity
from .utils import calculate_holding_status, extract_json, is_placeholder

def research_agent(ticker: str) -> str:
    """Agent that performs general equity research using Perplexity with Gemini fallback."""
    prompt = f"Briefly research {ticker}: performance, metrics, sentiment. If {ticker} does not look like a standard stock ticker, try to find the company it might represent."
    system = "Equity analyst. Concise, data-driven. Cite sources. If the provided ticker is invalid, suggest the closest matching company."
    try:
        return call_perplexity(prompt, system)
    except Exception as e:
        print(f"Perplexity failed, falling back to Gemini: {e}", file=sys.stderr)
        content = call_gemini(prompt, system)
        return json.dumps({"content": content, "citations": []})

def tax_agent(ticker: str, purchase_date: str, sell_date: str) -> str:
    """Agent that provides tax implications analysis using Anthropic with Gemini fallback."""
    status = calculate_holding_status(purchase_date, sell_date)
    prompt = f"""Analyze the tax implications for {ticker} bought on {purchase_date} and sold on {sell_date}.
    CRITICAL: The holding period has been calculated as {status}.
    STRICT REQUIREMENTS:
    1. Use the status provided above ({status}) as the absolute truth.
    2. ONLY discuss the category that applies. If it is Long-Term, do NOT mention short-term rules or rates. If it is Short-Term, do NOT mention long-term rules or rates.
    3. Provide exactly 2 BRIEF bullet points for 'Key Characteristics'.
    4. Provide exactly 2 BRIEF bullet points for 'Tax Liability Summary' with estimated tax rates for the applicable category only.
    5. Use Markdown headers and bullet points for clarity.
    """
    system = f"US Tax specialist. The transaction is {status}. Provide extremely concise advice for this specific category only. Do not contradict the provided status."
    try:
        return call_anthropic(prompt, system)
    except Exception as e:
        print(f"Anthropic failed, falling back to Gemini: {e}", file=sys.stderr)
        return call_gemini(prompt, system)

def social_sentiment_agent(ticker: str) -> str:
    """Agent that analyzes market sentiment using Perplexity with Gemini fallback."""
    prompt = f"""Search Reddit, X (Twitter), StockTwits, and major financial news websites (e.g., Bloomberg, Reuters, CNBC) for recent (last 7 days) discussions and sentiment about the stock ticker or company '{ticker}'. 
    STRICT REQUIREMENTS:
    1. The symbol '{ticker}' refers to a stock market ticker (e.g., 'T' is AT&T, 'F' is Ford) or a well-known company name. Do NOT confuse it with generic words or other entities.
    2. PRIORITIZE sources known for reliable financial sentiment analysis like StockTwits and reputable financial news outlets.
    3. STRICTLY EXCLUDE any cryptocurrency-related discussions or sentiment. Focus only on the equity/stock market.
    REQUIRED FORMAT:
    1. Summarize the overall sentiment (Bullish, Bearish, or Neutral) across all sources.
    2. Highlight the key reasons for this sentiment, distinguishing between retail (social media) and professional (news) perspectives.
    3. Mention specific trending topics or concerns.
    4. At the end, provide 1 or 2 specific, representative comments, tweets, or headlines that best convey the current sentiment.
    """
    system = "Financial Sentiment Analyst. You specialize in tracking both retail investor sentiment (Reddit, StockTwits, X) and professional market sentiment (Financial News) for STOCKS. Be objective, exclude crypto, and ensure you are researching the correct company ticker."
    try:
        return call_perplexity(prompt, system)
    except Exception as e:
        print(f"Perplexity failed, falling back to Gemini: {e}", file=sys.stderr)
        content = call_gemini(prompt, system)
        return json.dumps({"content": content, "citations": []})

def dividend_agent(ticker: str, shares: float, years: int) -> Dict[str, Any]:
    """Agent that analyzes dividend history and projects future payouts."""
    prompt = f"""Analyze {ticker} dividends for exactly {shares} shares over a {years}-year period.
    MATHEMATICAL PRECISION RULES:
    1. SHARE COUNT: Use the exact fractional share count of {shares} for every single year.
    2. ANNUAL PAYOUT: For each year, calculate: (Dividend Per Share) × {shares}. Do NOT round this value until the final table display.
    3. CUMULATIVE TOTAL: This is a running sum. Year N Cumulative Total = (Year N-1 Cumulative Total) + (Year N Annual Payout).
    4. ACCURACY: Ensure the final 'Estimated Cumulative Total' is the precise sum of all annual payouts over {years} years.
    REQUIRED FORMAT:
    1. Provide a Markdown table with columns: | Year | Dividend Per Share | Annual Payout | Cumulative Total |
    2. Each year must be on its own row.
    3. Below the table, provide a summary that explicitly states the final 'Estimated Cumulative Total' for the {shares} shares.
    Return your response as a JSON object with these keys: isDividendStock (boolean), hasDividendHistory (boolean), analysis (string containing your markdown table and summary)."""
    
    system = "Dividend specialist. You are a precision-focused financial analyst. Determine if a stock pays dividends and provide a multi-year projection. You must perform exact calculations using fractional shares. The 'Cumulative Total' column must strictly follow a running sum logic. Double-check your math before responding."
    schema = {
        "type": "OBJECT",
        "properties": {
            "isDividendStock": {"type": "BOOLEAN"},
            "hasDividendHistory": {"type": "BOOLEAN"},
            "analysis": {"type": "STRING"}
        },
        "required": ["isDividendStock", "hasDividendHistory", "analysis"]
    }
    
    try:
        res_text = call_gemini(prompt, system, response_mime_type="application/json", response_schema=schema)
        return json.loads(res_text)
    except Exception as e:
        print(f"Gemini dividend analysis failed: {e}", file=sys.stderr)
        # Fallback to OpenAI
        try:
            openai_key = os.environ.get("OPENAI_API_KEY")
            if openai_key and not is_placeholder(openai_key):
                res_text = call_openai(prompt + " IMPORTANT: Return ONLY raw JSON.", system)
                return extract_json(res_text)
        except Exception as oe:
            print(f"OpenAI fallback failed: {oe}", file=sys.stderr)

        return {
            "isDividendStock": False, 
            "hasDividendHistory": False, 
            "analysis": f"### Analysis Unavailable\n\nIssue processing dividend data for **{ticker}**.\n\n**Reason:** {str(e)}"
        }
