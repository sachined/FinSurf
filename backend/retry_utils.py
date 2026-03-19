"""
Unified retry logic with exponential backoff and provider fallback support.

This module centralizes retry patterns used across LLM providers and data fetchers.
"""
import functools
import time
import sys
from typing import Callable, TypeVar, Optional, List, Any
from functools import wraps

T = TypeVar('T')


def exponential_backoff_retry(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    retry_on: Optional[List[type]] = None,
    log_prefix: str = "Retry",
):
    """
    Decorator for exponential backoff retry logic.

    Args:
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds before first retry
        max_delay: Maximum delay cap in seconds
        exponential_base: Base for exponential backoff (delay = initial * base^attempt)
        retry_on: List of exception types to retry on (None = retry on all)
        log_prefix: Prefix for logging messages

    Example:
        @exponential_backoff_retry(max_retries=3, retry_on=[TimeoutError, ConnectionError])
        def fetch_data():
            return requests.get("https://api.example.com")
    """
    if retry_on is None:
        retry_on = [Exception]

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception = None
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except tuple(retry_on) as e:
                    last_exception = e
                    if attempt == max_retries:
                        raise

                    # Calculate delay with exponential backoff
                    delay = min(initial_delay * (exponential_base ** attempt), max_delay)
                    print(
                        f"{log_prefix}: {func.__name__} failed (attempt {attempt + 1}/{max_retries}), "
                        f"retrying in {delay:.1f}s... Error: {type(e).__name__}: {str(e)[:100]}",
                        file=sys.stderr
                    )
                    time.sleep(delay)

            # Should never reach here, but for type safety
            raise last_exception  # type: ignore

        return wrapper
    return decorator


def with_fallback(
    fallback_func: Callable[..., T],
    log_message: str = "Primary function failed, using fallback"
):
    """
    Decorator for provider fallback pattern (e.g., Groq -> Gemini).

    Args:
        fallback_func: Function to call if primary fails
        log_message: Message to log when falling back

    Example:
        @with_fallback(fallback_func=call_gemini, log_message="Groq failed, using Gemini")
        def call_groq_with_fallback(prompt, system, max_tokens):
            return call_groq(prompt, system, max_tokens=max_tokens)
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                print(f"{log_message}: {type(e).__name__}: {str(e)[:100]}", file=sys.stderr)
                try:
                    return fallback_func(*args, **kwargs)
                except Exception as fallback_error:
                    print(
                        f"Fallback also failed: {type(fallback_error).__name__}: {str(fallback_error)[:100]}",
                        file=sys.stderr
                    )
                    raise fallback_error

        return wrapper
    return decorator


def with_guardrail(func: Callable) -> Callable:
    """Decorator that runs the security guardrail before a financial agent function.

    Wraps any agent whose first positional arg is `ticker` and whose kwargs
    include `skip_guardrail`.  When the ticker is blocked the decorated function
    returns the standard _blocked_json() string immediately.

    Uses lazy imports to avoid circular dependencies with the financial_agents
    package (which itself imports from retry_utils).

    Example:
        @with_guardrail
        def research_agent(ticker, ..., skip_guardrail=False, ...):
            ...
    """
    @functools.wraps(func)
    def wrapper(ticker: str, *args: Any, skip_guardrail: bool = False, **kwargs: Any) -> Any:
        if not skip_guardrail:
            from .financial_agents.guardrail import security_guardrail  # lazy import
            from .financial_agents._helpers import _blocked_json         # lazy import
            if not security_guardrail(ticker):
                return _blocked_json()
        return func(ticker, *args, skip_guardrail=skip_guardrail, **kwargs)
    return wrapper


def retry_with_fallback(
    primary_func: Callable[..., T],
    fallback_func: Callable[..., T],
    max_retries: int = 2,
    initial_delay: float = 1.0,
    retry_on: Optional[List[type]] = None,
    log_prefix: str = "Provider"
) -> Callable[..., T]:
    """
    Combines retry logic with fallback - tries primary with retries, then fallback.

    This is a convenience function that composes exponential_backoff_retry and with_fallback.

    Example:
        call_groq_safe = retry_with_fallback(
            primary_func=call_groq,
            fallback_func=call_gemini,
            max_retries=2,
            log_prefix="Groq"
        )
    """
    # Apply exponential backoff to primary function
    primary_with_retry = exponential_backoff_retry(
        max_retries=max_retries,
        initial_delay=initial_delay,
        retry_on=retry_on,
        log_prefix=log_prefix
    )(primary_func)

    # Wrap with fallback
    return with_fallback(
        fallback_func=fallback_func,
        log_message=f"{log_prefix} failed after retries, using fallback"
    )(primary_with_retry)
