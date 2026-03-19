"""
Tests for backend/retry_utils.py — exponential backoff and provider fallback.
All tests use MagicMock / side_effect lists; no real I/O or sleeping.
"""
import os
import sys
import unittest
from unittest.mock import MagicMock, patch, call

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.retry_utils import exponential_backoff_retry, with_fallback, retry_with_fallback


class TestExponentialBackoffRetry(unittest.TestCase):
    def test_success_on_first_attempt(self):
        mock_fn = MagicMock(return_value="ok")
        mock_fn.__name__ = "mock_fn"
        decorated = exponential_backoff_retry(max_retries=3)(mock_fn)
        with patch("time.sleep"):
            result = decorated()
        self.assertEqual(result, "ok")
        self.assertEqual(mock_fn.call_count, 1)

    def test_retries_then_succeeds(self):
        mock_fn = MagicMock(side_effect=[Exception("fail"), Exception("fail"), "ok"])
        mock_fn.__name__ = "mock_fn"
        decorated = exponential_backoff_retry(max_retries=3)(mock_fn)
        with patch("time.sleep"):
            result = decorated()
        self.assertEqual(result, "ok")
        self.assertEqual(mock_fn.call_count, 3)

    def test_raises_after_max_retries(self):
        mock_fn = MagicMock(side_effect=Exception("always fails"))
        mock_fn.__name__ = "mock_fn"
        decorated = exponential_backoff_retry(max_retries=2)(mock_fn)
        with patch("time.sleep"):
            with self.assertRaises(Exception) as ctx:
                decorated()
        self.assertIn("always fails", str(ctx.exception))
        self.assertEqual(mock_fn.call_count, 3)  # initial + 2 retries

    def test_only_retries_specified_exceptions(self):
        """Only retry on ValueError; a TypeError should propagate immediately."""
        mock_fn = MagicMock(side_effect=TypeError("wrong type"))
        mock_fn.__name__ = "mock_fn"
        decorated = exponential_backoff_retry(max_retries=3, retry_on=[ValueError])(mock_fn)
        with patch("time.sleep"):
            with self.assertRaises(TypeError):
                decorated()
        # Should have been called only once — TypeError is not in retry_on
        self.assertEqual(mock_fn.call_count, 1)


class TestWithFallback(unittest.TestCase):
    def test_returns_primary_result(self):
        primary = MagicMock(return_value="primary_result")
        fallback = MagicMock(return_value="fallback_result")
        decorated = with_fallback(fallback_func=fallback)(primary)
        result = decorated()
        self.assertEqual(result, "primary_result")
        fallback.assert_not_called()

    def test_calls_fallback_on_primary_failure(self):
        primary = MagicMock(side_effect=Exception("primary down"))
        fallback = MagicMock(return_value="fallback_result")
        decorated = with_fallback(fallback_func=fallback)(primary)
        result = decorated()
        self.assertEqual(result, "fallback_result")
        fallback.assert_called_once()

    def test_raises_when_both_fail(self):
        primary = MagicMock(side_effect=Exception("primary down"))
        fallback = MagicMock(side_effect=Exception("fallback down"))
        decorated = with_fallback(fallback_func=fallback)(primary)
        with self.assertRaises(Exception) as ctx:
            decorated()
        self.assertEqual(str(ctx.exception), "fallback down")


class TestRetryWithFallback(unittest.TestCase):
    def test_uses_primary_when_available(self):
        primary = MagicMock(return_value="primary_ok")
        fallback = MagicMock(return_value="fallback_ok")
        combined = retry_with_fallback(primary, fallback, max_retries=1)
        with patch("time.sleep"):
            result = combined()
        self.assertEqual(result, "primary_ok")
        fallback.assert_not_called()

    def test_falls_back_after_primary_exhausted(self):
        primary = MagicMock(side_effect=Exception("primary always fails"))
        fallback = MagicMock(return_value="fallback_ok")
        combined = retry_with_fallback(primary, fallback, max_retries=1)
        with patch("time.sleep"):
            result = combined()
        self.assertEqual(result, "fallback_ok")
        fallback.assert_called_once()

    def test_raises_when_both_exhausted(self):
        primary = MagicMock(side_effect=Exception("primary fails"))
        fallback = MagicMock(side_effect=Exception("fallback fails"))
        combined = retry_with_fallback(primary, fallback, max_retries=1)
        with patch("time.sleep"):
            with self.assertRaises(Exception) as ctx:
                combined()
        self.assertEqual(str(ctx.exception), "fallback fails")


if __name__ == "__main__":
    unittest.main()
