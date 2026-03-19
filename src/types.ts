export type Theme = 'light' | 'dark';

export interface UserApiKeys {
  geminiKey: string;       // required
  perplexityKey?: string;  // optional
  groqKey?: string;        // optional
}

export interface AgentResponse {
  agentName: string;
  content: string;
  sources?: { title: string; uri: string }[];
  timestamp?: number; // Unix timestamp (ms) when analysis was performed
}

export interface PricePoint {
  date: string;
  close: number;
}

/** Shared P&L summary computed by the Tax Calculator tool and carried through LangGraph state. */
export interface PnLSummary {
  buy_price:           number | null;
  sell_price:          number | null;
  current_price:       number | null;
  shares:              number;
  realized_gain:       number | null;   // (sell - buy) × shares
  realized_gain_pct:   number | null;   // % return on realized position
  unrealized_gain:     number | null;   // (current - buy) × shares (no sell yet)
  unrealized_gain_pct: number | null;
  holding_days:        number | null;   // calendar days buy → sell
  is_long_term:        boolean | null;  // > 365 days
  total_dividends:     number | null;   // populated by dividend_node
}

export interface ResearchResponse extends AgentResponse {
  priceHistory: PricePoint[];
  currentPrice: number | null;
  pnlSummary:   PnLSummary | null;
}

export interface DividendStats {
  currentYield?: string;
  annualDividendPerShare?: string;
  payoutRatio?: string;
  fiveYearGrowthRate?: string;
  paymentFrequency?: string;
  exDividendDate?: string;
  consecutiveYears?: string;
}

export interface DividendResponse extends AgentResponse {
  isDividendStock: boolean;
  hasDividendHistory: boolean;
  stats?: DividendStats;
}


export interface FinancialAgentsState {
  research: ResearchResponse | null;
  tax: AgentResponse | null;
  dividend: DividendResponse | null;
  sentiment: AgentResponse | null;
  summary: AgentResponse | null;
}

export interface LoadingState {
  research: boolean;
  tax: boolean;
  dividend: boolean;
  sentiment: boolean;
  summary: boolean;
}

export type AgentKey = keyof FinancialAgentsState;
