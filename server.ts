import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pythonCommand = process.platform === "win32" ? "python" : "python3";

// ── Helper to read secrets from files or environment ────────────────────────
// In Docker Swarm/Kubernetes, secrets are mounted as files in /run/secrets/
// Falls back to environment variables for backwards compatibility.
function getSecret(envVar: string, fileEnvVar: string): string | undefined {
  const filePath = process.env[fileEnvVar];
  if (filePath) {
    try {
      return readFileSync(filePath, "utf-8").trim();
    } catch (e) {
      console.error(`Failed to read secret from ${filePath}:`, e);
      return undefined;
    }
  }
  return process.env[envVar];
}

// a Simple in-memory cache for the security guardrail to minimize API calls
// MAX_CACHE_SIZE prevents unbounded memory growth during long-running sessions.
const guardrailCache = new Map<string, { status: boolean; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 500; // evict the oldest entry once this is exceeded

/** Parse citation URLs from LLM output into {title, uri} objects, dropping malformed URLs. */
function parseCitations(citations: unknown[]): { title: string; uri: string }[] {
  if (!Array.isArray(citations)) return [];
  return citations.flatMap((url: unknown) => {
    if (typeof url !== "string") return [];
    try { return [{ title: new URL(url).hostname, uri: url }]; }
    catch { return []; }
  });
}

async function runPythonAgent(mode: string, args: (string | number)[], skipGuardrail: boolean = false, envOverrides?: Record<string, string>): Promise<string> {
  const env = { ...process.env, SKIP_GUARDRAIL: skipGuardrail ? "true" : "false", ...envOverrides };
  const argStrings = args.map(String);

  return new Promise((resolve, reject) => {
    // execFile avoids shell injection — args are passed as an array, never interpolated
    // 120 s timeout prevents hung Python processes from blocking the event loop indefinitely
    execFile(pythonCommand, ["backend/agents.py", mode, ...argStrings], { env, maxBuffer: 4 * 1024 * 1024, timeout: 120_000 }, (error, stdout, stderr) => {
      // Python scripts write debug logs to stderr even on success
      // Only fail if there was an error AND we got no valid JSON output
      if (error) {
        // If we have stdout despite error, Python succeeded (stderr debug logs trigger "error")
        if (stdout && stdout.trim().startsWith('{')) {
          resolve(stdout);
        } else {
          console.error(`Python agent failed: ${error.message}`);
          if (stderr) console.error(`Stderr: ${stderr}`);
          // Attach stderr so the route handler can surface it in dev mode
          reject(Object.assign(new Error(error.message), { pythonStderr: stderr || "" }));
        }
      } else {
        resolve(stdout);
      }
    });
  });
}

async function startServer() {
  const app = express();
  // Trust the reverse proxy (Caddy) so express-rate-limit reads the real
  // client IP from X-Forwarded-For instead of the internal container IP.
  app.set("trust proxy", 1);
  const PORT = parseInt(process.env.PORT || "3000", 10);
  const isProd = process.env.NODE_ENV === "production";

  // Fail fast if the production build is missing — avoids a mysterious 404
  // on every page load instead of a clear startup error.
  if (isProd && !existsSync(path.join(__dirname, "dist", "index.html"))) {
    console.error("❌ Production build not found. Run `npm run build` before starting the server.");
    process.exit(1);
  }

  // Load secrets from files (Docker Secrets) or environment variables.
  // This MUST happen before validate_env.py is called so the child process
  // inherits GEMINI_API_KEY / GROQ_API_KEY from process.env.
  const GEMINI_API_KEY = getSecret("GEMINI_API_KEY", "GEMINI_API_KEY_FILE");
  const PERPLEXITY_API_KEY = getSecret("PERPLEXITY_API_KEY", "PERPLEXITY_API_KEY_FILE");
  const GROQ_API_KEY = getSecret("GROQ_API_KEY", "GROQ_API_KEY_FILE");
  const APP_SECRET = getSecret("APP_SECRET", "APP_SECRET_FILE");
  const LANGCHAIN_API_KEY    = getSecret("LANGCHAIN_API_KEY",    "LANGCHAIN_API_KEY_FILE");
  const ALPHA_VANTAGE_API_KEY = getSecret("ALPHA_VANTAGE_API_KEY", "ALPHA_VANTAGE_API_KEY_FILE");
  const FINNHUB_API_KEY       = getSecret("FINNHUB_API_KEY",       "FINNHUB_API_KEY_FILE");
  const VIP_PASSES_STR = getSecret("VIP_PASSES", "VIP_PASSES_FILE") || "FINSURF_BETA_2026";
  const VALID_VIP_PASSES = new Set(VIP_PASSES_STR.split(",").map(p => p.trim()).filter(Boolean));

  // Inject secrets into process.env so all child processes (Python agents,
  // validate_env.py) inherit them without any further plumbing.
  process.env.GEMINI_API_KEY = GEMINI_API_KEY || "";
  process.env.PERPLEXITY_API_KEY = PERPLEXITY_API_KEY || "";
  process.env.GROQ_API_KEY = GROQ_API_KEY || "";
  if (LANGCHAIN_API_KEY)    process.env.LANGCHAIN_API_KEY    = LANGCHAIN_API_KEY;
  if (ALPHA_VANTAGE_API_KEY) process.env.ALPHA_VANTAGE_API_KEY = ALPHA_VANTAGE_API_KEY;
  if (FINNHUB_API_KEY)       process.env.FINNHUB_API_KEY       = FINNHUB_API_KEY;

  // Validate environment — runs after secrets are loaded so the child process
  // sees GEMINI_API_KEY / GROQ_API_KEY in its environment.
  console.log("Validating environment...");
  try {
    const validationResult = await new Promise<string>((resolve, reject) => {
      execFile(pythonCommand, ["backend/validate_env.py"], { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
          reject(stderr || error.message);
        } else {
          resolve(stderr); // validation script writes to stderr
        }
      });
    });
    console.log(validationResult);
  } catch (err) {
    console.error("Environment validation failed:", err);
    process.exit(1);
  }

  // Security Middlewares
  // CSP is disabled in dev (Vite HMR requires relaxed policy);
  // in production the compiled dist/ assets are all same-origin.
  const useHttps = process.env.HTTPS === "true";
  app.use(helmet({
    // Disable HSTS when not behind HTTPS — otherwise the browser upgrades
    // all asset requests to https://, and the page fails to load over plain HTTP.
    hsts: useHttps ? { maxAge: 31536000, includeSubDomains: true } : false,
    contentSecurityPolicy: isProd ? {
      directives: {
        defaultSrc:           ["'self'"],
        scriptSrc:            ["'self'", "https://static.cloudflareinsights.com", "https://js.stripe.com"],
        styleSrc:             ["'self'", "'unsafe-inline'"],
        imgSrc:               ["'self'", "data:", "https:", "https://*.stripe.com"],
        connectSrc:           ["'self'", "https://cloudflareinsights.com", "https://api.stripe.com"],
        fontSrc:              ["'self'"],
        objectSrc:            ["'none'"],
        frameSrc:             ["https://js.stripe.com", "https://hooks.stripe.com"],
        workerSrc:            ["'self'"],
        upgradeInsecureRequests: useHttps ? [] : null,
      },
    } : false,
  }));

  // Lock CORS to the configured origin(s) in production.
  // Multiple origins can be supplied as a comma-separated list in CORS_ORIGIN.
  const rawOrigins = process.env.CORS_ORIGIN || "";
  const allowedOrigins = rawOrigins
    ? rawOrigins.split(",").map((o) => o.trim()).filter(Boolean)
    : null; // null = allow any origin (dev default)
  app.use(cors(allowedOrigins ? { origin: allowedOrigins, credentials: true } : {}));

  app.use(express.json({ limit: "16kb" }));

  // ── Input validation helpers ──────────────────────────────────────────────
  // Tickers: uppercase letters, digits, dot, hyphen only — max 10 chars.
  // This matches the fast-path in the Python guardrail and prevents oversized
  // or space-containing strings from ever reaching the child process.
  const TICKER_RE = /^[A-Z0-9.\-]{1,10}$/;

  const validateTicker = (ticker: unknown): string | null => {
    if (!ticker || typeof ticker !== "string") return null;
    const t = ticker.trim().toUpperCase();
    return TICKER_RE.test(t) ? t : null;
  };

  // ── Health check (no auth required — used by Docker health check) ──────────
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", uptime: Math.floor(process.uptime()) });
  });

  // ── VIP Pass Validation ──────────────────────────────────────────────────
  app.get("/api/validate-pass", (req, res) => {
    const pass = req.query.pass;
    if (typeof pass === 'string' && VALID_VIP_PASSES.has(pass)) {
      // Return 30-day expiry from now
      const expiry = Date.now() + 15 * 24 * 60 * 60 * 1000;
      return res.json({ valid: true, expiry });
    }
    res.json({ valid: false });
  });


  // Rate limiting to prevent abuse — VIP pass holders are exempt.
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => {
      const pass = req.headers["x-finsurf-pass"];
      return typeof pass === "string" && VALID_VIP_PASSES.has(pass);
    },
    message: { error: "Rate limit exceeded. Too many requests from your IP address. Please wait 15 minutes before trying again." }
  });
  app.use("/api/", limiter);

  // ── Bearer-token auth — protects all /api/ routes if APP_SECRET is configured ──
  if (APP_SECRET) {
    app.use("/api/", (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${APP_SECRET}`) {
        return res.status(401).json({ error: "Unauthorized — Invalid or missing API secret" });
      }
      next();
    });
  }

  // Extract user-supplied API keys from request headers (forwarded by the frontend).
  // These override the server's keys, so the user's own quota is consumed.
  function getUserKeyEnv(req: Request): Record<string, string> {
    const overrides: Record<string, string> = {};
    const gemini     = req.headers["x-user-gemini-key"];
    const perplexity = req.headers["x-user-perplexity-key"];
    const groq       = req.headers["x-user-groq-key"];
    if (typeof gemini     === "string" && gemini)     overrides["GEMINI_API_KEY"]     = gemini;
    if (typeof perplexity === "string" && perplexity) overrides["PERPLEXITY_API_KEY"] = perplexity;
    if (typeof groq       === "string" && groq)       overrides["GROQ_API_KEY"]       = groq;
    return overrides;
  }

  const getCachedGuardrailStatus = (ticker: string): boolean | null => {
    const key = ticker.toUpperCase().trim();
    const cached = guardrailCache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp >= CACHE_TTL) {
      guardrailCache.delete(key); // evict stale entry
      return null;
    }
    return cached.status;
  };

  const setGuardrailCache = (ticker: string, status: boolean) => {
    const key = ticker.toUpperCase().trim();
    // Evict the oldest entry before adding a new one if at capacity
    if (!guardrailCache.has(key) && guardrailCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = guardrailCache.keys().next().value;
      if (oldestKey !== undefined) guardrailCache.delete(oldestKey);
    }
    guardrailCache.set(key, { status, timestamp: Date.now() });
  };

  // Log key presence on startup (without exposing the value)
  console.log("GEMINI_API_KEY present:", !!GEMINI_API_KEY);

  // API Routes
  // ── Unified Graph API ──────────────────────────────────────────────────
  app.post("/api/analyze", async (req, res) => {
    const ticker = validateTicker(req.body.ticker);
    if (!ticker) return res.status(400).json({ error: "Invalid ticker" });

    const { purchaseDate, sellDate, shares, years } = req.body;
    const userEnv = getUserKeyEnv(req);

    const cachedStatus = getCachedGuardrailStatus(ticker);
    const skipGuardrail = cachedStatus === true;

    // RACE CONDITION FIX: Optimistic cache write BEFORE Python call
    // Prevents duplicate guardrail checks when concurrent requests arrive
    // for the same ticker while the first is still processing
    if (!skipGuardrail) {
      setGuardrailCache(ticker, true); // Optimistically assume safe; corrected below
    }

    try {
      const args= [
        ticker,
        purchaseDate || "",
        sellDate || "",
        shares || 1.0,
        years || 3
      ];

      const stdout = await runPythonAgent("graph", args, skipGuardrail, userEnv);
      const graphData = JSON.parse(stdout);

      // Correct the cache entry with the actual guardrail result
      if (!skipGuardrail) {
        setGuardrailCache(ticker, !!graphData.is_safe);
      }

      // Timestamp for all responses (Unix ms)
      const timestamp = Date.now();

      // Map the LangGraph state back to the frontend
      const resRaw = graphData.research_output ? JSON.parse(graphData.research_output) : null;
      const research = resRaw ? {
        content:      resRaw.content,
        agentName:    "Research Analyst",
        sources:      parseCitations(resRaw.citations),
        priceHistory: graphData.price_history || [],
        currentPrice: graphData.current_price ?? null,
        pnlSummary:   graphData.pnl_summary   ?? null,
        timestamp,
      } : null;

      const taxRaw = graphData.tax_output ? JSON.parse(graphData.tax_output) : null;
      const tax = taxRaw ? {
        agentName: "Tax Strategist",
        content: taxRaw.content,
        sources: parseCitations(taxRaw.citations),
        timestamp,
      } : null;

      const sentRaw = graphData.sentiment_output ? JSON.parse(graphData.sentiment_output) : null;
      const sentiment = sentRaw ? {
        agentName: "Social Sentiment Analyst",
        content: sentRaw.content,
        sources: parseCitations(sentRaw.citations),
        timestamp,
      } : null;

      const sumRaw = graphData.executive_summary_output ? JSON.parse(graphData.executive_summary_output) : null;
      const summary = sumRaw ? {
        agentName: "Executive Summary",
        content: sumRaw.content,
        sources: parseCitations(sumRaw.citations),
        timestamp,
      } : null;

      // Extract dividend data if present
      let dividend = null;
      if (graphData.dividend_output) {
        const div = graphData.dividend_output;
        dividend = {
          agentName: "Dividend Specialist",
          isDividendStock: div.isDividendStock,
          hasDividendHistory: div.hasDividendHistory,
          content: div.analysis || "Dividend analysis unavailable.",
          stats: div.stats || null,
          sources: parseCitations(div.citations),
          timestamp,
        };
      }

      res.json({ research, tax, sentiment, dividend, summary });
    } catch (error) {
      console.error("Unified graph error:", error);

      // Provide more specific error messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      const pythonStderr = (error as any)?.pythonStderr as string | undefined;

      if (errorMessage.toLowerCase().includes('ticker') || errorMessage.toLowerCase().includes('not found')) {
        return res.status(404).json({
          error: `Ticker "${ticker}" not found. Please verify the stock symbol is correct.`
        });
      }

      if (errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('quota')) {
        return res.status(429).json({
          error: "API rate limit reached. Please try again in a few minutes."
        });
      }

      // In development, surface the Python stderr so it appears in the browser console / network tab
      if (!isProd && pythonStderr) {
        return res.status(500).json({
          error: "Analysis failed (dev mode — see details below).",
          details: pythonStderr.slice(-2000), // last 2000 chars to keep response reasonable
        });
      }

      // Generic fallback
      res.status(500).json({
        error: "Analysis failed. Some data sources may be temporarily unavailable. Please try again."
      });
    }
  });

  // Stripe payment intent — not yet implemented; returns 501 so the frontend
  // gets a clear error instead of a generic 404 / HTML fallback.
  app.post("/api/stripe/create-payment-intent", (_req, res) => {
    res.status(501).json({ error: "Stripe integration coming soon." });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));

    app.get("*", (req, res) => {
      if (req.path.match(/\.(html|css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$/)) {
        return res.status(404).send('Not found');
      }
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
      // If the request looks like an asset (ends in .css, .js, .png, etc.), don't send index.html
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown — allows in-flight Python child processes to complete
  // before the container is stopped (SIGTERM from Docker / Kubernetes).
  const shutdown = (signal: string) => {
    console.log(`${signal} received — shutting down gracefully`);
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
    // Force-exit after 10 s if requests are still pending
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

startServer().catch(err => {
  console.error("Critical: Server startup failed:", err);
  process.exit(1);
});