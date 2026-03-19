import React from 'react';
import { Search, Receipt, MessageSquare, Sparkles } from 'lucide-react';
import { AgentCard } from '../cards/AgentCard';
import { FinancialAgentsState, LoadingState } from '../../types';

interface ResultsGridProps {
  responses: FinancialAgentsState;
  loading: LoadingState;
  primaryTicker?: string;
  compareResponses?: FinancialAgentsState;
  compareLoading?: LoadingState;
  compareTicker?: string;
}

const EMPTY_LOADING: LoadingState = { research: false, tax: false, dividend: false, sentiment: false, summary: false };

export function ResultsGrid({
  responses,
  loading,
  primaryTicker,
  compareResponses,
  compareLoading,
  compareTicker,
}: ResultsGridProps) {
  const isDone = !Object.values(loading).some(v => v) && Object.values(responses).some(r => r !== null);

  const specialistsDone =
    !loading.research && !loading.tax && !loading.dividend && !loading.sentiment &&
    (responses.research !== null || responses.tax !== null || responses.sentiment !== null);

  const summaryLabel = specialistsDone
    ? 'Final summary · combining all findings…'
    : 'Waiting for specialist agents…';

  const isComparing = !!(compareResponses && compareTicker);
  const cLoading = compareLoading ?? EMPTY_LOADING;
  const cResponses = compareResponses ?? { research: null, tax: null, dividend: null, sentiment: null, summary: null };

  const cIsDone = !Object.values(cLoading).some(v => v) && Object.values(cResponses).some(r => r !== null);
  const cSpecialistsDone =
    !cLoading.research && !cLoading.tax && !cLoading.dividend && !cLoading.sentiment &&
    (cResponses.research !== null || cResponses.tax !== null || cResponses.sentiment !== null);
  const cSummaryLabel = cSpecialistsDone
    ? 'Final summary · combining all findings…'
    : 'Waiting for specialist agents…';

  if (isComparing) {
    return (
      <div id="agents-grid" className="relative z-20 transition-all duration-700 mb-12 space-y-6">
        {/* Ticker column headers */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Primary</span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">{primaryTicker}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-500/70">Comparing</span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">{compareTicker}</span>
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 gap-4">
          <AgentCard
            title="Executive Summary"
            icon={<Sparkles size={22} className="text-amber-500" />}
            loading={loading.summary}
            response={responses.summary}
            color="amber"
            emptyDescription="Synthesised investment brief."
            isCompact={isDone}
            staticSources={['Yahoo Finance', 'SEC Edgar', 'Reddit', 'StockTwits']}
            loadingLabel={summaryLabel}
          />
          <AgentCard
            title="Executive Summary"
            icon={<Sparkles size={22} className="text-amber-500" />}
            loading={cLoading.summary}
            response={cResponses.summary}
            color="amber"
            emptyDescription="Synthesised investment brief."
            isCompact={cIsDone}
            staticSources={['Yahoo Finance', 'SEC Edgar', 'Reddit', 'StockTwits']}
            loadingLabel={cSummaryLabel}
          />
        </div>

        {/* Research row */}
        <div className="grid grid-cols-2 gap-4">
          <AgentCard
            title="Research Analyst"
            icon={<Search size={18} />}
            loading={loading.research}
            response={responses.research}
            color="cyan"
            emptyDescription="Fundamentals analysis."
            isCompact={isDone}
            staticSources={['Yahoo Finance', 'SEC Edgar']}
            loadingLabel="Analysing fundamentals…"
          />
          <AgentCard
            title="Research Analyst"
            icon={<Search size={18} />}
            loading={cLoading.research}
            response={cResponses.research}
            color="cyan"
            emptyDescription="Fundamentals analysis."
            isCompact={cIsDone}
            staticSources={['Yahoo Finance', 'SEC Edgar']}
            loadingLabel="Analysing fundamentals…"
          />
        </div>

        {/* Tax & Dividend row */}
        <div className="grid grid-cols-2 gap-4">
          <AgentCard
            title="Tax & Dividend Analysis"
            icon={<Receipt size={18} />}
            loading={loading.tax || loading.dividend}
            response={responses.tax}
            dividendResponse={responses.dividend}
            color="emerald"
            emptyDescription="Dividend income projection."
            isCompact={isDone}
            staticSources={['Yahoo Finance', 'IRS']}
            loadingLabel="Calculating dividends…"
          />
          <AgentCard
            title="Tax & Dividend Analysis"
            icon={<Receipt size={18} />}
            loading={cLoading.tax || cLoading.dividend}
            response={cResponses.tax}
            dividendResponse={cResponses.dividend}
            color="emerald"
            emptyDescription="Dividend income projection."
            isCompact={cIsDone}
            staticSources={['Yahoo Finance', 'IRS']}
            loadingLabel="Calculating dividends…"
          />
        </div>

        {/* Sentiment row */}
        <div className="grid grid-cols-2 gap-4">
          <AgentCard
            title="Sentiment Analyst"
            icon={<MessageSquare size={18} />}
            loading={loading.sentiment}
            response={responses.sentiment}
            color="violet"
            emptyDescription="Investor mood analysis."
            isCompact={isDone}
            staticSources={['Reddit', 'X', 'StockTwits', 'News']}
            loadingLabel="Scanning sentiment…"
          />
          <AgentCard
            title="Sentiment Analyst"
            icon={<MessageSquare size={18} />}
            loading={cLoading.sentiment}
            response={cResponses.sentiment}
            color="violet"
            emptyDescription="Investor mood analysis."
            isCompact={cIsDone}
            staticSources={['Reddit', 'X', 'StockTwits', 'News']}
            loadingLabel="Scanning sentiment…"
          />
        </div>
      </div>
    );
  }

  // Single-ticker layout (unchanged)
  return (
    <div
      id="agents-grid"
      className="grid grid-cols-1 md:grid-cols-2 relative z-20 transition-all duration-700 gap-8 mb-12"
    >
      <div className="col-span-1 md:col-span-2 mb-4">
        <AgentCard
          title="Executive Summary"
          icon={<Sparkles size={24} className="text-amber-500" />}
          loading={loading.summary}
          response={responses.summary}
          color="amber"
          emptyDescription="A cohesive narrative synthesising all specialist findings into one plain-English investment brief."
          isCompact={isDone}
          staticSources={['Yahoo Finance', 'SEC Edgar', 'Reddit', 'StockTwits']}
          loadingLabel={summaryLabel}
        />
      </div>
      <div className="col-span-1 md:col-span-2">
        <AgentCard
          title="Research Analyst"
          icon={<Search size={20} />}
          loading={loading.research}
          response={responses.research}
          color="cyan"
          emptyDescription="Analyzes fundamentals: P/E ratios, revenue growth & institutional ownership."
          isCompact={isDone}
          staticSources={['Yahoo Finance', 'SEC Edgar']}
          loadingLabel="Analysing fundamentals…"
        />
      </div>
      <AgentCard
        title="Tax & Dividend Analysis"
        icon={<Receipt size={20} />}
        loading={loading.tax || loading.dividend}
        response={responses.tax}
        dividendResponse={responses.dividend}
        color="emerald"
        emptyDescription="Calculates capital gains tax and projects dividend income on your position."
        isCompact={isDone}
        staticSources={['Yahoo Finance', 'IRS']}
        loadingLabel="Calculating tax & dividends…"
      />
      <AgentCard
        title="Sentiment Analyst"
        icon={<MessageSquare size={20} />}
        loading={loading.sentiment}
        response={responses.sentiment}
        color="violet"
        emptyDescription="Scans Reddit, X, StockTwits & news for real-time investor mood."
        isCompact={isDone}
        staticSources={['Reddit', 'X', 'StockTwits', 'News']}
        loadingLabel="Scanning investor sentiment…"
      />
    </div>
  );
}