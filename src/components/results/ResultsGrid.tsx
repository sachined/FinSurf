import React from 'react';
import { Search, Receipt, Coins, MessageSquare } from 'lucide-react';
import { AgentCard } from '../AgentCard';
import { FinancialAgentsState, LoadingState, AccessMode } from '../../types';

interface ResultsGridProps {
  responses: FinancialAgentsState;
  loading: LoadingState;
  accessMode: AccessMode;
}

export function ResultsGrid({ responses, loading, accessMode }: ResultsGridProps) {
  return (
    <div id="agents-grid" className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 relative z-20">
      <AgentCard
        title="Research Analyst"
        icon={<Search size={20} />}
        loading={loading.research}
        response={responses.research}
        color="cyan"
        accessMode={accessMode}
      />
      <AgentCard
        title="Tax Strategist"
        icon={<Receipt size={20} />}
        loading={loading.tax}
        response={responses.tax}
        color="emerald"
        accessMode={accessMode}
      />
      <AgentCard
        title="Dividend Specialist"
        icon={<Coins size={20} />}
        loading={loading.dividend}
        response={responses.dividend}
        color="amber"
        isDividendAgent
        accessMode={accessMode}
      />
      <AgentCard
        title="Sentiment Analyst"
        icon={<MessageSquare size={20} />}
        loading={loading.sentiment}
        response={responses.sentiment}
        color="violet"
        accessMode={accessMode}
      />
    </div>
  );
}
