/**
 * resumeData.ts
 *
 * Edit this file to update your public About / Bio page.
 * All fields are plain strings or arrays — no code changes required elsewhere.
 */

export const resumeData = {
  // ── Hero ──────────────────────────────────────────────────────────────────
  name: "Sachin Nediyanchath",
  title: "Full-Stack Developer & Financial Technology Enthusiast",
  tagline: "Building tools that make complex financial data accessible to everyone.",
  avatarInitials: "SN", // shown when no photo is provided
  photo: "/GPJaTh.webp",  // place your photo in the public/ folder and set the filename here; set to "" to use initials instead

  // ── Bio ───────────────────────────────────────────────────────────────────
  bio: [
    "A tech generalist passionate about the intersection of technology and personal finance. I built FinSurf to help " +
    "everyday investors understand market data without needing a finance degree. With a background spanning full-stack " +
    "web development, cloud infrastructure, and AI integration, I enjoy turning dense datasets into clear, actionable " +
    "insights for retail investors.",
  ],

  // ── Skills ────────────────────────────────────────────────────────────────
  skills: [
    {
      category: "Frontend",
      items: ["React", "TypeScript", "Tailwind CSS", "Vite"],
    },
    {
      category: "Backend",
      items: ["Node.js", "Python", "FastAPI", "LangGraph"],
    },
    {
      category: "Data & AI",
      items: ["Gemini API", "Groq", "yfinance", "SQLite"],
    },
    {
      category: "DevOps",
      items: ["Docker", "GitHub Actions", "Caddy", "DigitalOcean"],
    },
  ],

  // ── Experience ────────────────────────────────────────────────────────────
  experience: [
    {
      role: "Implementation Solutions Engineer",
      company: "eGain Corp",
      period: "2020 – 2024",
      bullets: [
        "Managed Fortune 500 accounts (including Worldpay and Fidelity Investments) as primary POC across clients," +
        " internal engineering teams, and third-party stakeholders throughout all deployment stages.",
        "Onboarded enterprise clients to AI-powered Knowledge Management platform through full lifecycle: configuration," +
        " content normalization, production deployment and ongoing optimization.",
        "Automated recurring Excel reporting workflows using AI-generated action scripts, reducing task completion time " +
        "from 1 hour to 15 minutes (75% efficiency gain)",
        "This experience solidified my passion for automation and efficiency, setting the stage for my future endeavors in tech."
      ],
    },
    {
      role: "Account Manager",
      company: "v12Software",
      period: "2018",
      bullets: [
        "Engaged in SaaS win-back engagements for automotive dealerships; recovered dormant account through consultative demonstration.",
        `First exposure to SaaS environment and Agile development, which helps remind me that a product was once not perfect, but rather 
        improved from customer feedback. FinSurf definitely has issues, but I hope to improve it according to what the users want.`,
      ],
    },
    {
      role: "IT Field Support Technician",
      company: "MMA & TPG",
      period: "2017 – 2019",
      bullets: [
        "Enterprise tech deployment & workspace migrations at Apple, Broadcom, Salesforce and Bay Area campuses.",
        "Saw directly how compartmentalization of labor benefits all involved, so FinSurf is inspired by efforts of investing research.",
      ],
    },
    {
      role: "Technical Contributor (volunteer)",
      company: "NeuroLeap",
      period: "2017",
      bullets: [
        "Utilized C++ development and Linux diagnostics for educational technology prototype.",
        "Practiced Linux in order to troubleshoot a prototype, and used C++ to create diagnostic tools. This helps me be tech-agnostic, " +
        "so I can adapt to changing tech environments smoothly.",
      ],
    },
    {
      role: "Hardware Diagnostic Technician (contract)",
      company: "Apple",
      period: "2016",
      bullets: [
        "Diagnostic testing of next-generation mobile devices at AppleCare.",
        "Where I came across Linux environment when testing, and that grew my passion for troubleshooting tech.",
      ],
    },
  ],

  // ── Education ─────────────────────────────────────────────────────────────
  education: [
    {
      degree: "B.A. Geography",
      school: "University of California - Los Angeles",
      year: "2014",
    },
  ],

  // ── Projects ──────────────────────────────────────────────────────────────
  projects: [
    {
      name: "FinSurf.ai",
      description:
        "Multi-agent AI platform for retail stock analysis. Combines yfinance data with Gemini, Groq, and Perplexity to deliver plain-English market insights.",
      url: "https://finsurf.net",
    },
    {
      name: "WikiSurf",
      description:
        "An autonomous research agent that accepts a topic, orchestrates multiple search tools in priority order, and " +
          "returns a structured summary with cited sources — all rendered in a rich terminal UI.",
      url: "https://github.com/sachined/WikiSurf-AI_Agent",
    },
  ],

  // ── Contact ───────────────────────────────────────────────────────────────
  contact: {
    email: "sachin.nediyanchath@gmail.com",
    linkedin: "https://www.linkedin.com/in/nediyanchath/",
    github: "https://github.com/sachined",
    website: "https://weather-and-billboard.vercel.app/",
  },
};
