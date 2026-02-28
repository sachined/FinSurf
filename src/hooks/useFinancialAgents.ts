import { useState } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { researchAgent, taxAgent, dividendAgent, sentimentAgent } from '../services/apiService';
import { AgentResponse, DividendResponse, FinancialAgentsState, LoadingState } from '../types';

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

  const runResearch = async (ticker: string, onError: (msg: string) => void) => {
    if (!ticker) return;
    setLoading(prev => ({ ...prev, research: true }));
    try {
      const res = await researchAgent(ticker);
      setResponses(prev => ({ ...prev, research: res }));
    } catch (error) {
      console.error(error);
      onError('Research failed. Please check the ticker or try again.');
    } finally {
      setLoading(prev => ({ ...prev, research: false }));
    }
  };

  const runTax = async (ticker: string, purchaseDate: string, sellDate: string, onError: (msg: string) => void) => {
    if (!ticker || !purchaseDate || !sellDate) return;
    setLoading(prev => ({ ...prev, tax: true }));
    try {
      const res = await taxAgent(ticker, purchaseDate, sellDate);
      setResponses(prev => ({ ...prev, tax: res }));
    } catch (error) {
      console.error(error);
      onError('Tax analysis failed.');
    } finally {
      setLoading(prev => ({ ...prev, tax: false }));
    }
  };

  const runDividend = async (ticker: string, shares: string, purchaseDate: string, sellDate: string, onError: (msg: string) => void) => {
    if (!ticker || !shares) return;
    const years = Math.max(1, Math.ceil(differenceInDays(parseISO(sellDate), parseISO(purchaseDate)) / 365));
    setLoading(prev => ({ ...prev, dividend: true }));
    try {
      const res = await dividendAgent(ticker, parseFloat(shares), years);
      setResponses(prev => ({ ...prev, dividend: res }));
    } catch (error) {
      console.error(error);
      onError('Dividend analysis failed.');
    } finally {
      setLoading(prev => ({ ...prev, dividend: false }));
    }
  };

  const runSentiment = async (ticker: string, onError: (msg: string) => void) => {
    if (!ticker) return;
    setLoading(prev => ({ ...prev, sentiment: true }));
    try {
      const res = await sentimentAgent(ticker);
      setResponses(prev => ({ ...prev, sentiment: res }));
    } catch (error) {
      console.error(error);
      onError('Sentiment analysis failed.');
    } finally {
      setLoading(prev => ({ ...prev, sentiment: false }));
    }
  };

  const runAll = async (ticker: string, purchaseDate: string, sellDate: string, shares: string, onError: (msg: string) => void) => {
    // Reset responses for new search
    setResponses({
      research: null,
      tax: null,
      dividend: null,
      sentiment: null
    });

    const errors: string[] = [];
    const collectError = (msg: string) => {
      errors.push(msg);
    };

    await Promise.allSettled([
      runResearch(ticker, collectError),
      runTax(ticker, purchaseDate, sellDate, collectError),
      runDividend(ticker, shares, purchaseDate, sellDate, collectError),
      runSentiment(ticker, collectError)
    ]);

    if (errors.length > 0) {
      // If multiple agents failed, show a generic message or the first one
      if (errors.length > 2) {
        onError('Multiple analysis agents encountered issues. Some results may be incomplete.');
      } else {
        onError(errors[0]);
      }
    }
  };

  return {
    loading,
    responses,
    runResearch,
    runTax,
    runDividend,
    runSentiment,
    runAll
  };
}
