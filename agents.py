import os
import json
import urllib.request
import sys

API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL = "gemini-3-flash-preview"

def call_gemini(prompt, system_instruction=None, response_mime_type="text/plain", response_schema=None):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"
    
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

    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers={"Content-Type": "application/json"})
    
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode("utf-8"))
        return res_data["candidates"][0]["content"]["parts"][0]["text"]

def research_agent(ticker):
    prompt = f"Briefly research {ticker}: performance, metrics, sentiment."
    system = "Equity analyst. Concise, data-driven. Cite sources."
    return call_gemini(prompt, system)

def tax_agent(ticker, purchase_date, sell_date):
    prompt = f"Tax for {ticker} ({purchase_date} to {sell_date}). Long-term?"
    system = "US Tax specialist. Explain 1-year rule concisely."
    return call_gemini(prompt, system)

def dividend_agent(ticker, shares, years):
    prompt = f"Analyze {ticker} dividends for {shares} shares over {years} years. FORMAT THE DIVIDEND PROJECTION AS A MARKDOWN TABLE. EACH YEAR MUST BE ON ITS OWN ROW. Example:\n| Year | Dividend Per Share | Annual Payout ({shares} Shares) | Cumulative Total |\n|:--- | :--- | :--- | :--- |\n| Year 1 | $1.00 | $100.00 | $100.00 |\n| Year 2 | $1.10 | $110.00 | $210.00 |"
    system = "Dividend specialist. Determine if stock pays dividends now or ever. Provide concise projection if active. ALWAYS use a markdown table for projections. Ensure the table is legible with clear headers and one row per year."
    
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
