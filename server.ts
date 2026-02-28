import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pythonCommand = process.platform === "win32" ? "python" : "python3";

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

async function runPythonAgent(mode: string, args: (string | number)[], skipGuardrail: boolean = false): Promise<string> {
  const env = { ...process.env, SKIP_GUARDRAIL: skipGuardrail ? "true" : "false" };
  const argStrings = args.map(String);

  return new Promise((resolve, reject) => {
    // execFile avoids shell injection — args are passed as an array, never interpolated
    // 120 s timeout prevents hung Python processes from blocking the event loop indefinitely
    execFile(pythonCommand, ["agents.py", mode, ...argStrings], { env, maxBuffer: 1024 * 1024, timeout: 120_000 }, (error, stdout, stderr) => {
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

  // Security Middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Vite needs this disabled or carefully configured for dev
  }));
  app.use(cors());
  app.use(express.json());

  // Rate limiting to prevent abuse
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Too many requests from this IP, please try again after 15 minutes." }
  });
  app.use("/api/", limiter);

  // Helper to check guardrail with caching
  const checkGuardrail = async (ticker: string): Promise<boolean> => {
    const key = ticker.toUpperCase().trim();
    const cached = guardrailCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.status;
    }

    try {
      const result = await runPythonAgent("guardrail", [ticker]);
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

  // Log key presence on startup
  console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);

  // API Routes
  app.post("/api/research", async (req, res) => {
    const { ticker } = req.body;
    if (!ticker || typeof ticker !== "string" || !ticker.trim()) {
      res.status(400).json({ error: "ticker is required." });
      return;
    }
    console.log(`Researching: ${ticker}`);
    try {
      const isSafe = await checkGuardrail(ticker);
      const stdout = await runPythonAgent("research", [ticker], isSafe);
      try {
        const data = JSON.parse(stdout);
        res.json({ content: data.content, agentName: "Research Analyst", sources: parseCitations(data.citations) });
      } catch (e) {
        res.json({ content: stdout.trim(), agentName: "Research Analyst" });
      }
    } catch (error) {
      res.status(500).json({ error });
    }
  });

  app.post("/api/tax", async (req, res) => {
    const { ticker, purchaseDate, sellDate } = req.body;
    if (!ticker || typeof ticker !== "string" || !ticker.trim()) {
      res.status(400).json({ error: "ticker is required." });
      return;
    }
    if (!purchaseDate || !sellDate) {
      res.status(400).json({ error: "purchaseDate and sellDate are required." });
      return;
    }
    console.log(`Tax analysis: ${ticker}`);
    try {
      const isSafe = await checkGuardrail(ticker);
      const stdout = await runPythonAgent("tax", [ticker, purchaseDate, sellDate], isSafe);
      try {
        const data = JSON.parse(stdout);
        res.json({ content: data.content, agentName: "Tax Strategist", sources: parseCitations(data.citations) });
      } catch {
        res.json({ content: stdout.trim(), agentName: "Tax Strategist" });
      }
    } catch (error) {
      res.status(500).json({ error });
    }
  });

  app.post("/api/dividend", async (req, res) => {
    const { ticker, shares, years } = req.body;
    if (!ticker || typeof ticker !== "string" || !ticker.trim()) {
      res.status(400).json({ error: "ticker is required." });
      return;
    }
    const sharesNum = parseFloat(shares);
    const yearsNum = parseInt(years, 10);
    if (isNaN(sharesNum) || sharesNum <= 0) {
      res.status(400).json({ error: "shares must be a positive number." });
      return;
    }
    if (isNaN(yearsNum) || yearsNum <= 0) {
      res.status(400).json({ error: "years must be a positive integer." });
      return;
    }
    console.log(`Dividend analysis: ${ticker}`);
    try {
      const isSafe = await checkGuardrail(ticker);
      const stdout = await runPythonAgent("dividend", [ticker, sharesNum, yearsNum], isSafe);
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
    const { ticker } = req.body;
    if (!ticker || typeof ticker !== "string" || !ticker.trim()) {
      res.status(400).json({ error: "ticker is required." });
      return;
    }
    console.log(`Sentiment analysis: ${ticker}`);
    try {
      const isSafe = await checkGuardrail(ticker);
      const stdout = await runPythonAgent("sentiment", [ticker], isSafe);
      try {
        const data = JSON.parse(stdout);
        res.json({ content: data.content, agentName: "Social Sentiment Analyst", sources: parseCitations(data.citations) });
      } catch (e) {
        res.json({ content: stdout.trim(), agentName: "Social Sentiment Analyst" });
      }
    } catch (error) {
      res.status(500).json({ error });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
