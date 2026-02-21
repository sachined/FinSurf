import express from "express";
import { createServer as createViteServer } from "vite";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Log key presence on startup
  console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);
  console.log("API_KEY present:", !!process.env.API_KEY);

  // API Routes
  app.post("/api/research", (req, res) => {
    const { ticker } = req.body;
    console.log(`Researching: ${ticker}`);
    exec(`python3 agents.py research "${ticker}"`, { env: process.env }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Exec error: ${error}`);
        return res.status(500).json({ error: stderr || error.message });
      }
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
    });
  });

  app.post("/api/tax", (req, res) => {
    const { ticker, purchaseDate, sellDate } = req.body;
    console.log(`Tax analysis: ${ticker}`);
    exec(`python3 agents.py tax "${ticker}" "${purchaseDate}" "${sellDate}"`, { env: process.env }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Exec error: ${error}`);
        return res.status(500).json({ error: stderr || error.message });
      }
      res.json({ content: stdout.trim(), agentName: "Tax Strategist" });
    });
  });

  app.post("/api/dividend", (req, res) => {
    const { ticker, shares, years } = req.body;
    console.log(`Dividend analysis: ${ticker}`);
    exec(`python3 agents.py dividend "${ticker}" "${shares}" "${years}"`, { env: process.env }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Exec error: ${error}`);
        return res.status(500).json({ error: stderr || error.message });
      }
      try {
        const data = JSON.parse(stdout);
        res.json({ 
          content: data.analysis, 
          agentName: "Dividend Specialist",
          isDividendStock: data.isDividendStock,
          hasDividendHistory: data.hasDividendHistory
        });
      } catch (e) {
        console.error(`Parse error: ${e}. Output: ${stdout}`);
        res.status(500).json({ error: "Failed to parse Python output", details: stdout });
      }
    });
  });

  app.post("/api/sentiment", (req, res) => {
    const { ticker } = req.body;
    console.log(`Sentiment analysis: ${ticker}`);
    exec(`python3 agents.py sentiment "${ticker}"`, { env: process.env }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Exec error: ${error}`);
        return res.status(500).json({ error: stderr || error.message });
      }
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
    });
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
