import { UserApiKeys, FinancialAgentsState } from '../types';

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

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Backend error");
  }
  return response.json();
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
