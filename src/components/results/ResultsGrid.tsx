import { Search, Receipt, MessageSquare, Sparkles } from 'lucide-react';
import { AgentCard } from '../cards/AgentCard';
import { FinancialAgentsState, LoadingState } from '../../types';

interface ResultsGridProps {
  responses: FinancialAgentsState;
  loading: LoadingState;
}

export function ResultsGrid({ responses, loading }: ResultsGridProps) {
  const isDone = !Object.values(loading).some(v => v) && Object.values(responses).some(r => r !== null);
  const specialistsDone =
    !loading.research && !loading.tax && !loading.dividend && !loading.sentiment &&
    (responses.research !== null || responses.tax !== null || responses.sentiment !== null);
  const summaryLabel = specialistsDone
    ? 'Final summary · combining all findings…'
    : 'Waiting for specialist agents…';

  const isLoading = Object.values(loading).some(v => v);

  return (
    <div
      id="agents-grid"
      className="grid grid-cols-1 md:grid-cols-2 relative z-20 transition-all duration-700 gap-8 mb-12"
      aria-live="polite"
      aria-busy={isLoading}
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
