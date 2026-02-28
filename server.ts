import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pythonCommand = process.platform === "win32" ? "python" : "python3";

// Simple in-memory cache for the security guardrail to minimize API calls
const guardrailCache = new Map<string, { status: boolean; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function runPythonAgent(mode: string, args: (string | number)[], skipGuardrail: boolean = false): Promise<string> {
  const formattedArgs = args.map(arg => `"${arg}"`).join(" ");
  const env = { ...process.env, SKIP_GUARDRAIL: skipGuardrail ? "true" : "false" };
  
  return new Promise((resolve, reject) => {
    // Increased maxBuffer to 1MB to handle large LLM responses
    exec(`${pythonCommand} agents.py ${mode} ${formattedArgs}`, { env, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
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
    const cached = guardrailCache.get(ticker);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.status;
    }

    try {
      const result = await runPythonAgent("guardrail", [ticker]);
      const status = result.trim() === "SAFE";
      guardrailCache.set(ticker, { status, timestamp: Date.now() });
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
    console.log(`Researching: ${ticker}`);
    try {
      const isSafe = await checkGuardrail(ticker);
      const stdout = await runPythonAgent("research", [ticker], isSafe);
      try {
        const data = JSON.parse(stdout);
        res.json({ 
          content: data.content, 
          agentName: "Research Analyst",
          sources: data.citations.map((url: string) => ({ title: new URL(url).hostname, uri: url }))
        });
      } catch (e) {
        res.json({ content: stdout.trim(), agentName: "Research Analyst" });
      }
    } catch (error) {
      res.status(500).json({ error });
    }
  });

  app.post("/api/tax", async (req, res) => {
    const { ticker, purchaseDate, sellDate } = req.body;
    console.log(`Tax analysis: ${ticker}`);
    try {
      const isSafe = await checkGuardrail(ticker);
      const stdout = await runPythonAgent("tax", [ticker, purchaseDate, sellDate], isSafe);
      res.json({ content: stdout.trim(), agentName: "Tax Strategist" });
    } catch (error) {
      res.status(500).json({ error });
    }
  });

  app.post("/api/dividend", async (req, res) => {
    const { ticker, shares, years } = req.body;
    console.log(`Dividend analysis: ${ticker}`);
    try {
      const isSafe = await checkGuardrail(ticker);
      const stdout = await runPythonAgent("dividend", [ticker, shares, years], isSafe);
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
    console.log(`Sentiment analysis: ${ticker}`);
    try {
      const isSafe = await checkGuardrail(ticker);
      const stdout = await runPythonAgent("sentiment", [ticker], isSafe);
      try {
        const data = JSON.parse(stdout);
        res.json({ 
          content: data.content, 
          agentName: "Social Sentiment Analyst",
          sources: data.citations.map((url: string) => ({ title: new URL(url).hostname, uri: url }))
        });
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
