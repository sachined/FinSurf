import os
import json
import urllib.request
import urllib.error
import sys

# Check for both possible environment variable names
API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("API_KEY")
MODEL = "gemini-3-flash-preview"

def call_gemini(prompt, system_instruction=None, response_mime_type="text/plain", response_schema=None):
    if not API_KEY:
        print("Error: No API key found in environment (checked GEMINI_API_KEY and API_KEY)", file=sys.stderr)
        sys.exit(1)

    # Ensure the key is stripped of any accidental whitespace or quotes
    clean_key = API_KEY.strip().strip('"').strip("'")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={clean_key}"
    
    parts = [{"text": prompt}]
    contents = [{"parts": parts}]
    
    data = {
        "contents": contents,
        "generationConfig": {
            "responseMimeType": response_mime_type
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
                print(f"Error: No candidates in response. Full response: {json.dumps(res_data)}", file=sys.stderr)
                sys.exit(1)
            return res_data["candidates"][0]["content"]["parts"][0]["text"]
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        # Log the first few characters of the key for debugging (length and first char only)
        key_debug = f"len: {len(clean_key)}, starts with: {clean_key[0] if clean_key else 'N/A'}"
        print(f"HTTP Error {e.code}: {error_body} (Key info: {key_debug})", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error calling Gemini: {str(e)}", file=sys.stderr)
        sys.exit(1)

def research_agent(ticker):
    prompt = f"Briefly research {ticker}: performance, metrics, sentiment."
    system = "Equity analyst. Concise, data-driven. Cite sources."
    return call_gemini(prompt, system)

def tax_agent(ticker, purchase_date, sell_date):
    prompt = f"Tax for {ticker} ({purchase_date} to {sell_date}). Long-term?"
    system = "US Tax specialist. Explain 1-year rule concisely."
    return call_gemini(prompt, system)

def dividend_agent(ticker, shares, years):
    prompt = f"Analyze {ticker} dividends for {shares} shares over {years} years. NOTE: The share count ({shares}) may be a fractional number; ensure all calculations for annual payouts and cumulative totals reflect this exact fractional amount. FORMAT THE DIVIDEND PROJECTION AS A MARKDOWN TABLE. EACH YEAR MUST BE ON ITS OWN ROW. Example:\n| Year | Dividend Per Share | Annual Payout ({shares} Shares) | Cumulative Total |\n|:--- | :--- | :--- | :--- |\n| Year 1 | $1.00 | ${format(1.0 * shares, '.2f')} | ${format(1.0 * shares, '.2f')} |"
    system = "Dividend specialist. Determine if stock pays dividends now or ever. Provide concise projection if active. ALWAYS use a markdown table for projections. Ensure the table is legible with clear headers and one row per year. Account for fractional shares in all calculations."
    
    schema = {
        "type": "object",
        "properties": {
            "isDividendStock": {"type": "boolean"},
            "hasDividendHistory": {"type": "boolean"},
            "analysis": {"type": "string"}
        },
        "required": ["isDividendStock", "hasDividendHistory", "analysis"]
    }
    
    res_text = call_gemini(prompt, system, response_mime_type="application/json", response_schema=schema)
    return json.loads(res_text)

if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "research":
        print(research_agent(sys.argv[2]))
    elif mode == "tax":
        print(tax_agent(sys.argv[2], sys.argv[3], sys.argv[4]))
    elif mode == "dividend":
        print(json.dumps(dividend_agent(sys.argv[2], float(sys.argv[3]), int(sys.argv[4]))))
