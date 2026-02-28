import { AgentResponse, DividendResponse } from '../types';

// VITE_APP_SECRET is baked into the bundle at build time (via Docker build-arg).
// When set, it is sent as a Bearer token so the Express auth middleware can
// reject requests that did not originate from this frontend.
const APP_SECRET = import.meta.env.VITE_APP_SECRET as string | undefined;

/** Shared POST helper — DRY wrapper for all API calls. */
async function apiPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (APP_SECRET) {
    headers["Authorization"] = `Bearer ${APP_SECRET}`;
  }
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

export const researchAgent = (ticker: string): Promise<AgentResponse> =>
  apiPost<AgentResponse>("/api/research", { ticker });

export const taxAgent = (ticker: string, purchaseDate: string, sellDate: string): Promise<AgentResponse> =>
  apiPost<AgentResponse>("/api/tax", { ticker, purchaseDate, sellDate });

export const dividendAgent = (ticker: string, shares: number, years: number): Promise<DividendResponse> =>
  apiPost<DividendResponse>("/api/dividend", { ticker, shares, years });

export const sentimentAgent = (ticker: string): Promise<AgentResponse> =>
  apiPost<AgentResponse>("/api/sentiment", { ticker });
