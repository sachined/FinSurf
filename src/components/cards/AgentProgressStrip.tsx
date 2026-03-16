import React from 'react';
import { Search, Receipt, Coins, MessageSquare, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import { cn } from '../../utils/cn';
import { type LoadingState, type FinancialAgentsState, type AccessMode } from '../../types';

interface AgentProgressStripProps {
  loading: LoadingState;
  responses: FinancialAgentsState;
  accessMode: AccessMode;
}

const AGENT_META = [
  { key: 'summary' as const,   label: 'Summary',   icon: <Sparkles size={14} />,     cbDone: 'bg-slate-800 text-white border-2 border-slate-800 dark:bg-slate-700 dark:border-slate-600',     tropicalDone: 'bg-teal-500 text-white border-teal-600 dark:bg-teal-600 dark:border-teal-500' },
  { key: 'research' as const,  label: 'Research',  icon: <Search size={14} />,        cbDone: 'bg-blue-700 text-white border-2 border-blue-700 dark:bg-blue-600 dark:border-blue-500',         tropicalDone: 'bg-teal-600 text-white border-teal-700 dark:bg-teal-500 dark:border-teal-400' },
  { key: 'tax' as const,       label: 'Tax',       icon: <Receipt size={14} />,       cbDone: 'bg-orange-600 text-white border-2 border-orange-600 dark:bg-orange-500 dark:border-orange-400', tropicalDone: 'bg-rose-500 text-white border-rose-600 dark:bg-rose-600 dark:border-rose-500' },
  { key: 'dividend' as const,  label: 'Dividends', icon: <Coins size={14} />,         cbDone: 'bg-amber-700 text-white border-2 border-amber-700 dark:bg-amber-600 dark:border-amber-500',     tropicalDone: 'bg-yellow-500 text-white border-yellow-600 dark:bg-yellow-600 dark:border-yellow-500' },
  { key: 'sentiment' as const, label: 'Sentiment', icon: <MessageSquare size={14} />, cbDone: 'bg-rose-700 text-white border-2 border-rose-700 dark:bg-rose-600 dark:border-rose-500',         tropicalDone: 'bg-fuchsia-600 text-white border-fuchsia-700 dark:bg-fuchsia-500 dark:border-fuchsia-400' },
];

export function AgentProgressStrip({ loading, responses, accessMode }: AgentProgressStripProps) {
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
      {AGENT_META.map(({ key, label, icon, cbDone, tropicalDone }) => {
        const isLoading = loading[key];
        const isDone = !isLoading && responses[key] !== null;

        return (
          <div
            key={key}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide border transition-all",
              isDone
                ? accessMode === 'tropical'
                  ? tropicalDone
                  : accessMode === 'colorblind'
                  ? cbDone
                  : "bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300 border-lime-100 dark:border-lime-900/50"
                : isLoading
                ? accessMode === 'tropical'
                  ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-300 border-teal-200 dark:border-teal-800"
                  : accessMode === 'colorblind'
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 border-2 border-blue-600 dark:border-blue-400"
                  : "bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-400 border-lime-100 dark:border-lime-900/50"
                : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700/50"
            )}
          >
            {isDone ? (
              <CheckCircle2 size={13} className={
                accessMode === 'tropical' ? "text-teal-500" : accessMode === 'colorblind' ? "text-white" : "text-lime-600"
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
)}
</AnimatePresence>
</div>
  );
}
