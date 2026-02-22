# FinSurf 🏄‍♂️

**FinSurf** is a collaborative network of specialized AI agents designed to help you ride the market waves. It provides comprehensive stock analysis by combining real-time research, tax optimization, dividend forecasting, and social sentiment tracking into one professional report.

---

## 🤖 The Agent Network

FinSurf leverages a multi-agent architecture where each agent is a specialist in its domain:

*   **🔍 Research Analyst**: Performs deep-dives into stock performance, key metrics, and fundamental data.
*   **⚖️ Tax Strategist**: Calculates holding periods (Short-Term vs. Long-Term) and provides concise US tax implications based on your specific transaction dates.
*   **💰 Dividend Specialist**: Projects future payouts with mathematical precision, accounting for fractional shares and cumulative totals.
*   **🗣️ Social Sentiment Analyst**: Scours Reddit, X (Twitter), StockTwits, and major financial news to gauge the mood of both retail and professional investors.

---

## 🛠 Architecture & Encapsulation

The project has been refactored into a highly modular and encapsulated architecture to ensure efficiency and maintainability:

### Frontend (React + Vite + Tailwind CSS)
*   **Modular Components**: Extracted UI elements like `Mascot` and `AgentCard` into `src/components/` for better reusability.
*   **Centralized Utilities**: Complex logic for PDF generation and styling is encapsulated in `src/utils/`, keeping the main `App.tsx` clean and focused on state.
*   **Strong Typing**: Shared interfaces and types are centralized in `src/types.ts` to ensure consistency across the application.

### Backend (Express + Python)
*   **Encapsulated Execution**: A unified `runPythonAgent` helper manages the lifecycle of Python agent scripts, providing a clean API for the frontend.
*   **Robust Agent Logic**: Python agents are built with clear separation of concerns, utilizing dedicated provider clients for Gemini, OpenAI, Anthropic, and Perplexity with built-in fallback mechanisms.

---

## 📸 Visuals & Reports

> **[PLACEHOLDER: Main Dashboard Screenshot]**  
> *Insert a screenshot showing the FinSurf interface with the multi-agent grid.*

> **[PLACEHOLDER: Sample PDF Report]**  
> *Insert an image or link to a sample generated PDF report showing the 4-column layout and professional formatting.*

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python (3.9+)

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
    Create a `.env` file in the root directory and add your keys:
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
