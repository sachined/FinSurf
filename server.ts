import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from "fs";
import crypto from "crypto";
import Stripe from "stripe";
import { Resend } from "resend";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pythonCommand = process.platform === "win32" ? "python" : "python3";

// ── VIP Pass persistence ─────────────────────────────────────────────────────
// VIP_PASSES_FILE can be overridden (e.g. /app/data/vip_passes.json in Docker).
// Defaults to vip_passes.json next to server.ts for local development.
const PASSES_FILE = process.env.VIP_PASSES_FILE ?? path.join(__dirname, "vip_passes.json");

interface Pass {
  code: string;
  label: string;
  type?: "admin" | "paid";
  createdAt: number;
  expiresAt: number;
}

function loadPasses(): Pass[] {
  try {
    if (!existsSync(PASSES_FILE)) return [];
    return JSON.parse(readFileSync(PASSES_FILE, "utf-8")) as Pass[];
  } catch {
    return [];
  }
}

function savePasses(passes: Pass[]): void {
  mkdirSync(path.dirname(PASSES_FILE), { recursive: true });
  const tmp = PASSES_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(passes, null, 2), "utf-8");
  renameSync(tmp, PASSES_FILE);
}

function generatePassCode(): string {
  const part = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `FINSURF-${part()}-${part()}`;
}

function generatePaidPassCode(): string {
  const part = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `PAID-${part()}-${part()}`;
}

function buildActivationEmail(code: string, appUrl: string): string {
  const activationUrl = `${appUrl}?pass=${encodeURIComponent(code)}`;
  return `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;background:#f8fafc;padding:40px 20px;margin:0">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:24px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-size:30px;font-weight:900;color:#0f172a;letter-spacing:-1px">Fin<span style="color:#06b6d4">Surf</span>.ai</span>
    <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin:8px 0 0">Lifetime Access</p>
  </div>
  <p style="color:#334155;font-size:16px;margin:0 0 8px">Thanks for your purchase! Here is your access code:</p>
  <div style="background:#f0f9ff;border:2px solid #bae6fd;border-radius:16px;padding:24px;text-align:center;margin:0 0 24px">
    <code style="font-size:24px;font-weight:900;letter-spacing:6px;color:#0c4a6e">${code}</code>
  </div>
  <a href="${activationUrl}" style="display:block;background:#06b6d4;color:#fff;text-align:center;padding:16px;border-radius:14px;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:2px;text-decoration:none;margin:0 0 24px">Activate Now →</a>
  <div style="background:#f8fafc;border-radius:12px;padding:16px;margin:0 0 24px">
    <p style="color:#475569;font-size:13px;font-weight:700;margin:0 0 8px">What you get:</p>
    <ul style="color:#64748b;font-size:13px;margin:0;padding-left:16px;line-height:2">
      <li>Unlimited financial analyses</li>
      <li>All 5 AI agents — Research, Tax, Dividend, Sentiment, Summary</li>
      <li>Works with your own API keys</li>
      <li>Never expires</li>
    </ul>
  </div>
  <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">Questions? Reply to this email · FinSurf.ai</p>
</div></body></html>`;
}

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

interface RequestMetadata {
  userId?: string;
  ip?: string;
  lat?: string;
  lon?: string;
}

async function runPythonAgent(mode: string, args: (string | number)[], skipGuardrail: boolean = false, envOverrides?: Record<string, string>, metadata?: RequestMetadata): Promise<string> {
  const env = { 
    ...process.env, 
    SKIP_GUARDRAIL: skipGuardrail ? "true" : "false", 
    ...envOverrides,
    USER_ID: metadata?.userId || "",
    IP_ADDRESS: metadata?.ip || "",
    LAT: metadata?.lat || "",
    LON: metadata?.lon || ""
  };
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
  // Trust the reverse proxy (Caddy) so express-rate-limit reads the real
  // client IP from X-Forwarded-For instead of the internal container IP.
  app.set("trust proxy", 1);
  const PORT = parseInt(process.env.PORT || "3000", 10);
  const isProd = process.env.NODE_ENV === "production";

  // Load secrets from files (Docker Secrets) or environment variables
  const GEMINI_API_KEY = getSecret("GEMINI_API_KEY", "GEMINI_API_KEY_FILE");
  const PERPLEXITY_API_KEY = getSecret("PERPLEXITY_API_KEY", "PERPLEXITY_API_KEY_FILE");
  const GROQ_API_KEY = getSecret("GROQ_API_KEY", "GROQ_API_KEY_FILE");
  const APP_SECRET = getSecret("APP_SECRET", "APP_SECRET_FILE");
  const LANGCHAIN_API_KEY = getSecret("LANGCHAIN_API_KEY", "LANGCHAIN_API_KEY_FILE");
  const VIP_PASSES_STR = getSecret("VIP_PASSES", "VIP_PASSES_FILE") ?? "";
  const VALID_VIP_PASSES = new Set(VIP_PASSES_STR.split(",").map(p => p.trim()).filter(Boolean));

  const STRIPE_SECRET_KEY    = getSecret("STRIPE_SECRET_KEY",    "STRIPE_SECRET_KEY_FILE");
  const STRIPE_WEBHOOK_SECRET = getSecret("STRIPE_WEBHOOK_SECRET", "STRIPE_WEBHOOK_SECRET_FILE");
  const RESEND_API_KEY       = getSecret("RESEND_API_KEY",       "RESEND_API_KEY_FILE");
  const FROM_EMAIL  = process.env.FROM_EMAIL  || "onboarding@resend.dev";
  const APP_URL     = process.env.APP_URL     || (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : "https://finsurf.ai");

  const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
  const resend = RESEND_API_KEY    ? new Resend(RESEND_API_KEY)    : null;

  // Make secrets available to child processes (Python agents)
  process.env.GEMINI_API_KEY = GEMINI_API_KEY || "";
  process.env.PERPLEXITY_API_KEY = PERPLEXITY_API_KEY || "";
  process.env.GROQ_API_KEY = GROQ_API_KEY || "";
  if (LANGCHAIN_API_KEY) process.env.LANGCHAIN_API_KEY = LANGCHAIN_API_KEY;

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
        imgSrc:               ["'self'", "data:", "https:"],
        connectSrc:           ["'self'", "https://cloudflareinsights.com", "https://api.stripe.com"],
        fontSrc:              ["'self'"],
        objectSrc:            ["'none'"],
        frameSrc:             ["'none'", "https://js.stripe.com", "https://hooks.stripe.com"],
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

  // ── Stripe webhook — MUST be before express.json() to receive raw body ──────
  // Stripe sends application/json but signature verification requires the raw Buffer.
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      return res.status(503).json({ error: "Stripe not configured" });
    }
    const sig = req.headers["stripe-signature"];
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("Stripe webhook signature error:", err);
      return res.status(400).json({ error: "Invalid signature" });
    }

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const email = intent.metadata.customer_email;
      if (email) {
        const code = generatePaidPassCode();
        const now = Date.now();
        const pass: Pass = {
          code,
          label: `Paid — ${email}`,
          type: "paid",
          createdAt: now,
          expiresAt: now + 100 * 365 * 24 * 60 * 60 * 1000,
        };
        const passes = loadPasses();
        passes.push(pass);
        savePasses(passes);
        console.log(`Paid pass generated for ${email}: ${code}`);

        if (resend) {
          try {
            await resend.emails.send({
              from: FROM_EMAIL,
              to: email,
              subject: "Your FinSurf lifetime access code",
              html: buildActivationEmail(code, APP_URL),
            });
          } catch (e) {
            console.error("Failed to send activation email:", e);
          }
        } else {
          console.warn("RESEND_API_KEY not set — activation email not sent. Code:", code);
        }
      }
    }

    res.json({ received: true });
  });

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
    if (typeof pass !== 'string' || !pass) return res.json({ valid: false });

    // Check env-var set first (fast path)
    if (VALID_VIP_PASSES.has(pass)) {
      const expiry = Date.now() + 15 * 24 * 60 * 60 * 1000;
      return res.json({ valid: true, expiry });
    }

    // Check JSON-persisted admin passes
    const now = Date.now();
    const match = loadPasses().find(p => p.code === pass && p.expiresAt > now);
    if (match) return res.json({ valid: true, expiry: match.expiresAt });

    res.json({ valid: false });
  });


  // Rate limiting to prevent abuse
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Too many requests from this IP, please try again after 15 minutes." }
  });
  app.use("/api/", limiter);

  // ── Stripe: create payment intent (rate-limited, public — no APP_SECRET required) ──
  app.post("/api/stripe/create-payment-intent", async (req: Request, res: Response) => {
    if (!stripe) return res.status(503).json({ error: "Stripe not configured" });

    const { email } = req.body;
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Valid email required" });
    }

    try {
      const intent = await stripe.paymentIntents.create({
        amount: 1500, // $15.00 USD
        currency: "usd",
        receipt_email: email,
        metadata: { customer_email: email },
        automatic_payment_methods: { enabled: true },
      });
      res.json({ clientSecret: intent.client_secret });
    } catch (err) {
      console.error("Stripe PaymentIntent error:", err);
      res.status(500).json({ error: "Payment initialization failed" });
    }
  });

  // ── Bearer-token auth — protects all /api/ routes if APP_SECRET is configured ──
  if (APP_SECRET) {
    app.use("/api/", (req, res, next) => {
      // Skip auth for health check
      if (req.path === "/health") return next();
      
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${APP_SECRET}`) {
        return res.status(401).json({ error: "Unauthorized — Invalid or missing API secret" });
      }
      next();
    });
  }

  // ── Admin auth middleware ─────────────────────────────────────────────────
  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!APP_SECRET || token !== APP_SECRET) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  }

  // ── Admin: VIP Pass Management ───────────────────────────────────────────
  app.post("/api/admin/passes", requireAdmin, (req, res) => {
    const label: string = req.body.label ?? "";
    const days: number = Number(req.body.days) || 15;
    const code = generatePassCode();
    const now = Date.now();
    const pass: Pass = { code, label, createdAt: now, expiresAt: now + days * 24 * 60 * 60 * 1000 };
    const passes = loadPasses();
    passes.push(pass);
    savePasses(passes);
    res.json({ code: pass.code, expiresAt: pass.expiresAt });
  });

  app.get("/api/admin/passes", requireAdmin, (_req, res) => {
    const now = Date.now();
    const passes = loadPasses().map(p => ({ ...p, expired: p.expiresAt <= now }));
    res.json(passes);
  });

  app.delete("/api/admin/passes/:code", requireAdmin, (req, res) => {
    const { code } = req.params;
    const passes = loadPasses();
    const filtered = passes.filter(p => p.code !== code);
    if (filtered.length === passes.length) {
      return res.status(404).json({ error: "Pass not found" });
    }
    savePasses(filtered);
    res.json({ revoked: code });
  });

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

  // Simplified cache check
const getCachedGuardrailStatus = (ticker: string): boolean | null => {
  const key = ticker.toUpperCase().trim();
  const cached = guardrailCache.get(key);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.status;
  }
  return null;
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

    // Extract tracking metadata from headers
    const metadata: RequestMetadata = {
      userId: req.headers["x-finsurf-pass"] as string,
      ip: req.ip,
      lat: req.headers["x-lat"] as string,
      lon: req.headers["x-lon"] as string,
    };

    const cachedStatus = getCachedGuardrailStatus(ticker);
    const skipGuardrail = cachedStatus === true;

    try {
      const args= [
        ticker,
        purchaseDate || "",
        sellDate || "",
        shares || 1.0,
        years || 3
      ];

      const stdout = await runPythonAgent("graph", args, skipGuardrail, userEnv, metadata);
      const graphData = JSON.parse(stdout);

      // Update the cache if we performed a fresh check
      if (!skipGuardrail) {
        guardrailCache.set(ticker.toUpperCase(), {
          status: !!graphData.is_safe,
          timestamp: Date.now()
        });
      }

      // Map the LangGraph state back to the frontend
      const resRaw = graphData.research_output ? JSON.parse(graphData.research_output) : null;
      const research = resRaw ? {
        content:      resRaw.content,
        agentName:    "Research Analyst",
        sources:      parseCitations(resRaw.citations),
        priceHistory: graphData.price_history || [],
        currentPrice: graphData.current_price ?? null,
        pnlSummary:   graphData.pnl_summary   ?? null,
      } : null;

      const taxRaw = graphData.tax_output ? JSON.parse(graphData.tax_output) : null;
      const tax = taxRaw ? { 
        agentName: "Tax Strategist", 
        content: taxRaw.content, 
        sources: parseCitations(taxRaw.citations) 
      } : null;

      const sentRaw = graphData.sentiment_output ? JSON.parse(graphData.sentiment_output) : null;
      const sentiment = sentRaw ? { 
        agentName: "Social Sentiment Analyst", 
        content: sentRaw.content, 
        sources: parseCitations(sentRaw.citations) 
      } : null;

      const sumRaw = graphData.executive_summary_output ? JSON.parse(graphData.executive_summary_output) : null;
      const summary = sumRaw ? { 
        agentName: "Executive Summary", 
        content: sumRaw.content, 
        sources: parseCitations(sumRaw.citations) 
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
        };
      }

      res.json({ research, tax, sentiment, dividend, summary });
    } catch (error) {
      console.error("Unified graph error:", error);
      res.status(500).json({ error: "Analysis failed." });
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