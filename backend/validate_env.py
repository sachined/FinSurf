"""
Environment variable validation script.

Run this at server startup to ensure all required API keys and configuration
are present before processing any requests. Fail fast with clear error messages.

Usage:
    python backend/validate_env.py

Returns exit code 0 if all checks pass, 1 otherwise.
"""
import os
import sys
from typing import List, Tuple


def check_env() -> Tuple[bool, List[str]]:
    """Validate environment variables. Returns (success, errors)."""
    errors = []

    # ── Required keys (at least one must be present) ──
    # Core LLM providers
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("API_KEY")
    groq_key = os.environ.get("GROQ_API_KEY")
    perplexity_key = os.environ.get("PERPLEXITY_API_KEY")

    if not gemini_key and not groq_key:
        errors.append(
            "❌ Missing LLM provider keys: at least one of GEMINI_API_KEY or GROQ_API_KEY is required"
        )

    # ── Optional but recommended keys ──
    warnings = []

    if not perplexity_key:
        warnings.append("⚠️  PERPLEXITY_API_KEY not set (sentiment agent will use fallback)")

    if not os.environ.get("ALPHA_VANTAGE_API_KEY"):
        warnings.append("⚠️  ALPHA_VANTAGE_API_KEY not set (news sentiment will be skipped)")

    if not os.environ.get("FINNHUB_API_KEY"):
        warnings.append("⚠️  FINNHUB_API_KEY not set (insider transactions will be skipped)")

    # ── Provider toggles ──
    allowed_gemini = os.environ.get("ALLOW_GEMINI", "true").lower() == "true"
    allowed_groq = os.environ.get("ALLOW_GROQ", "true").lower() == "true"
    allowed_perplexity = os.environ.get("ALLOW_PERPLEXITY", "true").lower() == "true"

    if not allowed_gemini and not allowed_groq and not allowed_perplexity:
        errors.append(
            "❌ All LLM providers disabled: at least one of ALLOW_GEMINI, ALLOW_GROQ, "
            "or ALLOW_PERPLEXITY must be 'true'"
        )

    # ── Telemetry DB path ──
    telemetry_db = os.environ.get("TELEMETRY_DB", "finsurf_telemetry.db")
    if not telemetry_db:
        errors.append("❌ TELEMETRY_DB is set but empty")

    # ── Print results ──
    if errors:
        print("\n🚨 ENVIRONMENT VALIDATION FAILED\n", file=sys.stderr)
        for err in errors:
            print(err, file=sys.stderr)
        return False, errors

    # Success - print warnings if any
    print("✅ Environment validation passed", file=sys.stderr)

    if warnings:
        print("\nOptional configurations:", file=sys.stderr)
        for warn in warnings:
            print(warn, file=sys.stderr)

    print("\nActive providers:", file=sys.stderr)
    if gemini_key and allowed_gemini:
        print("  ✓ Gemini", file=sys.stderr)
    if groq_key and allowed_groq:
        print("  ✓ Groq", file=sys.stderr)
    if perplexity_key and allowed_perplexity:
        print("  ✓ Perplexity", file=sys.stderr)

    return True, []


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    success, _ = check_env()
    sys.exit(0 if success else 1)
