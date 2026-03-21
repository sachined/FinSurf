"""
Ticker validation and security guardrail.
"""
import re


def validate_ticker(ticker: str) -> bool:
    """Strict allowlist validation for stock tickers.

    Accepts only uppercase letters, digits, dot, and hyphen — max 10 chars.
    Spaces are intentionally excluded: real tickers never contain them, and
    allowing spaces widens the prompt-injection surface by letting multi-word
    strings bypass the character-level filter and reach the LLM guardrail.
    """
    if not ticker or len(ticker) > 10:
        return False
    return bool(re.match(r'^[A-Z0-9.\-]+$', ticker))


def security_guardrail(user_input: str) -> bool:
    """
    Validates if the user input is a safe, on-topic stock ticker.
    Returns True if the input passes the format allowlist, False otherwise.

    Format-only validation is sufficient here: the server normalises all
    tickers to uppercase before this call, and the allowlist (A-Z/0-9/.-,
    max 10 chars) excludes every class of injection payload. The previous
    LLM-based second pass was unreachable — any input that passed
    validate_ticker() also matched its regex, so the LLM was never invoked.
    """
    return validate_ticker(user_input)