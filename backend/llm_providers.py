import json
import os
from typing import Optional, Dict, Any
from .utils import validate_key, get_env_key, http_post

def call_gemini(prompt: str, system_instruction: Optional[str] = None, response_mime_type: str = "text/plain", response_schema: Optional[Dict[str, Any]] = None) -> str:
    """Makes a call to the Google Gemini API."""
    key = validate_key("Gemini", get_env_key(["GEMINI_API_KEY", "API_KEY"]))
    model = "gemini-1.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": response_mime_type,
            "temperature": 0.1
        }
    }
    if system_instruction:
        data["systemInstruction"] = {"parts": [{"text": system_instruction}]}
    if response_schema:
        data["generationConfig"]["responseSchema"] = response_schema
        
    res = http_post(url, data, {"Content-Type": "application/json"})
    try:
        return res["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise Exception(f"No candidates in Gemini response: {json.dumps(res)}")

def call_openai(prompt: str, system_instruction: Optional[str] = None, model: str = "gpt-4o") -> str:
    """Makes a call to the OpenAI Chat Completion API."""
    key = validate_key("OpenAI", os.environ.get("OPENAI_API_KEY"))
    url = "https://api.openai.com/v1/chat/completions"
    
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})
    
    data = {"model": model, "messages": messages}
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {key}"}
    res = http_post(url, data, headers)
    return res["choices"][0]["message"]["content"]

def call_anthropic(prompt: str, system_instruction: Optional[str] = None, model: str = "claude-3-haiku-20240307") -> str:
    """Makes a call to the Anthropic Messages API."""
    key = validate_key("Anthropic", os.environ.get("ANTHROPIC_API_KEY"))
    url = "https://api.anthropic.com/v1/messages"
    
    data = {
        "model": model,
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": prompt}]
    }
    if system_instruction:
        data["system"] = system_instruction
        
    headers = {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
    }
    res = http_post(url, data, headers)
    return res["content"][0]["text"]

def call_perplexity(prompt: str, system_instruction: Optional[str] = None, model: str = "sonar") -> str:
    """Makes a call to the Perplexity Chat Completion API."""
    key = validate_key("Perplexity", os.environ.get("PERPLEXITY_API_KEY"))
    url = "https://api.perplexity.ai/chat/completions"
    
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})
    
    data = {"model": model, "messages": messages}
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {key}"}
    res = http_post(url, data, headers, max_retries=2)
    
    content = res["choices"][0]["message"]["content"]
    citations = res.get("citations", [])
    return json.dumps({"content": content, "citations": citations})
