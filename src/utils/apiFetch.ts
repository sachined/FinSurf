/**
 * Low-level fetch wrapper that injects the app secret Authorization header
 * and throws on non-ok responses with a parsed error message.
 *
 * Use this for all internal API calls. Do NOT use it for third-party endpoints
 * (e.g. Stripe) that should not receive the app secret.
 */
export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const appSecret = import.meta.env.VITE_APP_SECRET;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (appSecret) {
    headers["Authorization"] = `Bearer ${appSecret}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Backend error");
  }

  return response.json() as Promise<T>;
}
