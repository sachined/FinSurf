import { AgentResponse, DividendResponse } from '../types';

/** Shared POST helper — DRY wrapper for all API calls. */
async function apiPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
