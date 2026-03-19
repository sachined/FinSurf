/**
 * resumeData.ts
 *
 * Edit this file to update your public About / Bio page.
 * All fields are plain strings or arrays — no code changes required elsewhere.
 */

export const resumeData = {
  // ── Hero ──────────────────────────────────────────────────────────────────
  name: "Sachin Nediyanchath",
  title: "Full-Stack Developer & AI Systems Builder",
  tagline: "Building tools that make professional-grade financial analysis accessible to every investor.",
  avatarInitials: "SN", // shown when no photo is provided
  photo: "/GPJaTh.webp",  // place your photo in the public/ folder and set the filename here; set to "" to use initials instead

  // ── Stats strip (shown below hero) ────────────────────────────────────────
  stats: [
    { value: "4", label: "AI Agents" },
    { value: "3 yrs", label: "Enterprise AI" },
    { value: "Worldpay · Fidelity", label: "Enterprise Clients" },
    { value: "Live", label: "finsurf.net" },
  ],

  // ── Bio ───────────────────────────────────────────────────────────────────
  bio: [
    "I build AI tools that close the gap between institutional and retail investing. FinSurf grew from a simple " +
    "frustration: the kind of deep financial analysis available to fund managers — earnings research, tax-aware " +
    "positioning, SEC filing review, market sentiment — has always been locked behind Bloomberg terminals and " +
    "expensive advisors. I built the platform I wished existed.",

    "My path here was unconventional. A Geography degree from UCLA gave me a systems-thinking lens; three years " +
    "at eGain managing Fortune 500 deployments for clients like Worldpay and Fidelity Investments gave me " +
    "firsthand experience with enterprise AI at scale. When I left to build independently, FinSurf was the " +
    "first project I designed, built, and shipped entirely on my own — from blank repo to live production.",
  ],

  // ── Skills ────────────────────────────────────────────────────────────────
  skills: [
    {
      category: "Frontend",
      items: ["React", "TypeScript", "Tailwind CSS", "Vite"],
    },
    {
      category: "Backend",
      items: ["Node.js", "Express", "Python", "LangGraph", "LangChain"],
    },
    {
      category: "Data & AI",
      items: ["Gemini API", "Perplexity", "Groq", "yfinance", "FinnHub", "AlphaVantage", "SEC EDGAR", "SQLite"],
    },
    {
      category: "DevOps",
      items: ["Docker", "Caddy", "GitHub Actions", "DigitalOcean"],
    },
  ],

  // ── Experience ────────────────────────────────────────────────────────────
  experience: [
    {
      role: "Independent Software Developer",
      company: "Self-employed",
      period: "2024 – Present",
      bullets: [
        "Designed and shipped FinSurf — a multi-agent AI platform for retail stock analysis — solo, end-to-end: " +
        "architecture, backend, frontend, data integrations, and production deployment.",
        "Built a LangGraph state machine orchestrating five specialist AI agents, pulling live data from Yahoo Finance, " +
        "FinnHub, AlphaVantage, and SEC EDGAR to deliver institutional-grade research in seconds.",
      ],
    },
    {
      role: "Implementation Solutions Engineer",
      company: "eGain Corp",
      period: "2020 – 2024",
      bullets: [
        "Managed Fortune 500 accounts — including Worldpay and Fidelity Investments — as primary technical point of " +
        "contact across clients, internal engineering teams, and third-party stakeholders throughout all deployment stages.",
        "Onboarded enterprise clients to an AI-powered Knowledge Management platform through full lifecycle: " +
        "configuration, content normalization, production deployment, and ongoing optimization.",
        "Automated recurring Excel reporting workflows using AI-generated action scripts, reducing task completion " +
        "time from 1 hour to 15 minutes — a 75% efficiency gain.",
      ],
    },
  ],

  // ── Education ─────────────────────────────────────────────────────────────
  education: [
    {
      degree: "B.A. Geography",
      school: "University of California — Los Angeles",
      year: "2014",
    },
  ],

  // ── Projects ──────────────────────────────────────────────────────────────
  projects: [
    {
      name: "FinSurf",
      description:
        "Multi-agent AI platform for retail stock research. A LangGraph state machine orchestrates five specialist " +
        "agents — fundamental research, tax strategy, market sentiment, dividend analysis, and executive summary — " +
        "pulling live data from Yahoo Finance, FinnHub, AlphaVantage, and SEC EDGAR. Delivers institutional-grade " +
        "analysis in seconds. Designed, built, and deployed solo.",
      url: "https://finsurf.net",
    },
    {
      name: "WikiSurf",
      description:
        "Autonomous research agent that accepts a natural language topic, dynamically selects from Wikipedia, " +
        "DuckDuckGo, and file-save tools across up to 10 reasoning iterations, and returns a structured summary " +
        "with cited sources. Supports Claude and GPT-4o as interchangeable reasoning engines.",
      url: "https://github.com/sachined/WikiSurf-AI_Agent",
    },
  ],

  // ── Closing CTA ───────────────────────────────────────────────────────────
  cta: {
    quote: "I made it by being tougher than the toughies and smarter than the smarties, and I made it square!",
    attribution: "Scrooge McDuck",
    headline: "Available for freelance & contract work",
    sub: "Full-stack development, AI systems, and technical consulting.",
  },

  // ── Contact ───────────────────────────────────────────────────────────────
  contact: {
    email: "sachin.nediyanchath@gmail.com",
    linkedin: "https://www.linkedin.com/in/nediyanchath/",
    github: "https://github.com/sachined",
    website: "https://weather-and-billboard.vercel.app/",
  },
};
