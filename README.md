# FinSurf 🏄‍♂️

**FinSurf** is a sophisticated, AI-driven stock analysis platform designed to help investors navigate market volatility with ease. By deploying a collaborative network of specialized autonomous agents, FinSurf transforms raw market data into professional-grade investment reports.

Whether you're calculating long-term dividend yields, assessing tax implications, or gauging the latest social media buzz, FinSurf provides a comprehensive, 360-degree view of any stock ticker in seconds.

---

## 🚀 Key Features

*   **🤖 Multi-Agent Intelligence**: Four specialized AI agents work in parallel to provide research, tax, dividend, and sentiment analysis.
*   **📄 Professional PDF Reports**: Generate and download detailed analysis reports with a single click.
*   **🎨 Personalized Experience**: Choose between Light/Dark modes and multiple themes, including **Accessible** and **Tropical**.
*   **🔌 Flexible AI Backend**: Robust integration with leading LLM providers (Gemini, OpenAI, Anthropic, Perplexity) featuring automated fallback mechanisms.
*   **⚡ Modern Tech Stack**: Built with React 19, Vite, Tailwind CSS, Express, and Python for a lightning-fast, responsive experience.

---

## 🌐 Project Domains

FinSurf is a multi-disciplinary project that bridges the gap between advanced financial analysis and modern AI engineering. Key topics covered include:

### 1. Artificial Intelligence & Agentic Workflows
*   **Multi-Agent Orchestration**: Coordinating a collaborative network of specialized agents to solve complex tasks in parallel.
*   **LLM Redundancy & Fallback**: Implementation of robust architectures that switch between providers (**Gemini, OpenAI, Anthropic, Perplexity**) automatically.
*   **Real-Time RAG (Retrieval-Augmented Generation)**: Using web-connected agents to provide up-to-the-minute market data instead of relying on outdated training sets.

### 2. FinTech & Quant Research
*   **Algorithmic Dividend Projections**: Performing precision-focused calculations for fractional shares over multi-year periods.
*   **Automated Tax Stratification**: Logic-driven determination of US Short-term vs. Long-term capital gains based on holding periods.
*   **Sentiment Aggregation**: Merging professional news sentiment with retail mood from social media (Reddit, X, StockTwits).

### 3. Modern Full-Stack Engineering
*   **Polyglot Backend**: A hybrid system using **Node.js/Express** for server orchestration and **Python** for high-performance AI agent execution.
*   **Advanced Document Engineering**: Programmatic generation of professional-grade PDF reports from complex AI-processed data using `html2canvas` and `jspdf`.

### 4. Inclusive UX & Product Design
*   **Accessibility-First Design**: Including dedicated themes for color-blind or low-vision users directly in the core product.
*   **Dynamic Theme Engines**: Managing complex state transitions between Light, Dark, Tropical, and Accessibility modes.

---

## 🤖 The Agent Network

FinSurf leverages a modular multi-agent architecture where each agent is a specialist in its domain:

*   **🔍 Research Analyst**: Performs deep-dives into stock performance, key metrics, and fundamental data to identify growth potential.
*   **⚖️ Tax Strategist**: Analyzes holding periods and provides concise US tax implications (Short-term vs. Long-term Capital Gains) based on your transaction dates.
*   **💰 Dividend Specialist**: Projects future payouts with mathematical precision, accounting for fractional shares and holding duration.
*   **🗣️ Social Sentiment Analyst**: Scours Reddit, X (Twitter), StockTwits, and major news outlets to gauge real-time investor mood and market momentum.

---

## 🛠 Architecture & Encapsulation

The project features a highly modular and encapsulated architecture for efficiency and maintainability:

### Frontend (React + Vite + Tailwind CSS)
*   **Modular Components**: UI elements like `Mascot` and `AgentCard` are extracted into `src/components/`.
*   **Centralized Utilities**: Complex logic for PDF generation and styling is encapsulated in `src/utils/`.
*   **Strong Typing**: Shared interfaces and types are centralized in `src/types.ts`.

### Backend (Express + Python)
*   **Encapsulated Execution**: A unified `runPythonAgent` helper manages the lifecycle of Python agent scripts.
*   **Robust Agent Logic**: Python agents utilize dedicated provider clients for Gemini, OpenAI, Anthropic, and Perplexity with built-in fallback mechanisms.

---

## 📸 Visuals & Reports

### Main Dashboard
*Toggle between Light and Dark Mode*

| Light Mode | Night Mode |
|:---:|:---:|
| ![DayTime.png](Images/DayTime.png) | ![NighTime.png](Images/NighTime.png) |

### Themes
*Standard, Accessible, and Tropical*

| Standard Theme | Accessibility Theme | Tropical Theme |
|:---:|:---:|:---:|
| ![StandardTheme.png](Images/StandardTheme.png) | ![AccessibleTheme.png](Images/AccessibleTheme.png) | ![TropicalTheme.png](Images/TropicalTheme.png) |

### Agent Results & Reports
*View results and download professional PDF reports*

| Results Dashboard | PDF Report Sample |
|:---:|:---:|
| ![Results.png](Images/Results.png) | ![ReportDownload.png](Images/ReportDownload.png)<br>*(Note: Further work is needed to ensure that the report is comprehensive and not cut-off, as seen in the screenshot)* |

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
    Create a `.env` file in the root directory:
    ```env
    GEMINI_API_KEY=your_key_here
    PERPLEXITY_API_KEY=your_key_here  # Optional
    OPENAI_API_KEY=your_key_here      # Optional
    ANTHROPIC_API_KEY=your_key_here   # Optional
    ```

### Running the App
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to start surfing the market.

---

## 📄 License
SPDX-License-Identifier: Apache-2.0
