import React from 'react';
import {
  TrendingUp,
  Loader2,
  ExternalLink,
  Info,
  Coins,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../utils/cn';
import { agentColors } from '../../utils/colors';
import { type AgentResponse, type DividendResponse, type ResearchResponse, type DividendStats } from '../../types';
import { fmtUsd } from '../../utils/formatting';
import { PriceChart } from '../charts/PriceChart';
import { TimestampBadge } from '../ui/TimestampBadge';

interface AgentCardProps {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  response: AgentResponse | DividendResponse | null;
  dividendResponse?: DividendResponse | null;
  color: 'cyan' | 'emerald' | 'amber' | 'violet';
  isDividendAgent?: boolean;
  emptyDescription?: string;
  isCompact?: boolean;
  staticSources?: string[];
  loadingLabel?: string;
  currentPrice?: number | null;
}

export function AgentCard({ title, icon, loading, response, dividendResponse, color, isDividendAgent, emptyDescription, isCompact, staticSources, loadingLabel, currentPrice }: AgentCardProps) {
  const colorClasses    = agentColors.badge;
  const accentClasses   = agentColors.accent;
  const cardBorderClasses   = agentColors.cardBorder;
  const headerBorderClasses = agentColors.headerBorder;
  const spinnerClasses      = agentColors.spinner;
  const emptyStateClasses   = agentColors.emptyState;
  const emptyBgClasses      = agentColors.emptyBg;
  const skeletonClasses     = agentColors.skeleton;
  const sourcesBadgeClasses = agentColors.sourcesBadge;
  const sourcesClasses      = agentColors.sources;

  const divResponse = isDividendAgent ? (response as DividendResponse) : dividendResponse;

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
      "flex flex-col transition-all h-full",
      "bg-white dark:bg-slate-900",
      isCompact ? "rounded-none shadow-none border-none" : "rounded-2xl shadow-sm",
      `shadow-slate-900/5 dark:shadow-black/20 border ${cardBorderClasses[color]}`
    )}>
      <div className={cn(
        "p-6 border-b flex items-center justify-between sticky top-0 z-10",
        `bg-white dark:bg-slate-900 ${headerBorderClasses[color]}`
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "pdf-icon-box w-10 h-10 rounded-2xl flex items-center justify-center border transition-transform",
            colorClasses[color]
          )}>
            {icon}
          </div>
          <div className="flex-1">
            <h2 className="font-black tracking-tight text-slate-950 dark:text-slate-950">{title}</h2>
            {response?.timestamp && !loading && (
              <TimestampBadge timestamp={response.timestamp} className="mt-1" />
            )}
          </div>
        </div>
        {loading && <Loader2 className={cn("animate-spin", spinnerClasses[color])} size={18} />}
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {!response && !loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn("h-full flex flex-col items-center justify-center text-center space-y-4 py-12", emptyStateClasses[color])}
            >
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center", emptyBgClasses[color])}>
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
              <div className="flex items-center gap-3 mb-5">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center opacity-40", colorClasses[color])}>
                  {icon}
                </div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-600 animate-pulse">
                  {loadingLabel ?? 'Fetching analysis…'}
                </span>
              </div>
              <div className={cn("h-3 rounded-full w-3/4 animate-pulse", skeletonClasses[color])} />
              <div className={cn("h-3 rounded-full w-full animate-pulse", skeletonClasses[color])} />
              <div className={cn("h-3 rounded-full w-5/6 animate-pulse", skeletonClasses[color])} />
              <div className={cn("h-3 rounded-full w-2/3 animate-pulse", skeletonClasses[color])} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose prose-sm prose-slate dark:prose-invert max-w-none"
            >
              {divResponse && !divResponse.isDividendStock ? (
                <div className="pdf-alert border rounded-2xl p-4 text-xs flex gap-3 mb-4 bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-400">
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black uppercase tracking-tight">No Dividend Income</p>
                    <p className="opacity-80 font-medium">This asset is not currently paying dividends.</p>
                  </div>
                </div>
              ) : null}

              {divResponse?.stats && (
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

              {currentPrice != null && (
                <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <span className="text-amber-500">●</span>
                  Current Price: <span className="font-black">{fmtUsd(currentPrice)}</span>
                </div>
              )}

              <div className="markdown-body dark:text-slate-300 overflow-x-auto">
                <Markdown remarkPlugins={[remarkGfm]}>{response?.content}</Markdown>
              </div>

              {divResponse && divResponse.content && (
                <div className="mt-6 pt-6 border-t border-emerald-100 dark:border-emerald-900/30">
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-4 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <Coins size={14} /> Dividend Analysis
                  </h4>
                  <div className={cn(
                    "markdown-body dark:text-slate-300 overflow-x-auto text-sm",
                    divResponse && !divResponse.isDividendStock && "opacity-60 grayscale"
                  )}>
                    <Markdown remarkPlugins={[remarkGfm]}>{divResponse.content}</Markdown>
                  </div>
                </div>
              )}

              {!!(response as ResearchResponse)?.priceHistory?.length && (
                <PriceChart
                  data={(response as ResearchResponse).priceHistory}
                />
              )}

              {response?.sources && response.sources.length > 0 && (
                <div className={cn("pdf-sources mt-8 pt-6 border-t", sourcesClasses[color].border)}>
                  <h4 className={cn("text-xs font-semibold uppercase tracking-wider mb-4", sourcesClasses[color].header)}>Sources</h4>
                  <div className="flex flex-wrap gap-2">
                    {response.sources.map((source, i) => (
                      <a
                        key={i}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn("pdf-source-link inline-flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-colors", sourcesClasses[color].link)}
                      >
                        <ExternalLink size={10} />
                        <span>{source.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {staticSources && staticSources.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600 mr-1">
                    Data
                  </span>
                  {staticSources.map(src => (
                    <span
                      key={src}
                      className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", sourcesBadgeClasses[color])}
                    >
                      {src}
                    </span>
                  ))}
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
