import React from 'react';
import { Search, Receipt, Coins, MessageSquare } from 'lucide-react';
import { AgentCard } from '../AgentCard';
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
  const isDone = hasResponses && !isAnyLoading;

  return (
    <div 
      id="agents-grid" 
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 relative z-20 transition-all duration-700",
        isDone ? "gap-0 mb-0" : "gap-8 mb-12"
      )}
    >
      <AgentCard
        title="Research Analyst"
        icon={<Search size={20} />}
        loading={loading.research}
        response={responses.research}
        color="cyan"
        accessMode={accessMode}
        isCompact={isDone}
      />
      <AgentCard
        title="Tax Strategist"
        icon={<Receipt size={20} />}
        loading={loading.tax}
        response={responses.tax}
        color="emerald"
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
        accessMode={accessMode}
        isCompact={isDone}
      />
      <AgentCard
        title="Sentiment Analyst"
        icon={<MessageSquare size={20} />}
        loading={loading.sentiment}
        response={responses.sentiment}
        color="violet"
        accessMode={accessMode}
        isCompact={isDone}
      />
    </div>
  );
}
