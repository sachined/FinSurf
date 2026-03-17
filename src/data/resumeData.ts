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

  // ── Bio ───────────────────────────────────────────────────────────────────
  bio: [
    "I build AI-powered tools that solve real problems for real people. FinSurf started from a simple observation: " +
    "the kind of financial analysis available to institutional investors has always been out of reach for retail investors — " +
    "locked behind expensive advisors, opaque tools, or a finance degree. I built FinSurf to close that gap.",

    "My background spans enterprise software implementation, cloud infrastructure, and full-stack development. " +
    "I spent four years at eGain managing Fortune 500 deployments — working at the intersection of AI, knowledge management, " +
    "and large-scale technical rollouts — before transitioning into independent software development.",
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
      items: ["Gemini API", "Perplexity", "Groq", "yfinance", "SQLite"],
    },
    {
      category: "DevOps",
      items: ["Docker", "Caddy", "GitHub Actions", "DigitalOcean"],
    },
  ],

  // ── Experience ────────────────────────────────────────────────────────────
  experience: [
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
    {
      role: "Account Manager",
      company: "v12Software",
      period: "2018",
      bullets: [
        "Conducted SaaS win-back engagements for automotive dealerships, recovering dormant accounts through " +
        "consultative product demonstrations.",
        "Gained first exposure to SaaS product cycles and Agile development methodology in a commercial environment.",
      ],
    },
    {
      role: "IT Field Support Technician",
      company: "MMA & TPG",
      period: "2017 – 2019",
      bullets: [
        "Delivered enterprise tech deployments and workspace migrations at Apple, Broadcom, Salesforce, and " +
        "other Bay Area campuses.",
      ],
    },
    {
      role: "Technical Contributor (volunteer)",
      company: "NeuroLeap",
      period: "2017",
      bullets: [
        "C++ development and Linux diagnostics for an educational technology prototype.",
      ],
    },
    {
      role: "Hardware Diagnostic Technician (contract)",
      company: "Apple",
      period: "2016",
      bullets: [
        "Diagnostic testing of next-generation mobile devices at AppleCare.",
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
        "Multi-agent AI platform for retail stock analysis. A LangGraph state machine orchestrates five specialist " +
        "agents — research, tax strategy, market sentiment, dividend analysis, and executive summary — delivering " +
        "professional-grade reports in seconds. Built solo, end-to-end.",
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

  // ── Contact ───────────────────────────────────────────────────────────────
  contact: {
    email: "sachin.nediyanchath@gmail.com",
    linkedin: "https://www.linkedin.com/in/nediyanchath/",
    github: "https://github.com/sachined",
    website: "",
  },
};
