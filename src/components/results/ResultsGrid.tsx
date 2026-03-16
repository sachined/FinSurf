import React from 'react';
import { Search, Receipt, Coins, MessageSquare, Sparkles } from 'lucide-react';
import { AgentCard } from '../cards/AgentCard';
import { FinancialAgentsState, LoadingState, AccessMode } from '../../types';
import { cn } from '../../utils/cn';

interface ResultsGridProps {
  responses: FinancialAgentsState;
  loading: LoadingState;
  accessMode: AccessMode;
}

export function ResultsGrid({ responses, loading, accessMode }: ResultsGridProps) {
  const isAnyLoading = Object.values(loading).some(v => v);
  const hasResponses = Object.values(responses).some(r => r !== null);
  const isDone = !Object.values(loading).some(v => v) && Object.values(responses).some(r => r !== null);

  return (
    <div
      id="agents-grid"
      className="grid grid-cols-1 md:grid-cols-2 relative z-20 transition-all duration-700 gap-8 mb-12"
    >
      {/* Executive Summary — full-width accumulator card, rendered after all four specialists */}
      <div className="col-span-1 md:col-span-2 mb-4">
        <AgentCard
          title="Executive Summary"
          icon={<Sparkles size={24} className="text-cyan-500" />}
          loading={loading.summary}
          response={responses.summary}
          color="cyan"
          emptyDescription="A plain-English investment brief combining all findings — the best place to start."
          accessMode={accessMode}
          isCompact={isDone}
        />
      </div>
      <AgentCard
        title="Research Analyst"
        icon={<Search size={20} />}
        loading={loading.research}
        response={responses.research}
        color="cyan"
        emptyDescription="Is the company healthy? Earnings growth, valuation, and who the big investors are."
        accessMode={accessMode}
        isCompact={isDone}
      />
      <AgentCard
        title="Tax Strategist"
        icon={<Receipt size={20} />}
        loading={loading.tax}
        response={responses.tax}
        color="emerald"
        emptyDescription="Know your tax bill before you sell — short-term vs. long-term rates, explained simply."
        accessMode={accessMode}
        isCompact={isDone}
      />
      <AgentCard
        title="Dividend Specialist"
        icon={<Coins size={20} />}
        loading={loading.dividend}
        response={responses.dividend}
        color="amber"
        isDividendAgent
        emptyDescription="How much cash will this stock pay you? Income projections on your exact share count."
        accessMode={accessMode}
        isCompact={isDone}
      />
      <AgentCard
        title="Sentiment Analyst"
        icon={<MessageSquare size={20} />}
        loading={loading.sentiment}
        response={responses.sentiment}
        color="violet"
        emptyDescription="What is everyone saying? Reddit, X, StockTwits & news — the crowd's mood right now."
        accessMode={accessMode}
        isCompact={isDone}
      />
    </div>
  );
}
