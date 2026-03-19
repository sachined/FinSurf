import { useState } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { analyzeAgent } from '../services/apiService';
import { FinancialAgentsState, LoadingState, UserApiKeys } from '../types';
import { EMPTY_LOADING, EMPTY_RESPONSES } from '../constants';

export function useFinancialAgents() {
  const [loading, setLoading] = useState<LoadingState>(EMPTY_LOADING);
  const [responses, setResponses] = useState<FinancialAgentsState>(EMPTY_RESPONSES);

  const [compareLoading, setCompareLoading] = useState<LoadingState>(EMPTY_LOADING);
  const [compareResponses, setCompareResponses] = useState<FinancialAgentsState>(EMPTY_RESPONSES);
  const [isComparing, setIsComparing] = useState(false);

  const runAll = async (ticker: string, purchaseDate: string, sellDate: string, shares: string, onError: (msg: string) => void, userKeys?: UserApiKeys) => {
    if (!ticker) return;

    setResponses(EMPTY_RESPONSES);
    // Also clear any active comparison when a new primary search starts
    setIsComparing(false);
    setCompareResponses(EMPTY_RESPONSES);
    setCompareLoading(EMPTY_LOADING);

    setLoading({
      research: true,
      tax: !!(purchaseDate && sellDate),
      dividend: !!shares,
      sentiment: true,
      summary: true,
    });

    const sharesNum = parseFloat(shares) || 0;
    let years = 3;
    if (purchaseDate && sellDate) {
      const pDate = parseISO(purchaseDate);
      const sDate = parseISO(sellDate);
      if (!isNaN(pDate.getTime()) && !isNaN(sDate.getTime())) {
        years = Math.max(1, Math.ceil(differenceInDays(sDate, pDate) / 365));
      }
    }

    try {
      const state = await analyzeAgent(ticker, purchaseDate, sellDate, sharesNum, years, userKeys);
      setResponses(state);
    } catch (error) {
      console.error('Unified analysis error:', error);
      onError('Full analysis failed. Please try again.');
    } finally {
      setLoading(EMPTY_LOADING);
    }
  };

  // Compare runs a basic analysis (no dates/shares) for a second ticker in parallel
  const runCompare = async (ticker: string, onError: (msg: string) => void, userKeys?: UserApiKeys) => {
    if (!ticker) return;
    setIsComparing(true);
    setCompareResponses(EMPTY_RESPONSES);
    setCompareLoading({ research: true, tax: false, dividend: false, sentiment: true, summary: true });

    try {
      const state = await analyzeAgent(ticker, '', '', 0, 3, userKeys);
      setCompareResponses(state);
    } catch (error) {
      console.error('Compare analysis error:', error);
      onError('Comparison analysis failed. Please try again.');
    } finally {
      setCompareLoading(EMPTY_LOADING);
    }
  };

  const clearCompare = () => {
    setIsComparing(false);
    setCompareResponses(EMPTY_RESPONSES);
    setCompareLoading(EMPTY_LOADING);
  };

  return { loading, responses, runAll, compareLoading, compareResponses, isComparing, runCompare, clearCompare };
}
