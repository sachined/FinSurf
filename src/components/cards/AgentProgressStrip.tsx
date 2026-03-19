import React from 'react';
import { Search, Receipt, Coins, MessageSquare, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import { cn } from '../../utils/cn';
import { type LoadingState, type FinancialAgentsState } from '../../types';

interface AgentProgressStripProps {
  loading: LoadingState;
  responses: FinancialAgentsState;
}

const AGENT_META = [
  { key: 'summary' as const,   label: 'Summary',   icon: <Sparkles size={14} /> },
  { key: 'research' as const,  label: 'Research',  icon: <Search size={14} /> },
  { key: 'tax' as const,       label: 'Tax',       icon: <Receipt size={14} /> },
  { key: 'dividend' as const,  label: 'Dividends', icon: <Coins size={14} /> },
  { key: 'sentiment' as const, label: 'Sentiment', icon: <MessageSquare size={14} /> },
];

export function AgentProgressStrip({ loading, responses }: AgentProgressStripProps) {
  const isAnyActive = Object.values(loading).some(v => v) || Object.values(responses).some(r => r !== null);

  return (
      <div className="min-h-[44px] mb-6 flex items-center">
        <AnimatePresence>
          {isAnyActive && (
              <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-wrap gap-2 w-full"
              >
      {AGENT_META.map(({ key, label, icon }) => {
        const isLoading = loading[key];
        const isDone = !isLoading && responses[key] !== null;

        return (
          <div
            key={key}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide border transition-all",
              isDone
                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/50"
                : isLoading
                ? "bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-400 border-lime-100 dark:border-lime-900/50"
                : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700/50"
            )}
          >
            {isDone ? (
              <CheckCircle2 size={13} className="text-amber-600 dark:text-amber-400" />
            ) : isLoading ? (
              <Loader2 size={13} className="animate-spin text-lime-600 dark:text-lime-400" />
            ) : (
              icon
            )}
            {label}
          </div>
        );
      })}
    </motion.div>
)}
</AnimatePresence>
</div>
  );
}
