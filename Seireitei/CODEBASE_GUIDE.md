# FinSurf — Codebase Navigation Guide

> **Last Updated:** March 20, 2026

## Architecture in One Paragraph

FinSurf is a single-container web app. An **Express server** (`server.ts`) serves the compiled React SPA and exposes a single `/api/analyze` endpoint. When that endpoint is called it spawns a Python child process (`backend/agents.py`) which runs a **LangGraph state machine** that fans out to five financial AI agents in parallel. Each agent calls external LLM APIs (Gemini, Groq, Perplexity) and financial data APIs (Yahoo Finance, Finnhub, Alpha Vantage), then returns structured JSON with timestamps that Express maps back to the frontend. The frontend displays results with real-time timestamp badges and maintains recent searches in localStorage.

---

## Request Lifecycle

```
Browser → POST /api/analyze
  → server.ts          (validates ticker, checks VIP pass, fires execFile)
  → backend/agents.py  (CLI dispatcher, picks "graph" mode)
  → backend/graph.py   (LangGraph DAG)
       ├─ guardrail     (ticker safety check — exits early if unsafe)
       ├─ research      (fundamentals + price history)
       ├─ tax_dividend  (P&L + dividend narration, run in parallel with sentiment)
       ├─ sentiment     (Reddit/StockTwits/news mood)
       └─ summary       (synthesises all four above)
  → stdout JSON → server.ts parses → res.json() → frontend
```

---

## Key Files — Quick Reference

### Root
| File | What it does |
|------|-------------|
| `server.ts` | Express entry point. API routes (admin delegated to `routes/adminRouter.ts`), secret loading, Python child process launch, Vite dev middleware |
| `routes/adminRouter.ts` | Admin panel routes — dashboard, stats, VIP pass generate/revoke. Mounted by `server.ts` via `createAdminRouter()` |
| `vite.config.ts` | Vite bundler — warns if `VITE_APP_SECRET` unset at prod build time |
| `package.json` | Scripts: `dev` (tsx), `build` (vite), `start` (prod — requires `dist/` to exist) |
| `requirements.txt` | Python deps — LangGraph, yfinance, pandas, curl-cffi, langsmith |
| `.env.nonsecret` | Non-secret env vars committed to repo: PORT, NODE_ENV, DOMAIN, VIP_PASSES, provider allowlist |
| `check-config.ps1` | Windows pre-deploy validator — checks secrets dir, docker-compose paths, `.env.nonsecret` fields |

### Frontend (`src/`)
| Path | What it does |
|------|-------------|
| `App.tsx` | Root. Owns all top-level state: search form, responses, loading, modals, theme, compare mode |
| `types.ts` | Single source of truth for all TypeScript types — `AgentResponse`, `FinancialAgentsState`, `LoadingState`, `UserApiKeys` |
| `utils/apiFetch.ts` | Centralized fetch wrapper — injects `Authorization: Bearer` from `VITE_APP_SECRET` on every request |
| `services/apiService.ts` | All HTTP calls. Uses `apiFetch` internally. Attaches user-supplied LLM keys, VIP pass header |
| `hooks/useFinancialAgents.ts` | Calls `analyzeAgent`, fans loading/response state out per agent. Also owns compare-mode state |
| `hooks/useFormState.ts` | Ticker, purchase date, sell date, shares — with validation |
| `hooks/useTheme.ts` | Dark/light toggle, persisted to localStorage |
| `components/results/ResultsGrid.tsx` | Renders the 4 agent cards. Handles both single-ticker and side-by-side compare layout |
| `components/cards/AgentCard.tsx` | The card itself — loading skeleton, markdown body, dividend stats, price chart, source badges, timestamp badge |
| `components/ui/TimestampBadge.tsx` | Displays relative time ("Just now", "2 minutes ago") with stale data warnings (amber badge for > 1 hour old) |
| `components/forms/SearchForm.tsx` | Ticker input + optional dates/shares. Example ticker buttons. Recent searches (localStorage, last 5). PDF download |
| `styles/pdf.css` | Print stylesheet — A4 landscape, forces light mode, hides chrome, controls card layout for PDF |
| `test/accessibility.test.tsx` | Vitest + jest-axe tests for accessibility (aria-expanded, aria-busy, touch targets, cursor-pointer) |
| `test/setup.ts` | Vitest setup — jest-dom matchers, axe configured to skip color-contrast in jsdom |

### Backend (`backend/`)
| Path | What it does |
|------|-------------|
| `agents.py` | CLI entry point. Parses argv, routes to `graph.run_graph()` or the guardrail directly. Attaches timestamps to all responses |
| `graph.py` | LangGraph `StateGraph` definition. Wires the agent DAG and `FinSurfState` schema. Adds timestamp metadata |
| `data_fetcher.py` | All market data — yfinance price history, P&L calculation, Finnhub news, Alpha Vantage |
| `llm_providers.py` | `call_gemini()`, `call_groq()`, `call_perplexity()`. Raw HTTP, no SDKs. LangSmith tracing |
| `retry_utils.py` | `with_fallback()` decorator (used by `_helpers.py`). `exponential_backoff_retry()` and `retry_with_fallback()` present but not currently wired — kept for future use |
| `telemetry.py` | SQLite token/cost tracking. Written after every agent run. Path controlled by `TELEMETRY_DB` env |
| `validate_env.py` | Run at server startup. Exits 1 if no LLM key present. Warns on optional keys |
| `financial_agents/__init__.py` | Re-exports all 5 agent functions for clean imports in `graph.py` |
| `financial_agents/_helpers.py` | Shared LLM call pattern: Groq → Gemini fallback with `with_fallback()` |
| `financial_agents/guardrail.py` | Regex fast-path + LLM safety check. Blocks non-stock tickers |
| `financial_agents/research.py` | Fundamental analysis. Calls Gemini with yfinance + Finnhub grounding |
| `financial_agents/tax_dividend.py` | P&L tax brackets + conditional dividend narration (skips LLM call if not a dividend stock) |
| `financial_agents/sentiment.py` | Social mood via StockTwits, Finnhub news, SEC EDGAR. Perplexity → Gemini fallback |
| `financial_agents/summary.py` | Receives all four agent outputs, synthesises with Gemini |

### Deployment (`deploy/`)
| Path | What it does |
|------|-------------|
| `Dockerfile` | Multi-stage Alpine build: Node builds `dist/`, then Node+Python runtime |
| `docker-compose.yml` | Local dev stack |
| `docker-compose.prod.yml` | Production — Caddy reverse proxy, auto-TLS, Docker Secrets |
| `Caddyfile` | HTTPS termination, static asset caching, rate limiting |
| `docker-entrypoint.sh` | Graceful SIGTERM handling for the Node process |

### Other
| Path | What it does |
|------|-------------|
| `worker/` | Cloudflare Workers experiment — separate project with its own `src/` and `node_modules`. Not part of the main deployment |
| `scripts/generate-passes.ts` | Admin tool — generates VIP access codes (run with `npm run generate-passes`) |
| `scripts/view_tracking.py` | Reads `finsurf_telemetry.db` to display token usage/costs |
| `sync-prod.ps1` | Pulls `finsurf_telemetry.db` from the production container for local inspection |

---

## Environment Variables

### Required at runtime (via Docker Secrets or env)
| Variable | Used by |
|----------|---------|
| `GEMINI_API_KEY` | All agents (primary LLM) |
| `APP_SECRET` | Bearer token auth on all `/api/` routes |

### Optional but functional
| Variable | Effect if missing |
|----------|------------------|
| `GROQ_API_KEY` | Groq fallback unavailable |
| `PERPLEXITY_API_KEY` | Sentiment agent falls back to Gemini only |
| `ALPHA_VANTAGE_API_KEY` | News sentiment skipped |
| `FINNHUB_API_KEY` | Insider transactions + news skipped |
| `LANGCHAIN_API_KEY` | LangSmith tracing disabled |

### Build-time (must be set before `npm run build`)
| Variable | Effect if missing |
|----------|------------------|
| `VITE_APP_SECRET` | Frontend sends unauthenticated requests → 401 if `APP_SECRET` is set server-side |

### Non-secret (in `.env.nonsecret`)
`PORT`, `NODE_ENV`, `DOMAIN`, `TELEMETRY_DB`, `TELEMETRY_DISABLED`, `ALLOWED_PROVIDERS`, `VIP_PASSES`, LangSmith vars

`DAILY_BUDGET_USD` — **planned, not yet enforced.** The field exists in `.env.example` but is not read by any current code.

---

## VIP Pass System

1. Codes live in `VIP_PASSES` in `.env.nonsecret`
2. User visits `/?pass=CODE` → frontend calls `/api/validate-pass?pass=CODE`
3. Server validates against `VALID_VIP_PASSES` set, returns 30-day expiry
4. Frontend stores pass + expiry in `localStorage`
5. On subsequent API calls, `apiService.ts` attaches `X-FinSurf-Pass` header
6. **Server-side effect:** rate limiter (`express-rate-limit`) `skip`s requests with a valid pass
7. **Client-side effect:** usage counter modal is bypassed

To generate new codes: `npm run generate-passes`

---

## Adding a New Agent

1. **Python:** create `backend/financial_agents/my_agent.py`, export a function matching the LangGraph node signature
2. **Register:** add to `backend/financial_agents/__init__.py` and wire into the DAG in `backend/graph.py`
3. **Types:** add response field to `FinancialAgentsState` and `LoadingState` in `src/types.ts`
4. **Hook:** add loading/response keys in `src/hooks/useFinancialAgents.ts`
5. **UI:** add an `<AgentCard>` in `src/components/results/ResultsGrid.tsx` with `staticSources` and `loadingLabel`
6. **WelcomeHero:** add an entry to the `AGENTS` array in `src/components/ui/WelcomeHero.tsx`

---

## Common Tasks

| Task | Command |
|------|---------|
| Start dev server | `.\dev.ps1` or `npm run dev` |
| Production build | `npm run build` |
| Start production | `npm run build && npm run start` |
| Run Python tests | `npm run test:backend` |
| Run frontend tests | `npm run test:frontend` |
| Run all tests | `npm test` |
| Validate config | `.\check-config.ps1` |
| View telemetry | `npm run view-tracking` |
| Pull prod telemetry | `.\sync-prod.ps1` |
| Docker dev | `cd deploy && docker compose up` |
| Docker prod | `cd deploy && docker compose -f docker-compose.prod.yml up -d` |
