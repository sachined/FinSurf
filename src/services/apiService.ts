import { UserApiKeys, FinancialAgentsState } from '../types';
import { LS_KEYS } from '../constants';
import { apiFetch } from '../utils/apiFetch';

/** Shared POST helper — DRY wrapper for all API calls. */
async function apiPost<T>(
  endpoint: string,
  body: Record<string, unknown>,
  userKeys?: UserApiKeys,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Forward user-supplied keys so the server can use them instead of server keys.
  if (userKeys?.geminiKey)    headers["X-User-Gemini-Key"]     = userKeys.geminiKey;
  if (userKeys?.perplexityKey) headers["X-User-Perplexity-Key"] = userKeys.perplexityKey;
  if (userKeys?.groqKey)      headers["X-User-Groq-Key"]       = userKeys.groqKey;

  // Send the active VIP pass so the server can exempt it from rate limiting.
  const activePass = localStorage.getItem(LS_KEYS.activePass);
  if (activePass) headers["X-FinSurf-Pass"] = activePass;

  return apiFetch<T>(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

export const analyzeAgent = (
  ticker: string,
  purchaseDate: string,
  sellDate: string,
  shares: number,
  years: number,
  userKeys?: UserApiKeys
): Promise<FinancialAgentsState> =>
  apiPost<FinancialAgentsState>("/api/analyze", { ticker, purchaseDate, sellDate, shares, years }, userKeys);

export const createPaymentIntent = (email: string): Promise<{ clientSecret: string }> =>
  fetch("/api/stripe/create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }).then(res => {
    if (!res.ok) return res.json().then(e => Promise.reject(new Error(e.error || "Request failed")));
    return res.json();
  });

export const validatePass = (pass: string): Promise<{ valid: boolean; expiry?: number }> =>
  apiFetch<{ valid: boolean; expiry?: number }>(
    `/api/validate-pass?pass=${encodeURIComponent(pass)}`,
    { headers: { "Content-Type": "application/json" } },
  );
