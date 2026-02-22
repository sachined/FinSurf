import express from "express";
import { createServer as createViteServer } from "vite";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pythonCommand = process.platform === "win32" ? "python" : "python3";

async function runPythonAgent(mode: string, args: (string | number)[]): Promise<string> {
  const formattedArgs = args.map(arg => `"${arg}"`).join(" ");
  return new Promise((resolve, reject) => {
    exec(`${pythonCommand} agents.py ${mode} ${formattedArgs}`, { env: process.env }, (error, stdout, stderr) => {
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
  const PORT = 3000;

  app.use(express.json());

  // Log key presence on startup
  console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);

  // API Routes
  app.post("/api/research", async (req, res) => {
    const { ticker } = req.body;
    console.log(`Researching: ${ticker}`);
    try {
      const stdout = await runPythonAgent("research", [ticker]);
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
      const stdout = await runPythonAgent("tax", [ticker, purchaseDate, sellDate]);
      res.json({ content: stdout.trim(), agentName: "Tax Strategist" });
    } catch (error) {
      res.status(500).json({ error });
    }
  });

  app.post("/api/dividend", async (req, res) => {
    const { ticker, shares, years } = req.body;
    console.log(`Dividend analysis: ${ticker}`);
    try {
      const stdout = await runPythonAgent("dividend", [ticker, shares, years]);
      const data = JSON.parse(stdout);
      res.json({ 
        content: data.analysis, 
        agentName: "Dividend Specialist",
        isDividendStock: data.isDividendStock,
        hasDividendHistory: data.hasDividendHistory
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
      const stdout = await runPythonAgent("sentiment", [ticker]);
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
