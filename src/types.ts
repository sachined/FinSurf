export type Theme = 'light' | 'dark';

export interface UserApiKeys {
  geminiKey: string;       // required
  perplexityKey?: string;  // optional
  groqKey?: string;        // optional
}
export type AccessMode = 'default' | 'colorblind' | 'tropical';

export interface AgentResponse {
  agentName: string;
  content: string;
  sources?: { title: string; uri: string }[];
}

export interface PricePoint {
  date: string;
  close: number;
}

export interface ResearchResponse extends AgentResponse {
  priceHistory: PricePoint[];
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
}

export interface LoadingState {
  research: boolean;
  tax: boolean;
  dividend: boolean;
  sentiment: boolean;
}

export type AgentKey = keyof FinancialAgentsState;
