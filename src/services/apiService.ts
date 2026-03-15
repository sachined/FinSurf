import { AgentResponse, DividendResponse, PnLSummary, ResearchResponse, UserApiKeys, FinancialAgentsState } from '../types';

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

export const researchAgent = (ticker: string, purchaseDate: string, sellDate: string, shares: number, userKeys?: UserApiKeys): Promise<ResearchResponse> =>
  apiPost<ResearchResponse>("/api/research", { ticker, purchaseDate, sellDate, shares }, userKeys);

export const taxAgent = (ticker: string, purchaseDate: string, sellDate: string, shares: number, userKeys?: UserApiKeys): Promise<AgentResponse> =>
  apiPost<AgentResponse>("/api/tax", { ticker, purchaseDate, sellDate, shares }, userKeys);

export const dividendAgent = (ticker: string, shares: number, years: number, purchaseDate?: string, sellDate?: string, userKeys?: UserApiKeys): Promise<DividendResponse> =>
  apiPost<DividendResponse>("/api/dividend", { ticker, shares, years, purchaseDate, sellDate }, userKeys);

export const sentimentAgent = (ticker: string, userKeys?: UserApiKeys): Promise<AgentResponse> =>
  apiPost<AgentResponse>("/api/sentiment", { ticker }, userKeys);

export const summaryAgent = (
  ticker: string,
  researchContent: string | null,
  taxContent: string | null,
  dividendContent: string | null,
  sentimentContent: string | null,
  pnlSummary: PnLSummary | null,
  userKeys?: UserApiKeys,
): Promise<AgentResponse> =>
  apiPost<AgentResponse>("/api/summary", {
    ticker,
    researchContent,
    taxContent,
    dividendContent,
    sentimentContent,
    pnlSummary,
  }, userKeys);

export const analyzeAgent = (
  ticker: string,
  purchaseDate: string,
  sellDate: string,
  shares: number,
  years: number,
  userKeys?: UserApiKeys
): Promise<FinancialAgentsState> =>
  apiPost<FinancialAgentsState>("/api/analyze", { ticker, purchaseDate, sellDate, shares, years }, userKeys);
