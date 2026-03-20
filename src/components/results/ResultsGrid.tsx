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
  isComparing?: boolean;
  compareTicker?: string;
}

export function ResultsGrid({
  responses,
  loading,
  primaryTicker,
  compareResponses,
  compareLoading,
  isComparing = false,
  compareTicker,
}: ResultsGridProps) {
  // Primary column state
  const isDone = !Object.values(loading).some(v => v) && Object.values(responses).some(r => r !== null);
  const specialistsDone =
    !loading.research && !loading.tax && !loading.dividend && !loading.sentiment &&
    (responses.research !== null || responses.tax !== null || responses.sentiment !== null);
  const summaryLabel = specialistsDone
    ? 'Final summary · combining all findings…'
    : 'Waiting for specialist agents…';

  // Compare column state
  const cLoading = compareLoading ?? { research: false, tax: false, dividend: false, sentiment: false, summary: false };
  const cResponses = compareResponses ?? { research: null, tax: null, dividend: null, sentiment: null, summary: null };
  const compareIsDone = !Object.values(cLoading).some(v => v) && Object.values(cResponses).some(r => r !== null);
  const compareSpecialistsDone = !cLoading.research && !cLoading.sentiment &&
    (cResponses.research !== null || cResponses.sentiment !== null);
  const compareSummaryLabel = compareSpecialistsDone
    ? 'Final summary · combining all findings…'
    : 'Waiting for specialist agents…';

  if (isComparing) {
    return (
      <div id="agents-grid" className="grid grid-cols-2 gap-6 relative z-20 mb-12">
        {/* Primary column */}
        <div className="flex flex-col gap-6">
          {primaryTicker && (
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Primary — {primaryTicker}
            </p>
          )}
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
            currentPrice={responses.research?.currentPrice}
          />
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

        {/* Compare column — lite: no tax/dividend */}
        <div className="flex flex-col gap-6">
          {compareTicker && (
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Compare — {compareTicker}
            </p>
          )}
          <AgentCard
            title="Executive Summary"
            icon={<Sparkles size={24} className="text-amber-500" />}
            loading={cLoading.summary}
            response={cResponses.summary}
            color="amber"
            emptyDescription="A cohesive narrative synthesising all specialist findings into one plain-English investment brief."
            isCompact={compareIsDone}
            staticSources={['Yahoo Finance', 'SEC Edgar', 'Reddit', 'StockTwits']}
            loadingLabel={compareSummaryLabel}
            currentPrice={cResponses.research?.currentPrice}
          />
          <AgentCard
            title="Research Analyst"
            icon={<Search size={20} />}
            loading={cLoading.research}
            response={cResponses.research}
            color="cyan"
            emptyDescription="Analyzes fundamentals: P/E ratios, revenue growth & institutional ownership."
            isCompact={compareIsDone}
            staticSources={['Yahoo Finance', 'SEC Edgar']}
            loadingLabel="Analysing fundamentals…"
          />
          <AgentCard
            title="Sentiment Analyst"
            icon={<MessageSquare size={20} />}
            loading={cLoading.sentiment}
            response={cResponses.sentiment}
            color="violet"
            emptyDescription="Scans Reddit, X, StockTwits & news for real-time investor mood."
            isCompact={compareIsDone}
            staticSources={['Reddit', 'X', 'StockTwits', 'News']}
            loadingLabel="Scanning investor sentiment…"
          />
        </div>
      </div>
    );
  }

  // Default single-ticker layout (unchanged)
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