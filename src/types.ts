export type Theme = 'light' | 'dark';
export type AccessMode = 'default' | 'colorblind' | 'tropical';

export interface AgentResponse {
  agentName: string;
  content: string;
  sources?: { title: string; uri: string }[];
}

export interface DividendResponse extends AgentResponse {
  isDividendStock: boolean;
  hasDividendHistory: boolean;
}

export interface FinancialAgentsState {
  research: AgentResponse | null;
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
