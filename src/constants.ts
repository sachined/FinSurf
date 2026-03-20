import type { LoadingState, FinancialAgentsState } from './types';

export const EMPTY_LOADING: LoadingState = {
  research: false, tax: false, dividend: false, sentiment: false, summary: false,
};

export const EMPTY_RESPONSES: FinancialAgentsState = {
  research: null, tax: null, dividend: null, sentiment: null, summary: null,
};

export const EXAMPLE_TICKERS = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'GOOG'] as const;

export const FREE_TRIES = 5;

export const LS_KEYS = {
  activePass:     'finsurf_active_pass',
  userKeys:       'finsurf_user_keys',
  recentSearches: 'finsurf_recent_searches',
  theme:          'finsurf_theme',
} as const;
