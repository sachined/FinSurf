import React from 'react';
import { Search, Receipt, Coins, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';
import { type LoadingState, type FinancialAgentsState, type AccessMode } from '../types';

interface AgentProgressStripProps {
  loading: LoadingState;
  responses: FinancialAgentsState;
  accessMode: AccessMode;
}

const AGENT_META = [
  { key: 'research' as const, label: 'Research', icon: <Search size={14} /> },
  { key: 'tax' as const, label: 'Tax', icon: <Receipt size={14} /> },
  { key: 'dividend' as const, label: 'Dividends', icon: <Coins size={14} /> },
  { key: 'sentiment' as const, label: 'Sentiment', icon: <MessageSquare size={14} /> },
];

export function AgentProgressStrip({ loading, responses, accessMode }: AgentProgressStripProps) {
  const isAnyActive = Object.values(loading).some(v => v) || Object.values(responses).some(r => r !== null);
  if (!isAnyActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 mb-6"
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
                ? accessMode === 'tropical'
                  ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800"
                  : accessMode === 'colorblind'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-900 dark:border-white"
                  : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50"
                : isLoading
                ? accessMode === 'tropical'
                  ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 border-orange-200 dark:border-orange-800"
                  : accessMode === 'colorblind'
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 border-2 border-blue-600 dark:border-blue-400"
                  : "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/50"
                : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700/50"
            )}
          >
            {isDone ? (
              <CheckCircle2 size={13} className={
                accessMode === 'tropical' ? "text-teal-500" : accessMode === 'colorblind' ? "text-slate-800 dark:text-white" : "text-emerald-500"
              } />
            ) : isLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              icon
            )}
            {label}
          </div>
        );
      })}
    </motion.div>
  );
}
