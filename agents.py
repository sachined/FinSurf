import os
import json
import urllib.request
import urllib.error
import sys
import time
from datetime import datetime
from typing import List, Optional, Dict, Any, Union

# --- API Key Management ---

def get_env_key(keys: List[str]) -> Optional[str]:
    """Retrieve the first available environment variable from the list."""
    for k in keys:
        val = os.environ.get(k)
        if val: return val
    return None

def is_placeholder(key: Optional[str]) -> bool:
    """Check if the API key is a known placeholder."""
    if not key: return True
    placeholders = ["INSERT_KEY_HERE", "YOUR_API_KEY"]
    return any(p in key.upper() for p in placeholders)

def validate_key(provider_name: str, key: Optional[str]) -> str:
    """Validate and clean the API key."""
    if not key or is_placeholder(key):
        raise Exception(f"{provider_name} API Key is missing or invalid. Please set it in the environment.")
    return key.strip().strip('"').strip("'").strip()

# --- Core HTTP Request Logic ---

def _http_post(url: str, data: Dict[str, Any], headers: Dict[str, str], timeout: int = 30, max_retries: int = 0) -> Any:
    """Generic HTTP POST request with optional retry logic for 5xx errors."""
    for attempt in range(max_retries + 1):
        try:
            payload = json.dumps(data).encode("utf-8")
            req = urllib.request.Request(url, data=payload, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in [502, 503, 504] and attempt < max_retries:
                time.sleep(1 * (attempt + 1))
                continue
            error_body = e.read().decode("utf-8")
            raise Exception(f"API Error {e.code}: {error_body}")
        except Exception as e:
            if attempt < max_retries:
                time.sleep(1 * (attempt + 1))
                continue
            raise e

# --- LLM Provider Clients ---

def call_gemini(prompt: str, system_instruction: Optional[str] = None, response_mime_type: str = "text/plain", response_schema: Optional[Dict[str, Any]] = None) -> str:
    """Makes a call to the Google Gemini API."""
    key = validate_key("Gemini", get_env_key(["GEMINI_API_KEY", "API_KEY"]))
    model = "gemini-1.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": response_mime_type,
            "temperature": 0.1
        }
    }
    if system_instruction:
        data["systemInstruction"] = {"parts": [{"text": system_instruction}]}
    if response_schema:
        data["generationConfig"]["responseSchema"] = response_schema
        
    res = _http_post(url, data, {"Content-Type": "application/json"})
    try:
        return res["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise Exception(f"No candidates in Gemini response: {json.dumps(res)}")

def call_openai(prompt: str, system_instruction: Optional[str] = None, model: str = "gpt-4o") -> str:
    """Makes a call to the OpenAI Chat Completion API."""
    key = validate_key("OpenAI", os.environ.get("OPENAI_API_KEY"))
    url = "https://api.openai.com/v1/chat/completions"
    
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})
    
    data = {"model": model, "messages": messages}
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {key}"}
    res = _http_post(url, data, headers)
    return res["choices"][0]["message"]["content"]

def call_anthropic(prompt: str, system_instruction: Optional[str] = None, model: str = "claude-3-haiku-20240307") -> str:
    """Makes a call to the Anthropic Messages API."""
    key = validate_key("Anthropic", os.environ.get("ANTHROPIC_API_KEY"))
    url = "https://api.anthropic.com/v1/messages"
    
    data = {
        "model": model,
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": prompt}]
    }
    if system_instruction:
        data["system"] = system_instruction
        
    headers = {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
    }
    res = _http_post(url, data, headers)
    return res["content"][0]["text"]

def call_perplexity(prompt: str, system_instruction: Optional[str] = None, model: str = "sonar") -> str:
    """Makes a call to the Perplexity Chat Completion API."""
    key = validate_key("Perplexity", os.environ.get("PERPLEXITY_API_KEY"))
    url = "https://api.perplexity.ai/chat/completions"
    
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})
    
    data = {"model": model, "messages": messages}
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {key}"}
    res = _http_post(url, data, headers, max_retries=2)
    
    content = res["choices"][0]["message"]["content"]
    citations = res.get("citations", [])
    return json.dumps({"content": content, "citations": citations})

# --- Utility Helpers ---

def calculate_holding_status(purchase_date: str, sell_date: str) -> str:
    """Determine if a transaction is short-term or long-term based on dates."""
    try:
        p_date = datetime.strptime(purchase_date, '%Y-%m-%d')
        s_date = datetime.strptime(sell_date, '%Y-%m-%d')
        
        # Calculate if held for MORE than one year
        try:
            one_year_later = p_date.replace(year=p_date.year + 1)
        except ValueError: # Handle Feb 29
            one_year_later = p_date.replace(year=p_date.year + 1, day=28)
            
        return "LONG-TERM" if s_date > one_year_later else "SHORT-TERM"
    except Exception as e:
        print(f"Date parsing error: {e}", file=sys.stderr)
        return "UNKNOWN"

def extract_json(text: str) -> Any:
    """Attempt to parse JSON from a string, handling markdown code blocks."""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to extract from markdown blocks
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        return json.loads(text)

# --- Specialized Agents ---

def research_agent(ticker: str) -> str:
    """Agent that performs general equity research using Perplexity with Gemini fallback."""
    prompt = f"Briefly research {ticker}: performance, metrics, sentiment."
    system = "Equity analyst. Concise, data-driven. Cite sources."
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
    prompt = f"""Search Reddit, X (Twitter), StockTwits, and major financial news websites (e.g., Bloomberg, Reuters, CNBC) for recent (last 7 days) discussions and sentiment about the stock ticker '{ticker}'. 
    STRICT REQUIREMENTS:
    1. The symbol '{ticker}' refers to a stock market ticker (e.g., 'T' is AT&T, 'F' is Ford). Do NOT confuse it with generic words or other entities.
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

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: agents.py <mode> <args...>", file=sys.stderr)
        sys.exit(1)
        
    try:
        mode = sys.argv[1]
        if mode == "research":
            print(research_agent(sys.argv[2]))
        elif mode == "tax":
            print(tax_agent(sys.argv[2], sys.argv[3], sys.argv[4]))
        elif mode == "dividend":
            print(json.dumps(dividend_agent(sys.argv[2], float(sys.argv[3]), int(sys.argv[4]))))
        elif mode == "sentiment":
            print(social_sentiment_agent(sys.argv[2]))
        else:
            print(f"Unknown mode: {mode}", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"Critical Error: {e}", file=sys.stderr)
        sys.exit(1)
