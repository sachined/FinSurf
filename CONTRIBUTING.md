# Contributing to FinSurf 🏄‍♂️

Thank you for your interest in contributing! Whether you're fixing a bug, adding a new agent, improving tests, or enhancing the UI, all contributions are appreciated.

---

## Table of Contents

- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Running Tests](#-running-tests)
- [Code Conventions](#-code-conventions)
- [Adding a New Agent](#-adding-a-new-agent)
- [LLM Provider & Cost Policy](#-llm-provider--cost-policy)
- [Docker & Production Deployment](#-docker--production-deployment)
- [Submitting a Pull Request](#-submitting-a-pull-request)
- [Reporting Bugs](#-reporting-bugs)
- [Contact](#-contact)

---

## 🛠 Getting Started

### Prerequisites

- **Node.js** v24+
- **Python** 3.13+
- At minimum, a **Gemini API key** (free tier works for development)

### Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/sachined/FinSurf.git
cd FinSurf

# 2. Install Node dependencies
npm install

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env and add your API keys (see reference below)

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables Reference

| Variable             | Required    | Description                                                        |
|----------------------|-------------|--------------------------------------------------------------------|
| `GEMINI_API_KEY`     | ✅          | Primary LLM provider                                               |
| `PERPLEXITY_API_KEY` | Optional    | Real-time web search for Research & Sentiment agents               |
| `GROQ_API_KEY`       | Optional    | Fast inference fallback for Tax and Research agents (Groq cloud)   |
| `APP_SECRET`         | Recommended | Bearer token protecting all `/api/` routes                         |
| `CORS_ORIGIN`        | Production  | Comma-separated allowed origins                                    |
| `DOMAIN`             | Production  | Domain for Caddy TLS certificate                                   |
| `DAILY_BUDGET_USD`   | Optional    | Hard daily spend cap (e.g. `0.50`)                                 |
| `TELEMETRY_DB`       | Optional    | SQLite path (default: `finsurf_telemetry.db`)                      |
| `ALLOWED_PROVIDERS`  | Optional    | Comma-separated provider allowlist (e.g. `gemini,perplexity,groq`) |

---

## 📁 Project Structure

```
FinSurf/
├── backend/
│   ├── agents.py            # CLI entry point — dispatches to LangGraph
│   ├── graph.py             # LangGraph StateGraph definition and FinSurfState schema
│   ├── financial_agents/    # Agent implementations (one module per agent)
│   │   ├── guardrail.py     # Ticker validation
│   │   ├── research.py      # Equity research (Perplexity / Gemini)
│   │   ├── tax_dividend.py  # Combined tax + dividend agent
│   │   ├── sentiment.py     # Market sentiment (Perplexity / Gemini)
│   │   ├── summary.py       # Executive summary (template-based, zero LLM tokens)
│   │   └── _helpers.py      # Shared LLM call helpers and fallback logic
│   ├── data_fetcher.py      # yfinance, Finnhub, and P&L calculation
│   ├── telemetry.py         # Token usage & cost tracking (SQLite)
│   ├── llm_providers.py     # Provider abstraction (Gemini, Perplexity, Groq)
│   ├── utils.py             # Shared helpers
│   └── tests/               # Python unit tests (unittest + mocks)
├── src/
│   ├── App.tsx              # Root component & state orchestration
│   ├── components/          # UI components (cards, layout, forms, results)
│   ├── hooks/               # Custom React hooks (theme, form, agents)
│   ├── services/
│   │   ├── apiService.ts    # HTTP helpers for backend communication
│   │   └── pdf.css          # PDF-specific styles
│   └── utils/
│       └── pdfGenerator.ts  # PDF export logic (html2canvas + jsPDF)
├── server.ts                # Express server & API endpoints
├── Dockerfile
├── docker-compose.yml
└── docker-compose.prod.yml
```

---

## 🧪 Running Tests

All backend tests use Python's `unittest` with fully mocked LLM calls — no real API tokens are consumed during testing.

```bash
# Run all backend tests
python -m pytest backend/tests/

# Or with unittest directly
python -m unittest discover -s backend/tests
```

Tests cover five modules: `financial_agents` (agents), `data_fetcher`, `graph`, `telemetry`, and `utils`.

**When contributing, please ensure:**
- New agent modules include a corresponding test file following the existing mock pattern.
- New utility functions have unit test coverage.
- All existing tests pass before opening a PR.

---

## 📐 Code Conventions

### Python (Backend)
- Follow **PEP 8**.
- Use type hints on function signatures.
- Mock all external LLM and API calls in tests — never make real network requests from tests.
- Each agent lives in its own module under `backend/financial_agents/`; keep graph wiring in `graph.py`.

### TypeScript / React (Frontend)
- Follow the existing component structure under `src/components/`.
- New UI features belong in a dedicated, focused component â€” avoid adding logic to `App.tsx` directly.
- Custom hooks go in `src/hooks/`.
- Keep PDF-related logic in `src/utils/pdfGenerator.ts`.

### General
- Keep PRs focused — one feature or fix per PR.
- Match the naming and formatting style of the surrounding code.
- Do not commit `.env` files or real API keys.

---

## 🤖 Adding a New Agent

FinSurf's agent pipeline is defined in `backend/graph.py` as a LangGraph `StateGraph`. To add a new specialist agent:

1. **Implement the agent function** as a new module in `backend/financial_agents/` (e.g. `my_agent.py`), following the signature of existing agents. The function receives `FinSurfState` and returns a partial state update. Export it from `backend/financial_agents/__init__.py`.

2. **Register the node** in `graph.py`:
   ```python
   graph.add_node("my_agent", my_agent_function)
   ```

3. **Wire the edges** — decide whether the node is sequential, parallel (via `Send` API), or conditional:
   ```python
   # Conditional example (like the Dividend node)
   graph.add_conditional_edges("research", route_to_my_agent, {"run": "my_agent", "skip": "next_node"})
   ```

4. **Add telemetry** — call `record_usage()` from `telemetry.py` inside your agent to track token consumption.

5. **Write tests** in `backend/tests/` using the existing mock pattern. New agents must not call real LLM APIs in tests.

6. **Expose the result** — add the output field to `FinSurfState` (TypedDict in `graph.py`) and update `server.ts` to pass it through to the frontend if needed.

---

## 💰 LLM Provider & Cost Policy

To keep API costs predictable:

- **Default providers:** Gemini (`gemini-flash-latest`) + Perplexity (`sonar`).
- **Token caps:** `max_tokens` is generally limited to 500–800 per agent call, `temperature` at 0.1.
- **Guardrail short-circuit:** Valid ticker-format inputs (A–Z/0–9/.- up to 10 chars) bypass the LLM guardrail entirely.
- **Conditional dividend node:** Skipped for non-dividend stocks, saving ~2,000 tokens per query.

Control which providers are active via environment variables:

```bash
# Use only Gemini (lowest cost, no real-time web search)
export ALLOWED_PROVIDERS=gemini

# Default: Gemini + Perplexity (recommended)
export ALLOWED_PROVIDERS=gemini,perplexity,groq

# Enable all providers
export ALLOWED_PROVIDERS=gemini,perplexity,groq
```

When adding a new agent, use the existing `llm_providers.py` abstraction — do not hardcode a provider directly.

---

## 🔒 Security

### API Keys

- **Never commit `.env`** or any file containing real API keys. `.env` is listed in both `.gitignore` and `.dockerignore`.
- Use `.env.example` (no real values) as the committed reference. Copy it to `.env` locally and fill in your keys.
- If a key is accidentally exposed (e.g. shown in a log, pushed to a public repo, or shared in a conversation), **rotate it immediately** in the relevant provider dashboard:
  - Gemini: [Google AI Studio → API keys](https://aistudio.google.com/app/apikey)
  - Perplexity: [Settings → API](https://www.perplexity.ai/settings/api)
  - OpenAI: [Platform → API keys](https://platform.openai.com/api-keys)
  - Anthropic: [Console → API keys](https://console.anthropic.com/settings/keys)
- Generate `APP_SECRET` with `openssl rand -hex 32`. Treat it like a password.

### APP_SECRET and the JS Bundle

`APP_SECRET` is passed to Vite as `VITE_APP_SECRET` at build time and baked into the JavaScript bundle. This means anyone who opens browser DevTools can read it. As a result, `APP_SECRET` provides **rate-limiting and abuse-deterrence** — not true authentication. It stops casual scraping and accidental exposure, but a determined attacker can extract it from the bundle.

This is a known, intentional trade-off for this architecture (no login system). Mitigations already in place:

- Rate limiting: 100 requests per IP per 15-minute window (`express-rate-limit`).
- Daily spend cap: `DAILY_BUDGET_USD` in `.env` hard-stops LLM calls once the budget is exhausted.
- CORS locked to production domain in `docker-compose.prod.yml`.

If FinSurf is ever exposed to untrusted users, the correct upgrade path is to add a login layer (e.g. Lucia Auth or Clerk) so the bearer token is per-session, not baked into the bundle.

### Input Validation

All API routes enforce a strict allowlist on user input before any data reaches the Python child process:

- **Ticker:** `^[A-Z0-9.\-]{1,10}$` — uppercase letters, digits, dot, hyphen only. Enforced at both the Express layer (`server.ts`) and the Python guardrail (`financial_agents.py`).
- **Dates:** `YYYY-MM-DD` format validated by regex before being passed to the tax agent.
- **Shares / Years:** Positive numbers with upper bounds (≤ 1,000,000 shares, ≤ 50 years).
- **Request body:** Capped at 16 kb by `express.json({ limit: "16kb" })`.

### Container Hardening

The production Docker image runs as the non-root `node` user (uid 1000). This limits the blast radius of any container escape — the process cannot modify system files or bind privileged ports.

---

## 🐳 Docker & Production Deployment

FinSurf ships with a single-container Docker setup. Both the Node.js server and the Python LangGraph backend run inside one image — no inter-container networking required.

### Local (no HTTPS)

```bash
cp .env.example .env        # fill in API keys
docker compose build
docker compose up -d
# → http://localhost:3000
```

### Internet-facing server with automatic HTTPS

Prerequisites: a domain with an A record pointing to your server's public IP, and ports 80/443 open.

```bash
echo "DOMAIN=finsurf.example.com" >> .env
echo "APP_SECRET=$(openssl rand -hex 32)" >> .env
echo "CORS_ORIGIN=https://finsurf.example.com" >> .env

docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
# → https://finsurf.example.com (Caddy provisions Let's Encrypt automatically)
```

### Persistent Data

SQLite databases are stored in a named Docker volume (`finsurf_data`) mounted at `/app/data`. Data survives container restarts and image rebuilds.

### Health Check

`GET /health` (no auth required) returns `{"status":"ok","uptime":<seconds>}` — used by Docker's built-in `HEALTHCHECK` and any upstream load balancer.

### Recommended VPS Providers

| Provider                 | Est. Monthly Cost | Notes                                                 |
|--------------------------|-------------------|-------------------------------------------------------|
| **Fly.io**               | ~$5â€“10          | Best Docker-native PaaS; persistent volumes; auto TLS |
| **DigitalOcean Droplet** | ~$6               | Most control; run Docker Compose yourself             |
| **Railway**              | ~$5               | Easiest setup; builds from Dockerfile                 |

---

## 🔀 Submitting a Pull Request

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```
2. Make your changes, following the conventions above.
3. Ensure all tests pass (`python -m pytest backend/tests/`).
4. Open a Pull Request against `main` with a clear description of:
   - What the change does
   - Why it's needed
   - Any trade-offs or follow-up work
5. PRs that add new agent modules or utility functions without tests will not be merged.

---

## 🐛 Reporting Bugs

Open a GitHub Issue and include:

- The stock ticker and inputs that triggered the bug
- The exact error message or unexpected output
- Your environment (OS, Node version, Python version)
- Steps to reproduce

---

## 📬 Contact

For questions or discussions, reach out to Sachin at `sachin.nediyanchath@gmail.com`.