import express from "express";
import { createServer as createViteServer } from "vite";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/research", (req, res) => {
    const { ticker } = req.body;
    exec(`python3 agents.py research "${ticker}"`, (error, stdout, stderr) => {
      if (error) return res.status(500).json({ error: stderr });
      res.json({ content: stdout.trim(), agentName: "Research Analyst" });
    });
  });

  app.post("/api/tax", (req, res) => {
    const { ticker, purchaseDate, sellDate } = req.body;
    exec(`python3 agents.py tax "${ticker}" "${purchaseDate}" "${sellDate}"`, (error, stdout, stderr) => {
      if (error) return res.status(500).json({ error: stderr });
      res.json({ content: stdout.trim(), agentName: "Tax Strategist" });
    });
  });

  app.post("/api/dividend", (req, res) => {
    const { ticker, shares, years } = req.body;
    exec(`python3 agents.py dividend "${ticker}" "${shares}" "${years}"`, (error, stdout, stderr) => {
      if (error) return res.status(500).json({ error: stderr });
      try {
        const data = JSON.parse(stdout);
        res.json({ 
          content: data.analysis, 
          agentName: "Dividend Specialist",
          isDividendStock: data.isDividendStock,
          hasDividendHistory: data.hasDividendHistory
        });
      } catch (e) {
        res.status(500).json({ error: "Failed to parse Python output" });
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
