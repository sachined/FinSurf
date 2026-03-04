import { AgentResponse, DividendResponse, ResearchResponse, UserApiKeys } from '../types';

// VITE_APP_SECRET is baked into the bundle at build time (via Docker build-arg).
// When set, it is sent as a Bearer token so the Express auth middleware can
// reject requests that did not originate from this frontend.
const APP_SECRET = import.meta.env.VITE_APP_SECRET as string | undefined;

/** Shared POST helper — DRY wrapper for all API calls. */
async function apiPost<T>(
  endpoint: string,
  body: Record<string, unknown>,
  userKeys?: UserApiKeys,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (APP_SECRET) {
    headers["Authorization"] = `Bearer ${APP_SECRET}`;
  }
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

export const researchAgent = (ticker: string, userKeys?: UserApiKeys): Promise<ResearchResponse> =>
  apiPost<ResearchResponse>("/api/research", { ticker }, userKeys);

export const taxAgent = (ticker: string, purchaseDate: string, sellDate: string, userKeys?: UserApiKeys): Promise<AgentResponse> =>
  apiPost<AgentResponse>("/api/tax", { ticker, purchaseDate, sellDate }, userKeys);

export const dividendAgent = (ticker: string, shares: number, years: number, userKeys?: UserApiKeys): Promise<DividendResponse> =>
  apiPost<DividendResponse>("/api/dividend", { ticker, shares, years }, userKeys);

export const sentimentAgent = (ticker: string, userKeys?: UserApiKeys): Promise<AgentResponse> =>
  apiPost<AgentResponse>("/api/sentiment", { ticker }, userKeys);
