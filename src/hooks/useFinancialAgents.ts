import { useState } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { analyzeAgent } from '../services/apiService';
import { FinancialAgentsState, LoadingState, UserApiKeys } from '../types';

export function useFinancialAgents() {
  const [loading, setLoading] = useState<LoadingState>({
    research: false,
    tax: false,
    dividend: false,
    sentiment: false,
    summary: false,
  });
  const [responses, setResponses] = useState<FinancialAgentsState>({
    research: null,
    tax: null,
    dividend: null,
    sentiment: null,
    summary: null,
  });

  const runAll = async (ticker: string, purchaseDate: string, sellDate: string, shares: string, onError: (msg: string) => void, userKeys?: UserApiKeys) => {
    if (!ticker) return;

    // Reset all responses for the new search
    setResponses({ research: null, tax: null, dividend: null, sentiment: null, summary: null });
    
    // Set all relevant agents to loading
    setLoading({
      research: true,
      tax: !!(purchaseDate && sellDate),
      dividend: !!shares,
      sentiment: true,
      summary: true,
    });

    try {
      const sharesNum = parseFloat(shares) || 0;
      let years = 3;
      if (purchaseDate && sellDate) {
        const pDate = parseISO(purchaseDate);
        const sDate = parseISO(sellDate);
        if (!isNaN(pDate.getTime()) && !isNaN(sDate.getTime())) {
          years = Math.max(1, Math.ceil(differenceInDays(sDate, pDate) / 365));
        }
      }

      const state = await analyzeAgent(ticker, purchaseDate, sellDate, sharesNum, years, userKeys);
      setResponses(state);
    } catch (error) {
      console.error('Unified analysis error:', error);
      onError('Full analysis failed. Please try again.');
    } finally {
      setLoading({ research: false, tax: false, dividend: false, sentiment: false, summary: false });
    }
  };

  return { loading, responses, runAll };
}
