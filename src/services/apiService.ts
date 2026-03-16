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

  // Retrieve the VIP pass from localStorage if it exists
  const activePass = localStorage.getItem('finsurf_active_pass');
  if (activePass) {
    headers["X-FinSurf-Pass"] = activePass;
  }
  
  // Forward optional GPS coordinates if the user has enabled location tracking
  const lat = localStorage.getItem('finsurf_lat');
  const lon = localStorage.getItem('finsurf_lon');
  if (lat) headers["X-Lat"] = lat;
  if (lon) headers["X-Lon"] = lon;

  // Include the Bearer token for server-side API authentication.
  // This is baked into the frontend bundle at build time.
  const appSecret = import.meta.env.VITE_APP_SECRET;
  if (appSecret) {
    headers["Authorization"] = `Bearer ${appSecret}`;
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

export const validatePass = (pass: string): Promise<{ valid: boolean; expiry?: number }> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const appSecret = import.meta.env.VITE_APP_SECRET;
  if (appSecret) headers["Authorization"] = `Bearer ${appSecret}`;
  
  return fetch(`/api/validate-pass?pass=${encodeURIComponent(pass)}`, { headers })
    .then(res => res.json());
};
