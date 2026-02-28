import { useState } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { researchAgent, taxAgent, dividendAgent, sentimentAgent } from '../services/apiService';
import { AgentKey, AgentResponse, DividendResponse, FinancialAgentsState, LoadingState } from '../types';

export function useFinancialAgents() {
  const [loading, setLoading] = useState<LoadingState>({
    research: false,
    tax: false,
    dividend: false,
    sentiment: false
  });

  const [responses, setResponses] = useState<FinancialAgentsState>({
    research: null,
    tax: null,
    dividend: null,
    sentiment: null
  });

  /**
   * DRY helper: sets the named agent's loading flag, awaits the call,
   * stores the result, and clears loading — regardless of success or failure.
   */
  async function withLoading<T extends AgentResponse>(
    key: AgentKey,
    call: () => Promise<T>,
    onError: (msg: string) => void,
    errorMsg: string
  ): Promise<void> {
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await call();
      setResponses(prev => ({ ...prev, [key]: res }));
    } catch (error) {
      console.error(error);
      onError(errorMsg);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  }

  const runResearch = (ticker: string, onError: (msg: string) => void) => {
    if (!ticker) return Promise.resolve();
    return withLoading('research', () => researchAgent(ticker), onError, 'Research failed. Please check the ticker or try again.');
  };

  const runTax = (ticker: string, purchaseDate: string, sellDate: string, onError: (msg: string) => void) => {
    if (!ticker || !purchaseDate || !sellDate) return Promise.resolve();
    return withLoading('tax', () => taxAgent(ticker, purchaseDate, sellDate), onError, 'Tax analysis failed.');
  };

  const runDividend = (ticker: string, shares: string, purchaseDate: string, sellDate: string, onError: (msg: string) => void) => {
    if (!ticker || !shares) return Promise.resolve();
    // Guard against invalid / missing dates before calling parseISO
    let years = 3;
    if (purchaseDate && sellDate) {
      const pDate = parseISO(purchaseDate);
      const sDate = parseISO(sellDate);
      if (!isNaN(pDate.getTime()) && !isNaN(sDate.getTime())) {
        years = Math.max(1, Math.ceil(differenceInDays(sDate, pDate) / 365));
      }
    }
    return withLoading<DividendResponse>(
      'dividend',
      () => dividendAgent(ticker, parseFloat(shares), years),
      onError,
      'Dividend analysis failed.'
    );
  };

  const runSentiment = (ticker: string, onError: (msg: string) => void) => {
    if (!ticker) return Promise.resolve();
    return withLoading('sentiment', () => sentimentAgent(ticker), onError, 'Sentiment analysis failed.');
  };

  const runAll = async (ticker: string, purchaseDate: string, sellDate: string, shares: string, onError: (msg: string) => void) => {
    // Reset responses for new search
    setResponses({ research: null, tax: null, dividend: null, sentiment: null });

    const errors: string[] = [];
    const collectError = (msg: string) => errors.push(msg);

    await Promise.allSettled([
      runResearch(ticker, collectError),
      runTax(ticker, purchaseDate, sellDate, collectError),
      runDividend(ticker, shares, purchaseDate, sellDate, collectError),
      runSentiment(ticker, collectError)
    ]);

    if (errors.length > 2) {
      onError('Multiple analysis agents encountered issues. Some results may be incomplete.');
    } else if (errors.length > 0) {
      onError(errors[0]);
    }
  };

  return { loading, responses, runResearch, runTax, runDividend, runSentiment, runAll };
}
