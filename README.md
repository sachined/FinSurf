# FinSurf 🏄‍♂️

**FinSurf** is a sophisticated, AI-driven stock analysis platform designed to help investors navigate market volatility. By deploying a collaborative network of specialized autonomous agents, FinSurf transforms raw market data into professional-grade investment reports in seconds.

<p align="center">
  <a href="#-overview"><b>🌟 Overview</b></a> &nbsp; • &nbsp;
  <a href="#-key-features"><b>🚀 Key Features</b></a> &nbsp; • &nbsp;
  <a href="#-the-agent-network"><b>🤖 Agent Network</b></a> &nbsp; • &nbsp;
  <a href="#-tech-stack--architecture"><b>🛠 Tech Stack</b></a> &nbsp; • &nbsp;
  <a href="#-system-architecture--data-flow"><b>🏗 Architecture</b></a> &nbsp; • &nbsp;
  <a href="#-visuals--reports"><b>📸 Visuals & Reports</b></a> &nbsp; • &nbsp;
  <a href="#-future-roadmap"><b>🔮 Future Roadmap</b></a> &nbsp; • &nbsp;
  <a href="#-getting-started"><b>🚀 Getting Started</b></a> &nbsp; • &nbsp;
  <a href="#-contributing"><b>🤝 Contributing</b></a>
</p>

---

## 🌟 Overview

**FinSurf** is designed to take the complexity out of stock analysis. Instead of manually searching for data across multiple websites, FinSurf uses a team of **AI Autonomous Agents** to gather, analyze, and summarize everything you need to know about a stock in one place. It’s like having a team of elite financial analysts working for you around the clock.

### 🎯 Who is it for?
*   **Individual Investors**: Get professional-grade research without the complexity.
*   **Time-Savers**: Get a comprehensive view of a stock in seconds, not hours.
*   **Clarity Seekers**: See how research, taxes, dividends, and market sentiment all fit together.

### 📖 How to Use FinSurf
1.  **Identify your Target**: Enter a stock ticker symbol (like `AAPL` for Apple or `TSLA` for Tesla).
2.  **Provide Context**: Enter when you bought (or plan to buy) the stock and how many shares you hold.
3.  **Ride the Wave**: Click the **Surf** button. Our AI agents will immediately begin their specialized analysis.
4.  **Instant Insights**: Review the results in your interactive dashboard as the agents report back.
5.  **Export & Share**: Click **Download PDF** to generate a beautiful, professionally formatted report of the entire analysis.

---

## 🚀 Key Features

*   **🤖 Multi-Agent Intelligence**: Four specialized AI agents work in parallel to provide research, tax, dividend, and sentiment analysis.
*   **📄 Professional PDF Reports**: Optimized, high-quality analysis reports with row-based grouping, automated color conversion for modern CSS, and adaptive pagination. Choose between **Standard** and **High-Density (HD)** layouts via a dedicated toggle.
*   **🎨 Personalized Experience**: Choose between Light/Dark modes and multiple themes, including **Accessibility Optimized** and **Enhanced Tropical** modes.
*   **🏙️ Compact Grid Layout**: Automatic grid compression and seamless card design for a unified report look once generation is complete.
*   **🔌 Flexible AI Backend**: LangGraph-orchestrated backend with conditional routing, parallel fan-out, and automatic fallback across Gemini, OpenAI, Anthropic, and Perplexity.
*   **⚡ Modern Tech Stack**: React 19, Vite 6, Tailwind CSS 4, Express, and a LangGraph-powered Python backend.

---

## 🤖 The Agent Network

FinSurf leverages a **LangGraph state-machine** where each agent is a specialist node in a directed graph. The guardrail runs first, then research fans out to tax and sentiment in parallel. The dividend node is only invoked when the research node signals the ticker pays dividends — saving tokens on every non-dividend query.

*   **🔍 Research Analyst**: Performs deep-dives into stock performance, key metrics, and fundamental data.
*   **⚖️ Tax Strategist**: Analyzes holding periods and provides US tax implications (Short-term vs. Long-term Capital Gains).
*   **💰 Dividend Specialist**: Projects future payouts with mathematical precision, accounting for fractional shares.
*   **🗣️ Social Sentiment Analyst**: Scours Reddit, X, StockTwits, and news outlets to gauge real-time investor mood.

---

## 🛠 Tech Stack & Architecture

FinSurf is built with a highly modular and encapsulated architecture:

### Frontend (React + Vite + Tailwind CSS)
*   **Modular Components**: Extracted UI elements for better maintainability (e.g., `Mascot`, `AgentCard`, `SearchForm`, `ResultsGrid`).
*   **Advanced Document Engineering**: Professional PDF generation using `html2canvas` and `jsPDF` with parallelized capture, adaptive pagination, automated color conversion (`oklch` support), and **Dual-Density layouts** (Standard vs HD).
*   **Unified Report Look**: Automatic shift to a dense, gapless layout upon analysis completion, providing a cohesive, professional-grade visual experience.
*   **Dynamic Theme Engine**: State-managed experience between Light, Dark, Tropical (immersive blur effects), and Accessibility (Neobrutalist, high-contrast) modes.

### Backend (Express + Python + LangGraph)
*   **LangGraph Orchestration**: `backend/graph.py` defines a compiled `StateGraph` with a shared `FinSurfState`. Nodes are guardrail → research → [tax ‖ sentiment] → dividend (conditional).
*   **Conditional Routing**: The dividend node is skipped entirely for non-dividend stocks — zero LLM tokens wasted.
*   **Parallel Fan-Out**: Tax and sentiment agents execute simultaneously via LangGraph's `Send` API after research completes.
*   **LLM Redundancy**: Built-in fallback logic across **Gemini, OpenAI, Anthropic, and Perplexity**.
*   **Real-Time RAG**: Web-connected agents provide up-to-the-minute market data (via Perplexity).

---

## 🏗 System Architecture & Data Flow

### Project Logic Flow
The following diagram illustrates the end-to-end data flow from user input to final analysis and report generation.

```mermaid
graph TD
    classDef fe fill:#cffafe,stroke:#0891b2,stroke-width:2px,color:#044e5f,font-weight:bold;
    classDef be fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#064e3b,font-weight:bold;
    classDef ai fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#4c1d95,font-weight:bold;
    classDef ui fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f,font-weight:bold;

    subgraph FE["Frontend (React)"]
        A[User Input: Ticker, Dates, Shares] --> B{Click Surf}
        B --> C[App.tsx: runAll]
        C --> D[apiService.ts: API Helpers]
    end

    subgraph BE["Backend (Express + Python + LangGraph)"]
        D -->|HTTP POST| E[server.ts: API Endpoints]
        E -->|Child Process| F[agents.py: CLI Dispatcher]
        F --> G[graph.py: LangGraph StateGraph]
    end

    subgraph AL["AI Layer (External APIs)"]
        G -->|guardrail node| GA[Security Check]
        GA -->|research node| GB[Perplexity / Gemini]
        GB -->|tax node parallel| GC[Gemini / Anthropic]
        GB -->|sentiment node parallel| GD[Perplexity / Gemini]
        GB -->|dividend node conditional| GE[Gemini / OpenAI]
    end

    GA --> J[FinSurfState JSON]
    GB --> J
    GC --> J
    GD --> J
    GE --> J
    J --> G
    G --> F
    F --> E
    E -->|JSON Response| D
    D --> K[App.tsx: Update State]
    
    subgraph UI["UI & Output"]
        K --> LG[ResultsGrid.tsx: Layout Manager]
        LG --> L[AgentCard.tsx: Render Markdown]
        L --> M{User Actions}
        M -->|Download| N[pdfGenerator.ts]
        N --> O[Professional PDF Report]
    end

    class A,B,C,D fe;
    class E,F,G be;
    class GA,GB,GC,GD,GE,J ai;
    class K,LG,L,M,N,O ui;

    style FE fill:#f0fdff,stroke:#0891b2,stroke-width:1px,stroke-dasharray: 5 5,color:#044e5f,font-weight:bold;
    style BE fill:#f0fdf4,stroke:#059669,stroke-width:1px,stroke-dasharray: 5 5,color:#064e3b,font-weight:bold;
    style AL fill:#f5f3ff,stroke:#7c3aed,stroke-width:1px,stroke-dasharray: 5 5,color:#4c1d95,font-weight:bold;
    style UI fill:#fffbeb,stroke:#d97706,stroke-width:1px,stroke-dasharray: 5 5,color:#78350f,font-weight:bold;
```

### Project Structure
This diagram shows the organization of the codebase and key file relationships.

```mermaid
graph LR
    classDef root fill:#f1f5f9,stroke:#475569,stroke-width:3px,color:#1e293b,font-weight:bold;
    classDef be fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#064e3b,font-weight:bold;
    classDef fe fill:#cffafe,stroke:#0891b2,stroke-width:2px,color:#044e5f,font-weight:bold;
    classDef cfg fill:#f8fafc,stroke:#94a3b8,stroke-width:1px,color:#334155,font-weight:bold;

    Root[FinSurf Root]
    
    Root --- B[Backend Logic]
    Root --- F[Frontend Source]
    Root --- C[Configuration]

    subgraph B["Backend Logic"]
        agents[agents.py CLI Entry]
        server[server.ts Express Server]
        subgraph backend_dir["backend/"]
            graph_py[graph.py LangGraph]
            financial_agents[financial_agents.py]
            llm_providers[llm_providers.py]
            utils_py[utils.py]
        end
    end

    subgraph F["src/ Source"]
        App[App.tsx Main App]
        main[main.tsx Entry]
        types[types.ts Types]
        css[index.css Styles]
        
        subgraph components["components/"]
            AgentCard[AgentCard.tsx]
            Mascot[Mascot.tsx]
            subgraph layout["layout/"]
                Header[Header.tsx]
                Footer[Footer.tsx]
            end
            subgraph forms["forms/"]
                SearchForm[SearchForm.tsx]
            end
            subgraph results["results/"]
                ResultsGrid[ResultsGrid.tsx]
            end
        end

        subgraph hooks["hooks/"]
            useTheme[useTheme.ts]
            useForm[useFormState.ts]
            useAgents[useFinancialAgents.ts]
        end
        
        subgraph services["services/"]
            apiService[apiService.ts]
            pdfCSS[pdf.css]
        end
        
        subgraph utils["utils/"]
            pdfGen[pdfGenerator.ts]
            cn[cn.ts]
        end
    end

    subgraph C["Configuration"]
        pkg[package.json]
        vite[vite.config.ts]
        ts[tsconfig.json]
        html[index.html]
        meta[metadata.json]
        env[.env]
    end

    class Root root;
    class agents,server,graph_py,financial_agents,llm_providers,utils_py be;
    class App,main,types,css,AgentCard,Mascot,Header,Footer,SearchForm,ResultsGrid,useTheme,useForm,useAgents,apiService,pdfCSS,pdfGen,cn fe;
    class pkg,vite,ts,html,meta,env cfg;

    %% Relationships
    App --> apiService
    App --> components
    apiService --> server
    server --> agents
    agents --> graph_py
    graph_py --> financial_agents
    App --> pdfGen
    pdfGen -.-> pdfCSS

    style B fill:#f0fdf4,stroke:#059669,stroke-width:1px,color:#064e3b,font-weight:bold;
    style F fill:#f0fdff,stroke:#0891b2,stroke-width:1px,color:#044e5f,font-weight:bold;
    style C fill:#f8fafc,stroke:#94a3b8,stroke-width:1px,color:#334155,font-weight:bold;
```

---

## 📸 Visuals & Reports

### Main Dashboard
| Light Mode | Night Mode |
|:---:|:---:|
| <img src="Images/DayTime.png" width="450"> | <img src="Images/NighTime.png" width="450"> |

### Themes
| Standard Theme | Accessibility Theme | Tropical Theme |
|:---:|:---:|:---:|
| <img src="Images/DayTime.png" width="300"> | <img src="Images/AccessibleTheme.png" width="300"> | <img src="Images/TropicalTheme.png" width="300"> |

### Results & PDF Output
|                                   Results Dashboard                                    | Market Analysis PDF Report |
|:--------------------------------------------------------------------------------------:|:---:|
| <img src="Images/Result1.png" width="450"><br/><img src="Images/Result2.png" width="450"> | <img src="Images/FitPageReport.png" width="450"> |

### Optimized Report Layout
| PDF Mode Comparison (HD vs Standard) | Adaptive PDF Pagination |
|:---:|:---:|
| <img src="Images/ReportsHDStd.png" width="450"> | <img src="Images/FitWidthReport.png" width="450"> |

---

## 🔮 Future Roadmap

FinSurf is an evolving ecosystem. To maintain a simple and efficient development cycle as a solo project, we are focusing on high-impact, achievable milestones that prioritize core functionality and user experience:

### 📈 Phase 1: The Profit Navigator (Q2 2026)
*   **Feature**: Historical Profit Analyzer & Exit Strategist.
*   **Why**: Bridges the gap between research and reality by automatically retrieving price history for your purchase/sell dates. It intelligently handles "Future Sell Dates" as a unique edge case, providing projected insights for planned exits based on current market trends.
*   **Difficulty**: 💪💪 Medium
*   **Timeline**: April - June 2026

### 🌊 Phase 2: Portfolio Wave (Q3 - Q4 2026)
*   **Feature**: Multi-Ticker Batch Analysis (CSV Upload).
*   **Why**: Allows investors to analyze their entire holding list in a single session rather than ticker-by-ticker, making it more practical for those with 10+ stocks.
*   **Difficulty**: 💪💪 Medium
*   **Timeline**: July - December 2026

### 🏛️ Phase 3: Archive Vault (2027)
*   **Feature**: Analysis History Database & Interactive AI Chat.
*   **Why**: Lets users save their reports to track changes over time and ask follow-up questions to the agents through a persistent chat interface.
*   **Difficulty**: 💪💪💪 High
*   **Timeline**: 2027 and Beyond

### 🎯 Stretch Goal: Options Radar
*   **Feature**: Popular Options Summary.
*   **Why**: Provides a quick overview of the most active options contracts for the selected stock, including type (Call/Put), strike price, expiration, and real-time bid/ask prices. This helps users gauge market sentiment and volatility at a glance.
*   **Difficulty**: 💪💪 Medium
*   **Timeline**: Stretch Goal

---

## 🚀 Getting Started

### Prerequisites
*   **Node.js** (v18+)
*   **Python** (3.9+)

### Installation
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/sachined/FinSurf.git
    cd FinSurf
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure API Keys**:
    Copy the example environment file and fill in your keys:
    ```bash
    cp .env.example .env
    ```
    Or create a `.env` file manually:
    ```env
    GEMINI_API_KEY=your_key_here
    PERPLEXITY_API_KEY=your_key_here  # Optional
    OPENAI_API_KEY=your_key_here      # Optional
    ANTHROPIC_API_KEY=your_key_here   # Optional
    PORT=3000
    ```

### Running the App
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to start surfing the market.

### Deployment & GitHub Secrets

When deploying FinSurf to platforms like GitHub Pages (frontend only) or automated CI/CD pipelines, you should use **GitHub Secrets** to manage your API keys securely.

1.  **Navigate to your repository** on GitHub.
2.  Go to **Settings > Secrets and variables > Actions**.
3.  Click **New repository secret** for each of the following:
    *   `GEMINI_API_KEY` (Required)
    *   `PERPLEXITY_API_KEY` (Optional)
    *   `OPENAI_API_KEY` (Optional)
    *   `ANTHROPIC_API_KEY` (Optional)

In your GitHub Actions workflow (`.yml`), you can then expose these secrets to your build or run steps:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and Test
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          PERPLEXITY_API_KEY: ${{ secrets.PERPLEXITY_API_KEY }}
        run: |
          npm install
          npm run build
```

---

## 🤝 Contributing

We welcome contributions! Whether it's adding new agent modules, strengthening validation layers, or improving the data architecture, your help is appreciated.

1.  **Fork the Repo**: Create your own branch for experiments.
2.  **Report Bugs**: Open an issue if you find any "holes" in the logic or architecture.
3.  **Submit a PR**: Ensure your code follows existing patterns to keep the agent's reasoning pure.

For discussions or questions, reach out to Sachin at `sachin.nediyanchath@gmail.com`.

---

## 📄 License
SPDX-License-Identifier: Apache-2.0


---

### 🔐 Cost Control & LLM Provider Policy

FinSurf's LangGraph orchestration adds a second layer of token savings on top of the provider allowlist:
- **Conditional dividend node**: skipped entirely for non-dividend stocks (saves ~2 000 Gemini tokens per query).
- **Parallel execution**: tax and sentiment run simultaneously, reducing wall-clock time without extra API calls.

Provider allowlist and conservative token limits are also enforced:

- Default providers: `Gemini (gemini-flash-latest)` + `Perplexity (sonar)` — Perplexity is enabled by default for real-time Research and Social Sentiment analysis
- Conservative caps: `max_tokens` generally limited to 500–800 per call, temperature 0.1
- Guardrail short‑circuit: Valid ticker-like inputs (A–Z/0–9/.- up to 10 chars) bypass LLM guardrail, saving tokens; ambiguous inputs are checked once via Gemini.

You can control which providers are permitted via environment variables:

- `ALLOWED_PROVIDERS` (comma-separated): e.g. `gemini,perplexity`
- or granular flags (fallback if `ALLOWED_PROVIDERS` is unset):
  - `ALLOW_GEMINI` (default: `true`)
  - `ALLOW_PERPLEXITY` (default: `true` — enabled for research/sentiment)
  - `ALLOW_OPENAI` (default: `false`)
  - `ALLOW_ANTHROPIC` (default: `false`)

Examples:

```bash
# Default behavior: Gemini + Perplexity (research/sentiment use Perplexity for real-time data)
export ALLOWED_PROVIDERS=gemini,perplexity

# Strictly Gemini-only (lower cost, no real-time web search)
export ALLOWED_PROVIDERS=gemini

# Explicit granular flags (used if ALLOWED_PROVIDERS is not set)
export ALLOW_GEMINI=true
export ALLOW_PERPLEXITY=true
export ALLOW_OPENAI=false
export ALLOW_ANTHROPIC=false
```

Notes:
- Research/Sentiment use Perplexity by default (enabled out-of-the-box) for real-time web search; they fall back to Gemini automatically if Perplexity is disabled or fails.
- Dividend analysis uses Gemini JSON mode; OpenAI fallback is only used when `OPENAI_API_KEY` is present and OpenAI is allowed.
- Tax analysis prefers Gemini with Anthropic as a secondary fallback only if allowed.
