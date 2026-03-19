import React from 'react';
import { Search, Receipt, Coins, MessageSquare, Sparkles } from 'lucide-react';
import { AgentCard } from '../cards/AgentCard';
import { FinancialAgentsState, LoadingState } from '../../types';

interface ResultsGridProps {
  responses: FinancialAgentsState;
  loading: LoadingState;
}

export function ResultsGrid({ responses, loading }: ResultsGridProps) {
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
          icon={<Sparkles size={24} className="text-amber-500" />}
          loading={loading.summary}
          response={responses.summary}
          color="cyan"
          emptyDescription="A cohesive narrative synthesising all specialist findings into one plain-English investment brief."
          isCompact={isDone}
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
        />
      </div>
      <div className="col-span-1 md:col-span-2">
        <AgentCard
          title="Tax Strategist"
          icon={<Receipt size={20} />}
          loading={loading.tax}
          response={responses.tax}
          color="emerald"
          emptyDescription="Calculates your capital gains tax based on your holding period (short vs. long term)."
          isCompact={isDone}
        />
      </div>
      <AgentCard
        title="Dividend Specialist"
        icon={<Coins size={20} />}
        loading={loading.dividend}
        response={responses.dividend}
        color="amber"
        isDividendAgent
        emptyDescription="Projects dividend income on your shares including yield, payout ratio & growth rate."
        isCompact={isDone}
      />
      <AgentCard
        title="Sentiment Analyst"
        icon={<MessageSquare size={20} />}
        loading={loading.sentiment}
        response={responses.sentiment}
        color="violet"
        emptyDescription="Scans Reddit, X, StockTwits & news for real-time investor mood."
        isCompact={isDone}
      />
    </div>
  );
}
