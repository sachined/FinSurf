import os
import json
import urllib.request
import urllib.error
import sys

# API Keys
GEMINI_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("API_KEY")
OPENAI_KEY = os.environ.get("OPENAI_API_KEY")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY")
PERPLEXITY_KEY = os.environ.get("PERPLEXITY_API_KEY")

def is_placeholder(key):
    if not key:
        return True
    placeholders = ["MY_GEMINI_API_KEY", "YOUR_API_KEY", "INSERT_KEY_HERE", "MY_OPENAI_API_KEY", "MY_ANTHROPIC_API_KEY", "MY_PERPLEXITY_API_KEY"]
    return any(p in key for p in placeholders) or (len(key) < 20 and key.startswith("MY_"))

def call_gemini(prompt, system_instruction=None, response_mime_type="text/plain", response_schema=None):
    if not GEMINI_KEY or is_placeholder(GEMINI_KEY):
        raise Exception("Invalid Gemini API Key. It appears you are using a placeholder (like 'MY_GEMINI_API_KEY'). Please replace it with a real key from Google AI Studio (starts with 'AIza').")
    
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
        raise Exception("Invalid Perplexity API Key. Please replace the placeholder with a real key from Perplexity.")
    
    url = "https://api.perplexity.ai/chat/completions"
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})
    
    data = {"model": model, "messages": messages}
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {PERPLEXITY_KEY}"}
    
    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers)
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise Exception(f"Perplexity API Error {e.code}: {error_body}")

def research_agent(ticker):
    prompt = f"Briefly research {ticker}: performance, metrics, sentiment."
    system = "Equity analyst. Concise, data-driven. Cite sources."
    try:
        return call_perplexity(prompt, system)
    except Exception as e:
        print(f"Perplexity failed, falling back to Gemini: {e}", file=sys.stderr)
        return call_gemini(prompt, system)

def tax_agent(ticker, purchase_date, sell_date):
    prompt = f"Tax for {ticker} ({purchase_date} to {sell_date}). Long-term?"
    system = "US Tax specialist. Explain 1-year rule concisely."
    try:
        return call_anthropic(prompt, system)
    except Exception as e:
        print(f"Anthropic failed, falling back to Gemini: {e}", file=sys.stderr)
        return call_gemini(prompt, system)

def dividend_agent(ticker, shares, years):
    prompt = f"Analyze {ticker} dividends for {shares} shares over {years} years. NOTE: The share count ({shares}) may be a fractional number; ensure all calculations for annual payouts and cumulative totals reflect this exact fractional amount. FORMAT THE DIVIDEND PROJECTION AS A MARKDOWN TABLE. EACH YEAR MUST BE ON ITS OWN ROW. Example:\n| Year | Dividend Per Share | Annual Payout ({shares} Shares) | Cumulative Total |\n|:--- | :--- | :--- | :--- |\n| Year 1 | $1.00 | ${format(1.0 * shares, '.2f')} | ${format(1.0 * shares, '.2f')} |\n\nReturn your response as a JSON object with these keys: isDividendStock (boolean), hasDividendHistory (boolean), analysis (string containing your markdown table and summary)."
    system = "Dividend specialist. Determine if stock pays dividends now or ever. Provide concise projection if active. ALWAYS use a markdown table for projections. Ensure the table is legible with clear headers and one row per year. Account for fractional shares in all calculations."
    
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
    except Exception as e:
        print(f"Critical Error: {e}", file=sys.stderr)
        sys.exit(1)
