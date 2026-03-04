import { useState } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { researchAgent, taxAgent, dividendAgent, sentimentAgent, summaryAgent } from '../services/apiService';
import { AgentKey, AgentResponse, DividendResponse, FinancialAgentsState, LoadingState, ResearchResponse, UserApiKeys } from '../types';

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

  /**
   * DRY helper: sets the named agent's loading flag, awaits the call,
   * stores the result, and clears loading — regardless of success or failure.
   * Returns the response (or null on error) so runAll can pass it to runSummary.
   */
  async function withLoading<T extends AgentResponse>(
    key: AgentKey,
    call: () => Promise<T>,
    onError: (msg: string) => void,
    errorMsg: string
  ): Promise<T | null> {
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await call();
      setResponses(prev => ({ ...prev, [key]: res }));
      return res;
    } catch (error) {
      console.error(error);
      onError(errorMsg);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  }

  const runResearch = (ticker: string, purchaseDate: string, sellDate: string, shares: string, onError: (msg: string) => void, userKeys?: UserApiKeys) => {
    if (!ticker) return Promise.resolve(null);
    const sharesNum = parseFloat(shares) || 0;
    return withLoading<ResearchResponse>('research', () => researchAgent(ticker, purchaseDate, sellDate, sharesNum, userKeys), onError, 'Research failed. Please check the ticker or try again.');
  };

  const runTax = (ticker: string, purchaseDate: string, sellDate: string, shares: string, onError: (msg: string) => void, userKeys?: UserApiKeys) => {
    if (!ticker || !purchaseDate || !sellDate) return Promise.resolve(null);
    const sharesNum = parseFloat(shares) || 0;
    return withLoading('tax', () => taxAgent(ticker, purchaseDate, sellDate, sharesNum, userKeys), onError, 'Tax analysis failed.');
  };

  const runDividend = (ticker: string, shares: string, purchaseDate: string, sellDate: string, onError: (msg: string) => void, userKeys?: UserApiKeys) => {
    if (!ticker || !shares) return Promise.resolve(null);
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
      () => dividendAgent(ticker, parseFloat(shares), years, purchaseDate, sellDate, userKeys),
      onError,
      'Dividend analysis failed.'
    );
  };

  const runSentiment = (ticker: string, onError: (msg: string) => void, userKeys?: UserApiKeys) => {
    if (!ticker) return Promise.resolve(null);
    return withLoading('sentiment', () => sentimentAgent(ticker, userKeys), onError, 'Sentiment analysis failed.');
  };

  const runSummary = (
    ticker: string,
    researchRes: ResearchResponse | null,
    taxRes: AgentResponse | null,
    dividendRes: DividendResponse | null,
    sentimentRes: AgentResponse | null,
    onError: (msg: string) => void,
    userKeys?: UserApiKeys,
  ) => {
    if (!ticker) return Promise.resolve(null);
    return withLoading(
      'summary',
      () => summaryAgent(
        ticker,
        researchRes?.content ?? null,
        taxRes?.content ?? null,
        dividendRes?.content ?? null,
        sentimentRes?.content ?? null,
        researchRes?.pnlSummary ?? null,
        userKeys,
      ),
      onError,
      'Executive summary failed.',
    );
  };

  const runAll = async (ticker: string, purchaseDate: string, sellDate: string, shares: string, onError: (msg: string) => void, userKeys?: UserApiKeys) => {
    // Reset all responses for the new search, including summary
    setResponses({ research: null, tax: null, dividend: null, sentiment: null, summary: null });
    const errors: string[] = [];
    const collectError = (msg: string) => errors.push(msg);

    // Run the four specialist agents in parallel; capture results for the summary
    const results = await Promise.allSettled([
      runResearch(ticker, purchaseDate, sellDate, shares, collectError, userKeys),
      runTax(ticker, purchaseDate, sellDate, shares, collectError, userKeys),
      runDividend(ticker, shares, purchaseDate, sellDate, collectError, userKeys),
      runSentiment(ticker, collectError, userKeys),
    ]);

    const [resR, taxR, divR, sentR] = results.map(r =>
      r.status === 'fulfilled' ? r.value : null
    );

    // Accumulator: once all four specialist agents have written to state,
    // run the Executive Summary node with their collected findings.
    await runSummary(
      ticker,
      resR as ResearchResponse | null,
      taxR as AgentResponse | null,
      divR as DividendResponse | null,
      sentR as AgentResponse | null,
      collectError,
      userKeys,
    );

    if (errors.length > 2) {
      onError('Multiple analysis agents encountered issues. Some results may be incomplete.');
    } else if (errors.length > 0) {
      onError(errors[0]);
    }
  };

  return { loading, responses, runResearch, runTax, runDividend, runSentiment, runSummary, runAll };
}
