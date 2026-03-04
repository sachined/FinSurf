import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
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

// Simple in-memory cache for the security guardrail to minimize API calls
// MAX_CACHE_SIZE prevents unbounded memory growth during long-running sessions.
const guardrailCache = new Map<string, { status: boolean; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 500; // evict oldest entry once this is exceeded

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
    execFile(pythonCommand, ["backend/agents.py", mode, ...argStrings], { env, maxBuffer: 1024 * 1024, timeout: 120_000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Exec error: ${error}`);
        reject(stderr || error.message);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);
  const isProd = process.env.NODE_ENV === "production";

  // Load secrets from files (Docker Secrets) or environment variables
  const GEMINI_API_KEY = getSecret("GEMINI_API_KEY", "GEMINI_API_KEY_FILE");
  const PERPLEXITY_API_KEY = getSecret("PERPLEXITY_API_KEY", "PERPLEXITY_API_KEY_FILE");
  const GROQ_API_KEY = getSecret("GROQ_API_KEY", "GROQ_API_KEY_FILE");
  const APP_SECRET = getSecret("APP_SECRET", "APP_SECRET_FILE");

  // Make secrets available to child processes (Python agents)
  process.env.GEMINI_API_KEY = GEMINI_API_KEY || "";
  process.env.PERPLEXITY_API_KEY = PERPLEXITY_API_KEY || "";
  process.env.GROQ_API_KEY = GROQ_API_KEY || "";

  // Security Middlewares
  // CSP is disabled in dev (Vite HMR requires relaxed policy);
  // in production the compiled dist/ assets are all same-origin.
  const useHttps = process.env.HTTPS === "true";
  app.use(helmet({
    // Disable HSTS when not behind HTTPS — otherwise the browser upgrades
    // all asset requests to https:// and the page fails to load over plain HTTP.
    hsts: useHttps ? { maxAge: 31536000, includeSubDomains: true } : false,
    contentSecurityPolicy: isProd ? {
      directives: {
        defaultSrc:           ["'self'"],
        scriptSrc:            ["'self'", "https://static.cloudflareinsights.com", "'sha256-oxQ1EoFDN3KqY0CGCVg2MoKi98m8iXgiT1ntlvDTVsc='"],
        styleSrc:             ["'self'", "'unsafe-inline'"],
        imgSrc:               ["'self'", "data:", "https:"],
        connectSrc:           ["'self'", "https://cloudflareinsights.com"],
        fontSrc:              ["'self'"],
        objectSrc:            ["'none'"],
        frameSrc:             ["'none'"],
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
  const DATE_RE   = /^\d{4}-\d{2}-\d{2}$/;

  const validateTicker = (ticker: unknown): string | null => {
    if (!ticker || typeof ticker !== "string") return null;
    const t = ticker.trim().toUpperCase();
    return TICKER_RE.test(t) ? t : null;
  };

  const validateDate = (date: unknown): boolean =>
    typeof date === "string" && DATE_RE.test(date.trim());

  // ── Health check (no auth required — used by Docker HEALTHCHECK) ──────────
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", uptime: Math.floor(process.uptime()) });
  });

  // ── Bearer-token authentication (optional — active when APP_SECRET is set) ─
  // Protects all /api/ routes from unauthorised use on a public server.
  // Set APP_SECRET to a long random string (e.g. `openssl rand -hex 32`).
  if (APP_SECRET) {
    app.use("/api/", (req: Request, res: Response, next: NextFunction) => {
      const auth = req.headers.authorization;
      if (!auth || auth !== `Bearer ${APP_SECRET}`) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      next();
    });
  }

  // Rate limiting to prevent abuse
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Too many requests from this IP, please try again after 15 minutes." }
  });
  app.use("/api/", limiter);

  // Extract user-supplied API keys from request headers (forwarded by the frontend).
  // These override the server's keys so the user's own quota is consumed.
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

  // Helper to check guardrail with caching
  const checkGuardrail = async (ticker: string, envOverrides?: Record<string, string>): Promise<boolean> => {
    const key = ticker.toUpperCase().trim();
    const cached = guardrailCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.status;
    }

    try {
      const result = await runPythonAgent("guardrail", [ticker], false, envOverrides);
      const status = result.trim() === "SAFE";
      if (guardrailCache.size >= MAX_CACHE_SIZE) {
        // Evict the oldest entry (Maps preserve insertion order)
        guardrailCache.delete(guardrailCache.keys().next().value!);
      }
      guardrailCache.set(key, { status, timestamp: Date.now() });
      return status;
    } catch (e) {
      return false; // Fail-safe
    }
  };

  // Log key presence on startup (without exposing the value)
  console.log("GEMINI_API_KEY present:", !!GEMINI_API_KEY);

  // API Routes
  app.post("/api/research", async (req, res) => {
    const ticker = validateTicker(req.body.ticker);
    if (!ticker) {
      res.status(400).json({ error: "ticker is required and must be 1–10 uppercase alphanumeric characters." });
      return;
    }
    console.log(`Researching: ${ticker}`);
    const userEnv = getUserKeyEnv(req);
    try {
      const isSafe = await checkGuardrail(ticker, userEnv);
      const stdout = await runPythonAgent("research", [ticker], isSafe, userEnv);
      try {
        const data = JSON.parse(stdout);
        res.json({ content: data.content, agentName: "Research Analyst", sources: parseCitations(data.citations), priceHistory: data.price_history || [] });
      } catch (e) {
        res.json({ content: stdout.trim(), agentName: "Research Analyst", priceHistory: [] });
      }
    } catch (error) {
      console.error("Research agent error:", error);
      res.status(500).json({ error: "Research analysis failed. Please try again." });
    }
  });

  app.post("/api/tax", async (req, res) => {
    const ticker = validateTicker(req.body.ticker);
    if (!ticker) {
      res.status(400).json({ error: "ticker is required and must be 1–10 uppercase alphanumeric characters." });
      return;
    }
    const { purchaseDate, sellDate } = req.body;
    if (!validateDate(purchaseDate) || !validateDate(sellDate)) {
      res.status(400).json({ error: "purchaseDate and sellDate are required in YYYY-MM-DD format." });
      return;
    }
    console.log(`Tax analysis: ${ticker}`);
    const userEnv = getUserKeyEnv(req);
    try {
      const isSafe = await checkGuardrail(ticker, userEnv);
      const stdout = await runPythonAgent("tax", [ticker, purchaseDate, sellDate], isSafe, userEnv);
      try {
        const data = JSON.parse(stdout);
        res.json({ content: data.content, agentName: "Tax Strategist", sources: parseCitations(data.citations) });
      } catch {
        res.json({ content: stdout.trim(), agentName: "Tax Strategist" });
      }
    } catch (error) {
      console.error("Tax agent error:", error);
      res.status(500).json({ error: "Tax analysis failed. Please try again." });
    }
  });

  app.post("/api/dividend", async (req, res) => {
    const ticker = validateTicker(req.body.ticker);
    if (!ticker) {
      res.status(400).json({ error: "ticker is required and must be 1–10 uppercase alphanumeric characters." });
      return;
    }
    const { shares, years } = req.body;
    const sharesNum = parseFloat(shares);
    const yearsNum = parseInt(years, 10);
    if (isNaN(sharesNum) || sharesNum <= 0 || sharesNum > 1_000_000) {
      res.status(400).json({ error: "shares must be a positive number no greater than 1,000,000." });
      return;
    }
    if (isNaN(yearsNum) || yearsNum <= 0 || yearsNum > 50) {
      res.status(400).json({ error: "years must be a positive integer no greater than 50." });
      return;
    }
    console.log(`Dividend analysis: ${ticker}`);
    const userEnv = getUserKeyEnv(req);
    try {
      const isSafe = await checkGuardrail(ticker, userEnv);
      const stdout = await runPythonAgent("dividend", [ticker, sharesNum, yearsNum], isSafe, userEnv);
      if (!stdout.trim()) throw new Error("Empty response from dividend agent");
      const data = JSON.parse(stdout);
      res.json({ 
        content: data.analysis, 
        agentName: "Dividend Specialist",
        isDividendStock: data.isDividendStock,
        hasDividendHistory: data.hasDividendHistory,
        stats: data.stats || null
      });
    } catch (e) {
      console.error(`Parse error: ${e}`);
      res.status(500).json({ error: "Failed to process dividend data" });
    }
  });

  app.post("/api/sentiment", async (req, res) => {
    const ticker = validateTicker(req.body.ticker);
    if (!ticker) {
      res.status(400).json({ error: "ticker is required and must be 1–10 uppercase alphanumeric characters." });
      return;
    }
    console.log(`Sentiment analysis: ${ticker}`);
    const userEnv = getUserKeyEnv(req);
    try {
      const isSafe = await checkGuardrail(ticker, userEnv);
      const stdout = await runPythonAgent("sentiment", [ticker], isSafe, userEnv);
      try {
        const data = JSON.parse(stdout);
        res.json({ content: data.content, agentName: "Social Sentiment Analyst", sources: parseCitations(data.citations) });
      } catch (e) {
        res.json({ content: stdout.trim(), agentName: "Social Sentiment Analyst" });
      }
    } catch (error) {
      console.error("Sentiment agent error:", error);
      res.status(500).json({ error: "Sentiment analysis failed. Please try again." });
    }
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
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
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

startServer();
