import os
import json
import sys
import urllib.request
import urllib.error
import time
from datetime import datetime
from functools import lru_cache
from typing import List, Optional, Dict, Any

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

def http_post(url: str, data: Dict[str, Any], headers: Dict[str, str], timeout: int = 30, max_retries: int = 3) -> Any:
    """Generic HTTP POST request with optional retry logic for 429/5xx errors."""
    start_time = time.time()
    endpoint = url.split("?")[0].split("/")[-1]
    for attempt in range(max_retries + 1):
        try:
            payload = json.dumps(data).encode("utf-8")
            req = urllib.request.Request(url, data=payload, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                result = json.loads(response.read().decode("utf-8"))
                duration = time.time() - start_time
                print(f"DEBUG: {endpoint} request successful in {duration:.2f}s (Attempt {attempt + 1})", file=sys.stderr)
                return result
        except urllib.error.HTTPError as e:
            if e.code in [429, 502, 503, 504] and attempt < max_retries:
                sleep_time = 2 ** (attempt + 1)
                print(f"API Error {e.code}, retrying in {sleep_time}s... (Attempt {attempt + 1}/{max_retries})", file=sys.stderr)
                time.sleep(sleep_time)
                continue
            error_body = e.read().decode("utf-8")
            raise Exception(f"API Error {e.code}: {error_body}")
        except Exception as e:
            if attempt < max_retries:
                print(f"DEBUG: Request failed with {type(e).__name__}: {str(e)[:100]}, retrying...", file=sys.stderr)
                time.sleep(1 * (attempt + 1))
                continue
            raise e


def calculate_holding_status(purchase_date: str, sell_date: str) -> str:
    """Determine if a transaction is short-term or long-term based on dates."""
    try:
        p_date = datetime.strptime(purchase_date, '%Y-%m-%d')
        s_date = datetime.strptime(sell_date, '%Y-%m-%d')
        try:
            one_year_later = p_date.replace(year=p_date.year + 1)
        except ValueError: # Handle Feb 29
            one_year_later = p_date.replace(year=p_date.year + 1, day=28)
        return "LONG-TERM" if s_date > one_year_later else "SHORT-TERM"
    except Exception as e:
        print(f"Date parsing error: {e}", file=sys.stderr)
        return "UNKNOWN"

def extract_json(text: str) -> Any:
    """Attempt to parse JSON from a string, handling formatting language code blocks."""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        return json.loads(text)

# --- Provider allowlist controls to minimize token spend ---

@lru_cache(maxsize=1)
def allowed_providers() -> tuple:
    """Return a frozenset-like tuple of allowed providers from env.
    Result is cached after the first call — env vars are read once per process.
    Priority: ALLOWED_PROVIDERS (comma-separated). If unset, fall back to individual ALLOW_* flags.
    Defaults to 'gemini' and 'perplexity' if nothing is configured.
    """
    raw = os.environ.get("ALLOWED_PROVIDERS", "")
    if raw:
        return tuple(p.strip().lower() for p in raw.split(",") if p.strip())
    providers: List[str] = []
    # Defaults: Gemini + Perplexity enabled (for research/sentiment). OpenAI/Anthropic disabled unless opted in.
    if os.environ.get("ALLOW_GEMINI", "true").lower() == "true":
        providers.append("gemini")
    if os.environ.get("ALLOW_PERPLEXITY", "true").lower() == "true":
        providers.append("perplexity")
    if os.environ.get("ALLOW_OPENAI", "false").lower() == "true":
        providers.append("openai")
    if os.environ.get("ALLOW_ANTHROPIC", "false").lower() == "true":
        providers.append("anthropic")
    if not providers:
        providers.append("gemini")
    return tuple(providers)


def is_provider_allowed(name: str) -> bool:
    """Check if a given provider is enabled by policy/env."""
    return name.lower() in allowed_providers()
