import express, { Request, Response, NextFunction } from "express";
import { writeFileSync } from "fs";
import crypto from "crypto";

interface AdminRouterDeps {
  ADMIN_SECRET: string | undefined;
  VALID_VIP_PASSES: Set<string>;
  runPythonAgent: (mode: string, args: string[]) => Promise<string>;
}

export function createAdminRouter(deps: AdminRouterDeps): express.Router {
  const { VALID_VIP_PASSES, runPythonAgent } = deps;
  const router = express.Router();

  // ── Admin panel ──────────────────────────────────────────────────────────
  // Protected by ADMIN_SECRET Bearer token. Intended to be accessed via
  // Cloudflare Access + Tunnel at admin.finsurf.ai in production.
  const requireAdmin = (_req: Request, res: Response, next: NextFunction) => {
    if (!deps.ADMIN_SECRET) {
      return res.status(503).json({ error: "Admin not configured (ADMIN_SECRET not set)." });
    }
    const auth = _req.headers.authorization;
    if (!auth || auth !== `Bearer ${deps.ADMIN_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  router.get("/admin/api/stats", requireAdmin, async (_req, res) => {
    try {
      const raw = await runPythonAgent("admin", []);
      res.json(JSON.parse(raw));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch admin stats." });
    }
  });

  router.get("/admin", requireAdmin, async (_req, res) => {
    let stats: any = {};
    try {
      const raw = await runPythonAgent("admin", []);
      stats = JSON.parse(raw);
    } catch (_) { /* show empty dashboard on error */ }

    const recent: any[] = stats.recent_requests || [];
    const byAgent: any[] = stats.by_agent || [];
    const cost24h = stats.total_cost_24h || {};
    const vipStats: Record<string, number> = stats.vip_stats || {};

    const recentRows = recent.map(r => `
      <tr>
        <td>${r.ticker || ""}</td>
        <td>${r.ts ? new Date(r.ts * 1000).toISOString().replace("T", " ").slice(0, 19) : ""}</td>
        <td>${r.agents || ""}</td>
        <td>$${(r.total_cost || 0).toFixed(6)}</td>
        <td><span class="badge ${r.pass_type === "vip" ? "vip" : "free"}">${r.pass_type || "unknown"}</span></td>
        <td>${r.country || "unknown"}</td>
      </tr>`).join("");

    const agentRows = byAgent.map(a => `
      <tr>
        <td>${a.agent}</td>
        <td>${a.calls}</td>
        <td>${Math.round(a.avg_input + a.avg_output)}</td>
        <td>$${(a.total_cost || 0).toFixed(6)}</td>
        <td>${Math.round(a.avg_latency_ms || 0)} ms</td>
      </tr>`).join("");

    // vipStats rendered inline in summary cards — no separate table needed

    const maskedPasses = Array.from(VALID_VIP_PASSES).map(p =>
      `<li>${p.slice(0, 4)}${"*".repeat(Math.max(0, p.length - 4))} <button onclick="revoke('${p}')">Revoke</button></li>`).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FinSurf Admin</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0d1117; color: #c9d1d9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", monospace; font-size: 14px; padding: 24px; }
    h1 { font-size: 22px; color: #f0f6fc; margin-bottom: 24px; }
    h2 { font-size: 15px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.08em; margin: 28px 0 12px; }
    .cards { display: flex; gap: 16px; flex-wrap: wrap; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px 20px; min-width: 160px; }
    .card .label { font-size: 11px; color: #8b949e; text-transform: uppercase; }
    .card .value { font-size: 24px; font-weight: 600; color: #58a6ff; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; background: #161b22; border: 1px solid #30363d; border-radius: 8px; overflow: hidden; }
    th { background: #21262d; color: #8b949e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 12px; text-align: left; }
    td { padding: 8px 12px; border-top: 1px solid #21262d; }
    tr:hover td { background: #1c2128; }
    .badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge.vip { background: #1a3a1a; color: #3fb950; border: 1px solid #238636; }
    .badge.free { background: #1a1f2e; color: #79c0ff; border: 1px solid #1f6feb; }
    button { background: #21262d; color: #c9d1d9; border: 1px solid #30363d; border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 12px; }
    button:hover { background: #30363d; }
    button.primary { background: #238636; border-color: #2ea043; color: #fff; }
    button.primary:hover { background: #2ea043; }
    button.danger { background: #6e1c1c; border-color: #da3633; color: #fff; }
    button.danger:hover { background: #da3633; }
    #msg { margin-top: 8px; font-size: 12px; color: #8b949e; }
    ul { list-style: none; }
    ul li { padding: 4px 0; display: flex; align-items: center; gap: 8px; }
  </style>
</head>
<body>
  <h1>FinSurf Admin</h1>

  <h2>Last 24 hours</h2>
  <div class="cards">
    <div class="card"><div class="label">Total tokens</div><div class="value">${(cost24h.total_tokens || 0).toLocaleString()}</div></div>
    <div class="card"><div class="label">Total cost</div><div class="value">$${(cost24h.total_cost_usd || 0).toFixed(4)}</div></div>
    <div class="card"><div class="label">VIP runs</div><div class="value">${vipStats["vip"] || 0}</div></div>
    <div class="card"><div class="label">Free runs</div><div class="value">${vipStats["free"] || 0}</div></div>
  </div>

  <h2>Recent queries</h2>
  <table>
    <thead><tr><th>Ticker</th><th>Time (UTC)</th><th>Agents</th><th>Cost</th><th>Pass</th><th>Country</th></tr></thead>
    <tbody>${recentRows || "<tr><td colspan='6' style='color:#8b949e'>No data yet</td></tr>"}</tbody>
  </table>

  <h2>Cost by agent</h2>
  <table>
    <thead><tr><th>Agent</th><th>Calls</th><th>Avg tokens</th><th>Total cost</th><th>Avg latency</th></tr></thead>
    <tbody>${agentRows || "<tr><td colspan='5' style='color:#8b949e'>No data yet</td></tr>"}</tbody>
  </table>

  <h2>VIP pass management</h2>
  <div class="card" style="max-width:480px">
    <ul id="passes">${maskedPasses || "<li style='color:#8b949e'>No passes loaded</li>"}</ul>
    <div style="margin-top:12px;display:flex;gap:8px;align-items:center">
      <button class="primary" onclick="generate()">+ Generate new pass</button>
      <div id="msg"></div>
    </div>
  </div>

  <script>
    const auth = prompt("Enter admin secret:");
    if (!auth) { document.body.innerHTML = "<p style='color:red;padding:24px'>No secret provided.</p>"; }

    async function apiFetch(path, method = "GET", body) {
      const r = await fetch(path, {
        method,
        headers: { "Authorization": "Bearer " + auth, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      return r.json();
    }

    async function generate() {
      const msg = document.getElementById("msg");
      msg.textContent = "Generating…";
      const d = await apiFetch("/admin/vip/generate", "POST");
      if (d.code) {
        msg.textContent = "Generated: " + d.code;
        setTimeout(() => location.reload(), 1500);
      } else {
        msg.textContent = d.error || "Error";
      }
    }

    async function revoke(code) {
      if (!confirm("Revoke " + code.slice(0,4) + "****?")) return;
      const d = await apiFetch("/admin/vip/revoke", "POST", { code });
      alert(d.ok ? "Revoked." : (d.error || "Error"));
      if (d.ok) location.reload();
    }
  </script>
</body>
</html>`;

    // Admin page uses inline <script> — override the global CSP for this route only.
    // This is acceptable: the route is already protected by ADMIN_SECRET + Cloudflare Access.
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-src 'none';");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });

  router.post("/admin/vip/generate", requireAdmin, (_req, res) => {
    try {
      const code = "FINSURF-" + crypto.randomBytes(6).toString("hex").toUpperCase();
      VALID_VIP_PASSES.add(code);
      const passesFile = process.env.VIP_PASSES_FILE;
      if (passesFile) {
        try {
          writeFileSync(passesFile, Array.from(VALID_VIP_PASSES).join(","), "utf-8");
        } catch (e) {
          console.error("Could not persist VIP passes to file:", e);
        }
      }
      res.json({ ok: true, code });
    } catch (e) {
      res.status(500).json({ error: "Failed to generate pass" });
    }
  });

  router.post("/admin/vip/revoke", requireAdmin, express.json(), (req, res) => {
    const { code } = req.body;
    if (!code || typeof code !== "string") return res.status(400).json({ error: "code required" });
    if (!VALID_VIP_PASSES.has(code)) return res.status(404).json({ error: "Pass not found" });
    VALID_VIP_PASSES.delete(code);
    const passesFile = process.env.VIP_PASSES_FILE;
    if (passesFile) {
      try {
        writeFileSync(passesFile, Array.from(VALID_VIP_PASSES).join(","), "utf-8");
      } catch (e) {
        console.error("Could not persist VIP passes to file:", e);
      }
    }
    res.json({ ok: true });
  });

  return router;
}
