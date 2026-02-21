import os
import json
import urllib.request
import urllib.error
import sys
from datetime import datetime

# API Keys
GEMINI_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("API_KEY")
OPENAI_KEY = os.environ.get("OPENAI_API_KEY")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY")
PERPLEXITY_KEY = os.environ.get("PERPLEXITY_API_KEY")

def is_placeholder(key):
    if not key:
        return True
    # Only check for very obvious placeholder strings
    placeholders = ["INSERT_KEY_HERE", "YOUR_API_KEY"]
    key_upper = key.upper()
    return any(p in key_upper for p in placeholders)

def call_gemini(prompt, system_instruction=None, response_mime_type="text/plain", response_schema=None):
    if not GEMINI_KEY:
        raise Exception("Gemini API Key is missing. Please ensure GEMINI_API_KEY is set in the environment.")
    
    # Robust cleaning of the API key
    clean_key = GEMINI_KEY.strip().strip('"').strip("'").strip()
    
    # Use a more stable model version
    model_name = "gemini-1.5-flash" 
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={clean_key}"
    
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": response_mime_type,
            "temperature": 0.1 # Lower temperature for more consistent results
        }
    }
    if system_instruction:
        data["systemInstruction"] = {"parts": [{"text": system_instruction}]}
    if response_schema:
        data["generationConfig"]["responseSchema"] = response_schema

    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            if "candidates" not in res_data or not res_data["candidates"]:
                raise Exception(f"No candidates in Gemini response. Full response: {json.dumps(res_data)}")
            return res_data["candidates"][0]["content"]["parts"][0]["text"]
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        # Log safe debug info about the key
        key_info = f"len={len(clean_key)}"
        if len(clean_key) > 4:
            key_info += f", starts with {clean_key[:4]}"
        raise Exception(f"Gemini API Error {e.code} (Model: {model_name}): {error_body} (Key info: {key_info})")

def call_openai(prompt, system_instruction=None, model="gpt-4o"):
    if not OPENAI_KEY or is_placeholder(OPENAI_KEY):
        raise Exception("Invalid OpenAI API Key. Please replace the placeholder with a real key from OpenAI.")
    
    url = "https://api.openai.com/v1/chat/completions"
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})
    
    data = {"model": model, "messages": messages}
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {OPENAI_KEY}"}
    
    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers)
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise Exception(f"OpenAI API Error {e.code}: {error_body}")

def call_anthropic(prompt, system_instruction=None, model="claude-3-haiku-20240307"):
    if not ANTHROPIC_KEY or is_placeholder(ANTHROPIC_KEY):
        raise Exception("Invalid Anthropic API Key. Please replace the placeholder with a real key from Anthropic.")
    
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
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01"
    }
    
    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers)
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["content"][0]["text"]
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise Exception(f"Anthropic API Error {e.code}: {error_body}")

def call_perplexity(prompt, system_instruction=None, model="sonar"):
    if not PERPLEXITY_KEY or is_placeholder(PERPLEXITY_KEY):
        raise Exception("Invalid Perplexity API Key. Please provide a valid key in the environment.")
    
    url = "https://api.perplexity.ai/chat/completions"
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})
    
    data = {"model": model, "messages": messages}
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {PERPLEXITY_KEY}"}
    
    # Simple retry logic for 502/503 errors
    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers)
            with urllib.request.urlopen(req) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                content = res_data["choices"][0]["message"]["content"]
                citations = res_data.get("citations", [])
                return json.dumps({"content": content, "citations": citations})
        except urllib.error.HTTPError as e:
            if e.code in [502, 503, 504] and attempt < max_retries:
                import time
                time.sleep(1 * (attempt + 1))
                continue
            error_body = e.read().decode("utf-8")
            raise Exception(f"Perplexity API Error {e.code}: {error_body}")
        except Exception as e:
            if attempt < max_retries:
                continue
            raise e

def research_agent(ticker):
    prompt = f"Briefly research {ticker}: performance, metrics, sentiment."
    system = "Equity analyst. Concise, data-driven. Cite sources."
    try:
        return call_perplexity(prompt, system)
    except Exception as e:
        print(f"Perplexity failed, falling back to Gemini: {e}", file=sys.stderr)
        content = call_gemini(prompt, system)
        return json.dumps({"content": content, "citations": []})

def tax_agent(ticker, purchase_date, sell_date):
    # Explicitly calculate holding period to avoid LLM calculation errors
    status = "UNKNOWN"
    try:
        p_date = datetime.strptime(purchase_date, '%Y-%m-%d')
        s_date = datetime.strptime(sell_date, '%Y-%m-%d')
        
        # Calculate if held for MORE than one year
        # A simple way: add 1 year to purchase date and compare
        try:
            one_year_later = p_date.replace(year=p_date.year + 1)
        except ValueError: # Handle Feb 29
            one_year_later = p_date.replace(year=p_date.year + 1, day=28)
            
        if s_date > one_year_later:
            status = "LONG-TERM"
        else:
            status = "SHORT-TERM"
    except Exception as e:
        print(f"Date parsing error: {e}", file=sys.stderr)

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

def social_sentiment_agent(ticker):
    prompt = f"""Search Reddit and X (Twitter) for recent (last 7 days) discussions about the stock ticker '{ticker}'. 
    
    STRICT REQUIREMENTS:
    1. The symbol '{ticker}' refers to a stock market ticker (e.g., 'T' is AT&T, 'F' is Ford). Do NOT confuse it with generic words or other entities.
    2. STRICTLY EXCLUDE any cryptocurrency-related discussions or sentiment. Focus only on the equity/stock market.
    
    REQUIRED FORMAT:
    1. Summarize the overall sentiment (Bullish, Bearish, or Neutral).
    2. Highlight the key reasons for this sentiment.
    3. Mention specific trending topics or concerns.
    4. At the end, provide 1 or 2 specific, representative comments or tweets (paraphrased or quoted) that best convey the current sentiment.
    """
    system = "Social Media Sentiment Analyst. You specialize in tracking retail investor sentiment for STOCKS on platforms like Reddit (r/wallstreetbets, r/stocks) and X. Be objective, exclude crypto, and ensure you are researching the correct company ticker."
    try:
        return call_perplexity(prompt, system)
    except Exception as e:
        print(f"Perplexity failed, falling back to Gemini: {e}", file=sys.stderr)
        content = call_gemini(prompt, system)
        return json.dumps({"content": content, "citations": []})

def dividend_agent(ticker, shares, years):
    prompt = f"Analyze {ticker} dividends for {shares} shares over {years} years. NOTE: The share count ({shares}) may be a fractional number; ensure all calculations for annual payouts and cumulative totals reflect this exact fractional amount. FORMAT THE DIVIDEND PROJECTION AS A MARKDOWN TABLE. EACH YEAR MUST BE ON ITS OWN ROW. Example:\n| Year | Dividend Per Share | Annual Payout ({shares} Shares) | Cumulative Total |\n|:--- | :--- | :--- | :--- |\n| Year 1 | $1.00 | ${format(1.0 * shares, '.2f')} | ${format(1.0 * shares, '.2f')} |\n\nIf it is a dividend-paying stock, you MUST explicitly state the final 'Estimated Cumulative Total' at the end of your summary analysis. Return your response as a JSON object with these keys: isDividendStock (boolean), hasDividendHistory (boolean), analysis (string containing your markdown table and summary)."
    system = "Dividend specialist. Determine if stock pays dividends now or ever. Provide concise projection if active. ALWAYS use a markdown table for projections. Ensure the table is legible with clear headers and one row per year. Account for fractional shares in all calculations. Explicitly highlight the final cumulative total in the summary."
    
    schema = {
        "type": "OBJECT",
        "properties": {
            "isDividendStock": {"type": "BOOLEAN"},
            "hasDividendHistory": {"type": "BOOLEAN"},
            "analysis": {"type": "STRING"}
        },
        "required": ["isDividendStock", "hasDividendHistory", "analysis"]
    }
    
    # Try Gemini first with structured output
    try:
        res_text = call_gemini(prompt, system, response_mime_type="application/json", response_schema=schema)
        return json.loads(res_text)
    except Exception as e:
        print(f"Gemini dividend analysis failed: {e}", file=sys.stderr)
        
        # Fallback to OpenAI if available
        try:
            if OPENAI_KEY and not is_placeholder(OPENAI_KEY):
                res_text = call_openai(prompt + " IMPORTANT: Return ONLY raw JSON.", system)
                # Try to extract JSON if the model added markdown blocks
                if "```json" in res_text:
                    res_text = res_text.split("```json")[1].split("```")[0].strip()
                elif "```" in res_text:
                    res_text = res_text.split("```")[1].split("```")[0].strip()
                return json.loads(res_text)
        except Exception as oe:
            print(f"OpenAI fallback failed: {oe}", file=sys.stderr)

        # Final fallback: Return a structured error object that the UI can handle
        return {
            "isDividendStock": False, 
            "hasDividendHistory": False, 
            "analysis": f"### Analysis Unavailable\n\nWe encountered an issue processing dividend data for **{ticker}**.\n\n**Reason:** {str(e)}\n\n*Please ensure your API keys are valid and have sufficient quota.*"
        }

if __name__ == "__main__":
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
    except Exception as e:
        print(f"Critical Error: {e}", file=sys.stderr)
        sys.exit(1)
