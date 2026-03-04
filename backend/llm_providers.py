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
        parts = res["candidates"][0]["content"]["parts"]
        return "".join(part.get("text", "") for part in parts)
    except (KeyError, IndexError):
        raise Exception(f"No candidates in Gemini response: {json.dumps(res)}")

def call_groq(
    prompt: str,
    system_instruction: Optional[str] = None,
    model: str = None,
    max_tokens: int = 2048,
    agent: str = "unknown",
) -> str:
    """Makes a call to the Groq cloud API (OpenAI-compatible).

    Reads GROQ_API_KEY from the environment. Reads GROQ_MODEL (default:
    llama-3.3-70b-versatile) so the model can be swapped without code changes.
    Raises on failure so callers can fall back to Gemini.
    """
    if not is_provider_allowed("groq"):
        raise Exception("Groq provider disabled by policy")
    key = validate_key("Groq", os.environ.get("GROQ_API_KEY"))
    if model is None:
        model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
    url = "https://api.groq.com/openai/v1/chat/completions"

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
        provider="groq",
        agent=agent,
        model=model,
        input_tokens=usage.get("prompt_tokens", 0),
        output_tokens=usage.get("completion_tokens", 0),
        latency_ms=latency_ms,
    ))

    return res["choices"][0]["message"]["content"]


def call_ollama(
    prompt: str,
    system_instruction: Optional[str] = None,
    model: str = None,
    max_tokens: int = 2048,
    agent: str = "unknown",
) -> str:
    """Makes a call to a local Ollama instance via its OpenAI-compatible API.

    Reads OLLAMA_BASE_URL (default: http://localhost:11434) and OLLAMA_MODEL
    (default: qwen2.5:7b) from the environment so both can be overridden per
    deployment without code changes.
    Raises on connection failure so callers can fall back to Gemini.
    """
    base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    if model is None:
        model = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")
    url = f"{base_url}/v1/chat/completions"

    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})

    data = {"model": model, "messages": messages, "max_tokens": max_tokens, "temperature": 0.1}
    headers = {"Content-Type": "application/json"}

    t0 = time.time()
    res = http_post(url, data, headers, timeout=120, max_retries=1)
    latency_ms = (time.time() - t0) * 1000

    usage = res.get("usage", {})
    record_usage(TokenUsage(
        provider="ollama",
        agent=agent,
        model=model,
        input_tokens=usage.get("prompt_tokens", 0),
        output_tokens=usage.get("completion_tokens", 0),
        latency_ms=latency_ms,
    ))

    return res["choices"][0]["message"]["content"]


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
