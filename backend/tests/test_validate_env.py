"""
Tests for backend/validate_env.py — environment variable validation.
All tests use patch.dict(os.environ, ..., clear=True); no real env vars needed.
"""
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.validate_env import check_env


class TestCheckEnv(unittest.TestCase):
    def test_passes_with_gemini_key(self):
        env = {"GEMINI_API_KEY": "test-key"}
        with patch.dict(os.environ, env, clear=True):
            success, errors = check_env()
        self.assertTrue(success)
        self.assertEqual(errors, [])

    def test_passes_with_groq_key_only(self):
        env = {"GROQ_API_KEY": "test-groq-key"}
        with patch.dict(os.environ, env, clear=True):
            success, errors = check_env()
        self.assertTrue(success)
        self.assertEqual(errors, [])

    def test_fails_with_no_llm_keys(self):
        with patch.dict(os.environ, {}, clear=True):
            success, errors = check_env()
        self.assertFalse(success)
        self.assertTrue(any("GEMINI_API_KEY" in e or "GROQ_API_KEY" in e for e in errors))

    def test_fails_when_all_providers_disabled(self):
        env = {
            "GEMINI_API_KEY": "key",
            "ALLOW_GEMINI": "false",
            "ALLOW_GROQ": "false",
            "ALLOW_PERPLEXITY": "false",
        }
        with patch.dict(os.environ, env, clear=True):
            success, errors = check_env()
        self.assertFalse(success)
        self.assertTrue(any("disabled" in e.lower() or "ALLOW" in e for e in errors))



if __name__ == "__main__":
    unittest.main()
