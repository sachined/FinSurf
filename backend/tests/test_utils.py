"""
Tests for backend/utils.py — pure utility functions, no API calls required.
"""
import os
import sys
import json
import unittest
from functools import lru_cache
from unittest.mock import patch

# Allow imports from the project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.utils import (
    get_env_key,
    is_placeholder,
    validate_key,
    calculate_holding_status,
    extract_json,
    is_provider_allowed,
    allowed_providers,
)


class TestGetEnvKey(unittest.TestCase):
    def test_returns_first_available(self):
        with patch.dict(os.environ, {"KEY_A": "value_a", "KEY_B": "value_b"}):
            self.assertEqual(get_env_key(["KEY_A", "KEY_B"]), "value_a")

    def test_skips_missing_and_returns_next(self):
        with patch.dict(os.environ, {"KEY_B": "value_b"}, clear=False):
            os.environ.pop("KEY_A", None)
            self.assertEqual(get_env_key(["KEY_A", "KEY_B"]), "value_b")

    def test_returns_none_when_all_missing(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(get_env_key(["MISSING_X", "MISSING_Y"]))

    def test_empty_list(self):
        self.assertIsNone(get_env_key([]))


class TestIsPlaceholder(unittest.TestCase):
    def test_none_is_placeholder(self):
        self.assertTrue(is_placeholder(None))

    def test_empty_string_is_placeholder(self):
        self.assertTrue(is_placeholder(""))

    def test_known_placeholder_strings(self):
        self.assertTrue(is_placeholder("INSERT_KEY_HERE"))
        self.assertTrue(is_placeholder("YOUR_API_KEY"))
        # Case-insensitive
        self.assertTrue(is_placeholder("insert_key_here"))

    def test_real_key_is_not_placeholder(self):
        self.assertFalse(is_placeholder("sk-abc123xyz"))
        self.assertFalse(is_placeholder("AIzaSyABCDEF12345"))


class TestValidateKey(unittest.TestCase):
    def test_valid_key_returned_stripped(self):
        result = validate_key("TestProvider", '  "sk-real-key"  ')
        self.assertEqual(result, "sk-real-key")

    def test_raises_on_none(self):
        with self.assertRaises(Exception) as ctx:
            validate_key("TestProvider", None)
        self.assertIn("TestProvider", str(ctx.exception))

    def test_raises_on_placeholder(self):
        with self.assertRaises(Exception):
            validate_key("TestProvider", "INSERT_KEY_HERE")


class TestCalculateHoldingStatus(unittest.TestCase):
    def test_long_term(self):
        self.assertEqual(calculate_holding_status("2022-01-01", "2023-06-01"), "LONG-TERM")

    def test_short_term(self):
        self.assertEqual(calculate_holding_status("2023-01-01", "2023-06-01"), "SHORT-TERM")

    def test_exactly_one_year_is_short_term(self):
        # Must be strictly *after* one year to qualify as long-term
        self.assertEqual(calculate_holding_status("2022-01-01", "2023-01-01"), "SHORT-TERM")

    def test_one_day_after_one_year_is_long_term(self):
        self.assertEqual(calculate_holding_status("2022-01-01", "2023-01-02"), "LONG-TERM")

    def test_leap_year_feb29(self):
        # Feb 29 purchase; one year later should fall back to Feb 28
        status = calculate_holding_status("2020-02-29", "2021-03-01")
        self.assertEqual(status, "LONG-TERM")

    def test_bad_date_returns_unknown(self):
        self.assertEqual(calculate_holding_status("not-a-date", "2023-01-01"), "UNKNOWN")


class TestExtractJson(unittest.TestCase):
    def test_plain_json(self):
        result = extract_json('{"key": "value"}')
        self.assertEqual(result, {"key": "value"})

    def test_json_in_code_fence(self):
        text = '```json\n{"key": "value"}\n```'
        self.assertEqual(extract_json(text), {"key": "value"})

    def test_json_in_plain_code_fence(self):
        text = '```\n{"key": "value"}\n```'
        self.assertEqual(extract_json(text), {"key": "value"})

    def test_array_json(self):
        self.assertEqual(extract_json("[1, 2, 3]"), [1, 2, 3])

    def test_raises_on_invalid_json(self):
        with self.assertRaises(json.JSONDecodeError):
            extract_json("this is not json")


class TestProviderAllowlist(unittest.TestCase):
    def setUp(self):
        # Clear lru_cache before each test so env changes take effect
        allowed_providers.cache_clear()

    def tearDown(self):
        allowed_providers.cache_clear()

    def test_allowed_providers_comma_list(self):
        with patch.dict(os.environ, {"ALLOWED_PROVIDERS": "gemini,openai"}, clear=False):
            allowed_providers.cache_clear()
            result = allowed_providers()
            self.assertIn("gemini", result)
            self.assertIn("openai", result)
            self.assertNotIn("perplexity", result)

    def test_is_provider_allowed_true(self):
        with patch.dict(os.environ, {"ALLOWED_PROVIDERS": "gemini,perplexity"}, clear=False):
            allowed_providers.cache_clear()
            self.assertTrue(is_provider_allowed("gemini"))
            self.assertTrue(is_provider_allowed("perplexity"))

    def test_is_provider_allowed_false(self):
        with patch.dict(os.environ, {"ALLOWED_PROVIDERS": "gemini"}, clear=False):
            allowed_providers.cache_clear()
            self.assertFalse(is_provider_allowed("openai"))
            self.assertFalse(is_provider_allowed("anthropic"))

    def test_default_providers_when_no_env(self):
        clean_env = {k: v for k, v in os.environ.items()
                     if k not in ("ALLOWED_PROVIDERS", "ALLOW_GEMINI", "ALLOW_PERPLEXITY",
                                  "ALLOW_OPENAI", "ALLOW_ANTHROPIC")}
        with patch.dict(os.environ, clean_env, clear=True):
            allowed_providers.cache_clear()
            result = allowed_providers()
            # Default: gemini + perplexity enabled, openai + anthropic disabled
            self.assertIn("gemini", result)
            self.assertIn("perplexity", result)
            self.assertNotIn("openai", result)
            self.assertNotIn("anthropic", result)

    def test_case_insensitive(self):
        with patch.dict(os.environ, {"ALLOWED_PROVIDERS": "Gemini,PERPLEXITY"}, clear=False):
            allowed_providers.cache_clear()
            self.assertTrue(is_provider_allowed("gemini"))
            self.assertTrue(is_provider_allowed("perplexity"))


if __name__ == "__main__":
    unittest.main()
