export interface Env {
  RATE_LIMIT_KV: KVNamespace;
  APP_SECRET: string;
  ORIGIN_URL: string;
}

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_WINDOW_SECONDS = RATE_WINDOW_MS / 1000;
const RATE_LIMIT = 100;
const JSON_CONTENT_TYPE = { "Content-Type": "application/json" };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // /health passes through — no auth, no rate limit (used by Docker healthcheck)
    if (url.pathname === "/health") {
      return fetch(`${env.ORIGIN_URL}/health`);
    }

    if (url.pathname.startsWith("/api/")) {
      // 1. Auth check
      const auth = request.headers.get("Authorization");
      if (env.APP_SECRET && auth !== `Bearer ${env.APP_SECRET}`) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: JSON_CONTENT_TYPE }
        );
      }

      // 2. Rate limit (skip validate-pass — it's a cheap read, no Python spawn)
      if (url.pathname !== "/api/validate-pass") {
        const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
        const limited = await isRateLimited(ip, env.RATE_LIMIT_KV);
        if (limited) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please wait 15 minutes." }),
            { status: 429, headers: { ...JSON_CONTENT_TYPE, "Retry-After": String(RATE_WINDOW_SECONDS) } }
          );
        }
      }
    }

    // Proxy to origin
    return fetch(new Request(`${env.ORIGIN_URL}${url.pathname}${url.search}`, request));
  }
};

async function isRateLimited(ip: string, kv: KVNamespace): Promise<boolean> {
  const key = `rl:${ip}`;
  const now = Date.now();
  type Entry = { count: number; window_start: number };
  const entry = await kv.get<Entry>(key, "json");

  if (!entry || now - entry.window_start > RATE_WINDOW_MS) {
    // Fire-and-forget — avoids blocking the response path; window precision is best-effort
    kv.put(key, JSON.stringify({ count: 1, window_start: now }), { expirationTtl: RATE_WINDOW_SECONDS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  const serialized = JSON.stringify({ count: entry.count + 1, window_start: entry.window_start });
  kv.put(key, serialized, { expirationTtl: RATE_WINDOW_SECONDS });
  return false;
}
