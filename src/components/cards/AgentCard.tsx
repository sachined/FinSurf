import React from 'react';
import {
  TrendingUp,
  Loader2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../utils/cn';
import { type AgentResponse, type DividendResponse, type ResearchResponse, type DividendStats } from '../../types';
import { PriceChart } from '../charts/PriceChart';

interface AgentCardProps {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  response: AgentResponse | DividendResponse | null;
  color: 'cyan' | 'emerald' | 'amber' | 'violet';
  isDividendAgent?: boolean;
  emptyDescription?: string;
  isCompact?: boolean;
}

export function AgentCard({ title, icon, loading, response, color, isDividendAgent, emptyDescription, isCompact }: AgentCardProps) {
  const colorClasses = {
    cyan:    'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900',
    amber:   'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900',
    violet:  'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900',
  };

  const accentClasses = {
    cyan:    'bg-amber-500',
    emerald: 'bg-emerald-600',
    amber:   'bg-amber-600',
    violet:  'bg-violet-600',
  };

  const divResponse = isDividendAgent ? (response as DividendResponse) : null;

  const statLabels: { key: keyof DividendStats; label: string; icon: string }[] = [
    { key: 'currentYield',          label: 'Current Yield',      icon: '📈' },
    { key: 'annualDividendPerShare', label: 'Annual Div/Share',   icon: '💵' },
    { key: 'payoutRatio',            label: 'Payout Ratio',       icon: '⚖️' },
    { key: 'fiveYearGrowthRate',     label: '5-Year Growth',      icon: '🚀' },
    { key: 'paymentFrequency',       label: 'Frequency',          icon: '🗓️' },
    { key: 'exDividendDate',         label: 'Ex-Div Date',        icon: '📅' },
    { key: 'consecutiveYears',       label: 'Consecutive Yrs',    icon: '🏆' },
  ];

  return (
    <div data-pdf-chunk="card" data-pdf-title={title} className={cn(
      "flex flex-col transition-all min-h-[400px] min-w-[280px] h-full",
      "bg-white dark:bg-slate-900",
      isCompact ? "rounded-none shadow-none border-none" : "rounded-2xl shadow-sm",
      "shadow-amber-900/5 dark:shadow-black/20 border border-amber-50 dark:border-amber-900/50"
    )}>
      <div className={cn(
        "p-6 border-b flex items-center justify-between sticky top-0 z-10",
        "bg-white dark:bg-slate-900 border-amber-50 dark:border-amber-900/30"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "pdf-icon-box w-10 h-10 rounded-2xl flex items-center justify-center border transition-transform",
            colorClasses[color]
          )}>
            {icon}
          </div>
          <div>
            <h2 className="font-black tracking-tight text-slate-800 dark:text-white">{title}</h2>
          </div>
        </div>
        {loading && <Loader2 className="animate-spin text-amber-400" size={18} />}
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {!response && !loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-amber-200 dark:text-amber-900 text-center space-y-4 py-12"
            >
              <div className="w-16 h-16 rounded-full bg-amber-50/50 dark:bg-amber-900/10 flex items-center justify-center">
                <TrendingUp size={32} />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-widest">Ready to analyse</p>
                {emptyDescription && (
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-600 max-w-[200px] mx-auto leading-relaxed">{emptyDescription}</p>
                )}
              </div>
            </motion.div>
          ) : loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="h-4 bg-amber-50 dark:bg-slate-800 rounded-full w-3/4 animate-pulse" />
              <div className="h-4 bg-amber-50 dark:bg-slate-800 rounded-full w-full animate-pulse" />
              <div className="h-4 bg-amber-50 dark:bg-slate-800 rounded-full w-5/6 animate-pulse" />
              <div className="h-4 bg-amber-50 dark:bg-slate-800 rounded-full w-2/3 animate-pulse" />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose prose-sm prose-slate dark:prose-invert max-w-none"
            >
              {isDividendAgent && divResponse && !divResponse.isDividendStock ? (
                <div className="pdf-alert border rounded-2xl p-4 text-xs flex gap-3 mb-4 bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-400">
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black uppercase tracking-tight">No Projection</p>
                    <p className="opacity-80 font-medium">This asset is not currently paying dividends. Historical context provided below.</p>
                  </div>
                </div>
              ) : null}

              {isDividendAgent && divResponse?.stats && (
                <div className="mb-5 rounded-2xl border overflow-hidden border-amber-100 dark:border-amber-900/40">
                  <div className="pdf-stat-header px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                    📊 Key Dividend Stats
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-x divide-y divide-amber-100 dark:divide-amber-900/30">
                    {statLabels.map(({ key, label, icon }) => {
                      const val = divResponse.stats![key];
                      if (!val || val === 'N/A') return null;
                      const isRisk = key === 'payoutRatio' && parseFloat(val) > 90;
                      return (
                        <div key={key} className={cn(
                          "px-3 py-2.5 flex flex-col gap-0.5",
                          isRisk ? "bg-red-50 dark:bg-red-900/10" : "bg-white dark:bg-slate-900"
                        )}>
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{icon} {label}</span>
                          <span className={cn(
                            "text-sm font-black",
                            isRisk
                              ? "text-red-600 dark:text-red-400"
                              : "text-amber-700 dark:text-amber-300"
                          )}>
                            {val}
                            {isRisk && <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-red-500"> ⚠ Risk</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={cn(
                "markdown-body dark:text-slate-300 overflow-x-auto",
                isDividendAgent && divResponse && !divResponse.isDividendStock && "opacity-60 grayscale"
              )}>
                <Markdown remarkPlugins={[remarkGfm]}>{response?.content}</Markdown>
              </div>

              {!!(response as ResearchResponse)?.priceHistory?.length && (
                <PriceChart
                  data={(response as ResearchResponse).priceHistory}
                />
              )}

              {response?.sources && response.sources.length > 0 && (
                <div className="pdf-sources mt-8 pt-6 border-t border-amber-50 dark:border-amber-900/30">
                  <h4 className="text-xs font-semibold text-amber-400 dark:text-amber-800 uppercase tracking-wider mb-4">Sources</h4>
                  <div className="flex flex-wrap gap-2">
                    {response.sources.map((source, i) => (
                      <a
                        key={i}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pdf-source-link inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50/50 dark:bg-slate-800 border border-amber-100 dark:border-amber-900 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 transition-colors"
                      >
                        <ExternalLink size={10} />
                        <span>{source.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!isCompact && <div className={cn("h-2 w-full", accentClasses[color])} />}
    </div>
  );
}
