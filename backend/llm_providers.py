import json
import os
import time
from typing import Optional, Dict, Any
from .utils import validate_key, get_env_key, http_post, is_provider_allowed
from .telemetry import TokenUsage, record_usage

def call_gemini(
    prompt: str,
    system_instruction: Optional[str] = None,
    response_mime_type: str = "text/plain",
    response_schema: Optional[Dict[str, Any]] = None,
    model: str = "gemini-flash-latest",
    max_tokens: int = 1024,
    agent: str = "unknown",
) -> str:
    """Makes a call to the Google Gemini API."""
    if not is_provider_allowed("gemini"):
        raise Exception("Gemini provider disabled by policy")
    key = validate_key("Gemini", get_env_key(["GEMINI_API_KEY", "API_KEY"]))
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generation_config": {
            "temperature": 0.1,
            "max_output_tokens": max_tokens
        }
    }
    if response_mime_type != "text/plain":
        data["generation_config"]["response_mime_type"] = response_mime_type

    if system_instruction:
        data["system_instruction"] = {"parts": [{"text": system_instruction}]}
    if response_schema:
        data["generation_config"]["response_schema"] = response_schema

    t0 = time.time()
    res = http_post(url, data, {"Content-Type": "application/json"})
    latency_ms = (time.time() - t0) * 1000

    usage_meta = res.get("usageMetadata", {})
    record_usage(TokenUsage(
        provider="gemini",
        agent=agent,
        model=model,
        input_tokens=usage_meta.get("promptTokenCount", 0),
        output_tokens=usage_meta.get("candidatesTokenCount", 0),
        latency_ms=latency_ms,
    ))

    try:
        return res["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise Exception(f"No candidates in Gemini response: {json.dumps(res)}")

def call_openai(
    prompt: str,
    system_instruction: Optional[str] = None,
    model: str = "gpt-4o-mini",
    max_tokens: int = 1024,
    agent: str = "unknown",
) -> str:
    """Makes a call to the OpenAI Chat Completion API."""
    if not is_provider_allowed("openai"):
        raise Exception("OpenAI provider disabled by policy")
    key = validate_key("OpenAI", os.environ.get("OPENAI_API_KEY"))
    url = "https://api.openai.com/v1/chat/completions"

    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})

    data = {"model": model, "messages": messages, "max_tokens": max_tokens, "temperature": 0.1}
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {key}"}

    t0 = time.time()
    res = http_post(url, data, headers)
    latency_ms = (time.time() - t0) * 1000

    usage = res.get("usage", {})
    record_usage(TokenUsage(
        provider="openai",
        agent=agent,
        model=model,
        input_tokens=usage.get("prompt_tokens", 0),
        output_tokens=usage.get("completion_tokens", 0),
        latency_ms=latency_ms,
    ))

    return res["choices"][0]["message"]["content"]

def call_anthropic(
    prompt: str,
    system_instruction: Optional[str] = None,
    model: str = "claude-3-haiku-20240307",
    max_tokens: int = 1024,
    agent: str = "unknown",
) -> str:
    """Makes a call to the Anthropic Messages API."""
    if not is_provider_allowed("anthropic"):
        raise Exception("Anthropic provider disabled by policy")
    key = validate_key("Anthropic", os.environ.get("ANTHROPIC_API_KEY"))
    url = "https://api.anthropic.com/v1/messages"

    data = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1
    }
    if system_instruction:
        data["system"] = system_instruction

    headers = {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
    }

    t0 = time.time()
    res = http_post(url, data, headers)
    latency_ms = (time.time() - t0) * 1000

    usage = res.get("usage", {})
    record_usage(TokenUsage(
        provider="anthropic",
        agent=agent,
        model=model,
        input_tokens=usage.get("input_tokens", 0),
        output_tokens=usage.get("output_tokens", 0),
        latency_ms=latency_ms,
    ))

    return res["content"][0]["text"]

def call_perplexity(
    prompt: str,
    system_instruction: Optional[str] = None,
    model: str = "sonar",
    max_tokens: int = 1024,
    agent: str = "unknown",
) -> str:
    """Makes a call to the Perplexity Chat Completion API."""
    if not is_provider_allowed("perplexity"):
        raise Exception("Perplexity provider disabled by policy")
    key = validate_key("Perplexity", os.environ.get("PERPLEXITY_API_KEY"))
    url = "https://api.perplexity.ai/chat/completions"

    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})

    data = {"model": model, "messages": messages, "max_tokens": max_tokens, "temperature": 0.1}
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {key}"}

    t0 = time.time()
    res = http_post(url, data, headers, timeout=60, max_retries=2)
    latency_ms = (time.time() - t0) * 1000

    usage = res.get("usage", {})
    record_usage(TokenUsage(
        provider="perplexity",
        agent=agent,
        model=model,
        input_tokens=usage.get("prompt_tokens", 0),
        output_tokens=usage.get("completion_tokens", 0),
        latency_ms=latency_ms,
    ))

    content = res["choices"][0]["message"]["content"]
    citations = res.get("citations", [])
    return json.dumps({"content": content, "citations": citations})
