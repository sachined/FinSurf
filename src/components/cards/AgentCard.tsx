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
import { type AgentResponse, type DividendResponse, type ResearchResponse, type AccessMode, type DividendStats } from '../../types';
import { PriceChart } from '../charts/PriceChart';

interface AgentCardProps {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  response: AgentResponse | DividendResponse | null;
  color: 'cyan' | 'emerald' | 'amber' | 'violet';
  isDividendAgent?: boolean;
  emptyDescription?: string;
  accessMode: AccessMode;
  isCompact?: boolean;
}

export function AgentCard({ title, icon, loading, response, color, isDividendAgent, emptyDescription, accessMode, isCompact }: AgentCardProps) {
  const colorClasses = {
    // cyan  = ocean / turquoise water
    cyan: accessMode === 'tropical'
      ? 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-700'
      : accessMode === 'colorblind'
      ? 'bg-blue-700 text-white border-blue-700 dark:bg-blue-600 dark:border-blue-600'
      : 'bg-lime-50 text-lime-700 border-lime-100 dark:bg-lime-900/20 dark:text-lime-400 dark:border-lime-900',
    // emerald = coral / hibiscus flower
    emerald: accessMode === 'tropical'
      ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700'
      : accessMode === 'colorblind'
      ? 'bg-orange-600 text-white border-orange-600 dark:bg-orange-500 dark:border-orange-500'
      : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900',
    // amber  = golden sunshine / mango
    amber: accessMode === 'tropical'
      ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-700'
      : accessMode === 'colorblind'
      ? 'bg-amber-700 text-white border-amber-700 dark:bg-amber-600 dark:border-amber-600'
      : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900',
    // violet = fuchsia / bougainvillea
    violet: accessMode === 'tropical'
      ? 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-900/40 dark:text-fuchsia-200 dark:border-fuchsia-700'
      : accessMode === 'colorblind'
      ? 'bg-rose-700 text-white border-rose-700 dark:bg-rose-600 dark:border-rose-600'
      : 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900'
  };

  const accentClasses = {
    cyan:    accessMode === 'tropical' ? 'bg-gradient-to-r from-teal-500 to-cyan-400'    : accessMode === 'colorblind' ? 'bg-blue-700'    : 'bg-lime-500',
    emerald: accessMode === 'tropical' ? 'bg-gradient-to-r from-rose-500 to-orange-400'  : accessMode === 'colorblind' ? 'bg-orange-600'  : 'bg-emerald-600',
    amber:   accessMode === 'tropical' ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : accessMode === 'colorblind' ? 'bg-amber-700'   : 'bg-amber-600',
    violet:  accessMode === 'tropical' ? 'bg-gradient-to-r from-fuchsia-500 to-pink-400' : accessMode === 'colorblind' ? 'bg-rose-700'    : 'bg-violet-600'
  };

  // Per-card tropical borders (ocean / coral / sunshine / bougainvillea)
  const tropicalBorderClasses = {
    cyan:    'border border-teal-200 dark:border-teal-800/60 shadow-teal-500/10 dark:shadow-teal-950/20',
    emerald: 'border border-rose-200 dark:border-rose-800/60 shadow-rose-500/10 dark:shadow-rose-950/20',
    amber:   'border border-yellow-200 dark:border-yellow-800/60 shadow-yellow-500/10 dark:shadow-yellow-950/20',
    violet:  'border border-fuchsia-200 dark:border-fuchsia-800/60 shadow-fuchsia-500/10 dark:shadow-fuchsia-950/20',
  };

  // Tinted card header backgrounds (tropical mode)
  const tropicalHeaderClasses = {
    cyan:    'bg-teal-50/60 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/30',
    emerald: 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/30',
    amber:   'bg-yellow-50/60 dark:bg-yellow-950/30 border-yellow-100 dark:border-yellow-900/30',
    violet:  'bg-fuchsia-50/60 dark:bg-fuchsia-950/30 border-fuchsia-100 dark:border-fuchsia-900/30',
  };

  // Per-card colorblind-safe borders & shadows (Okabe-Ito palette)
  const cardBorderClasses = {
    cyan:    'border-4 border-blue-700 dark:border-blue-500 shadow-[6px_6px_0px_0px_rgba(29,78,216,1)] dark:shadow-[6px_6px_0px_0px_rgba(59,130,246,0.5)]',
    emerald: 'border-4 border-orange-600 dark:border-orange-400 shadow-[6px_6px_0px_0px_rgba(234,88,12,1)] dark:shadow-[6px_6px_0px_0px_rgba(251,146,60,0.5)]',
    amber:   'border-4 border-amber-700 dark:border-amber-500 shadow-[6px_6px_0px_0px_rgba(180,83,9,1)] dark:shadow-[6px_6px_0px_0px_rgba(245,158,11,0.5)]',
    violet:  'border-4 border-rose-700 dark:border-rose-500 shadow-[6px_6px_0px_0px_rgba(190,18,60,1)] dark:shadow-[6px_6px_0px_0px_rgba(251,113,133,0.5)]',
  };

  // Tinted card header backgrounds (colorblind mode)
  const headerBgClasses = {
    cyan:    'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
    emerald: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900',
    amber:   'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
    violet:  'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
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
      "flex flex-col transition-all resize overflow-auto min-h-[400px] min-w-[280px] h-full",
      accessMode === 'tropical'
        ? "bg-white dark:bg-[#0b1f1e]"
        : accessMode === 'colorblind'
        ? "bg-blue-50/30 dark:bg-[#0a0d18]"
        : "bg-white dark:bg-slate-900",
      isCompact ? "rounded-none shadow-none border-none" : "rounded-2xl shadow-sm",
      accessMode === 'colorblind'
        ? cardBorderClasses[color]
        : accessMode === 'tropical'
        ? tropicalBorderClasses[color]
        : "shadow-lime-900/5 dark:shadow-black/20 border border-lime-50 dark:border-lime-900/50"
    )}>
      <div className={cn(
        "p-6 border-b flex items-center justify-between sticky top-0 z-10",
        accessMode === 'colorblind'
          ? headerBgClasses[color]
          : accessMode === 'tropical'
          ? tropicalHeaderClasses[color]
          : "bg-white dark:bg-slate-900 border-lime-50 dark:border-lime-900/30"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "pdf-icon-box w-10 h-10 rounded-2xl flex items-center justify-center border transition-transform", 
            colorClasses[color],
            accessMode === 'colorblind' && "scale-110"
          )}>
            {icon}
          </div>
          <div>
            <h2 className={cn(
              "font-black tracking-tight",
              accessMode === 'colorblind' ? "text-blue-950 dark:text-white text-lg" : "text-slate-800 dark:text-white"
            )}>{title}</h2>
            {accessMode === 'colorblind' && (
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-tighter text-blue-700 dark:text-blue-400">Accessibility Enhanced</span>
              </div>
            )}
          </div>
        </div>
        {loading && <Loader2 className="animate-spin text-cyan-400" size={18} />}
      </div>
      
      <div className="p-6">
        <AnimatePresence mode="wait">
          {!response && !loading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-lime-200 dark:text-lime-900 text-center space-y-4 py-12"
            >
              <div className="w-16 h-16 rounded-full bg-lime-50/50 dark:bg-lime-900/10 flex items-center justify-center">
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
              <div className="h-4 bg-lime-50 dark:bg-slate-800 rounded-full w-3/4 animate-pulse" />
              <div className="h-4 bg-lime-50 dark:bg-slate-800 rounded-full w-full animate-pulse" />
              <div className="h-4 bg-lime-50 dark:bg-slate-800 rounded-full w-5/6 animate-pulse" />
              <div className="h-4 bg-lime-50 dark:bg-slate-800 rounded-full w-2/3 animate-pulse" />
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "prose prose-sm prose-slate dark:prose-invert max-w-none",
                accessMode === 'colorblind' && "prose-strong:text-blue-900 dark:prose-strong:text-blue-100"
              )}
            >
              {isDividendAgent && divResponse && !divResponse.isDividendStock ? (
                <div className={cn(
                  "pdf-alert border rounded-2xl p-4 text-xs flex gap-3 mb-4",
                  accessMode === 'colorblind' 
                    ? "bg-blue-50 border-blue-600 text-blue-900" 
                    : "bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-400"
                )}>
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black uppercase tracking-tight">No Projection</p>
                    <p className="opacity-80 font-medium">This asset is not currently paying dividends. Historical context provided below.</p>
                  </div>
                </div>
              ) : null}

              {isDividendAgent && divResponse?.stats && (
                <div className={cn(
                  "mb-5 rounded-2xl border overflow-hidden",
                  accessMode === 'colorblind'
                    ? "border-yellow-600"
                    : accessMode === 'tropical'
                    ? "border-yellow-200 dark:border-yellow-800"
                    : "border-amber-100 dark:border-amber-900/40"
                )}>
                  <div className={cn(
                    "pdf-stat-header px-4 py-2 text-[10px] font-black uppercase tracking-widest",
                    accessMode === 'colorblind'
                      ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-200"
                      : accessMode === 'tropical'
                      ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                      : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                  )}>
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
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{icon} {label}</span>
                          <span className={cn(
                            "text-sm font-black",
                            isRisk
                              ? "text-red-600 dark:text-red-400"
                              : accessMode === 'colorblind'
                              ? "text-yellow-900 dark:text-yellow-200"
                              : "text-amber-700 dark:text-amber-300"
                          )}>
                            {val}
                            {isRisk && <span className="ml-1 text-[9px] font-black text-red-500 uppercase"> ⚠ Risk</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={cn(
                "markdown-body dark:text-slate-300 overflow-x-auto", 
                isDividendAgent && divResponse && !divResponse.isDividendStock && "opacity-60 grayscale",
                accessMode === 'colorblind' && "font-bold text-slate-900 dark:text-white leading-relaxed"
              )}>
                <Markdown remarkPlugins={[remarkGfm]}>{response?.content}</Markdown>
              </div>
              
              {!!(response as ResearchResponse)?.priceHistory?.length && (
                <PriceChart
                  data={(response as ResearchResponse).priceHistory}
                  accessMode={accessMode}
                />
              )}

              {response?.sources && response.sources.length > 0 && (
                <div className="pdf-sources mt-8 pt-6 border-t border-lime-50 dark:border-lime-900/30">
                  <h4 className="text-[10px] font-black text-lime-400 dark:text-lime-800 uppercase tracking-widest mb-4">Sources</h4>
                  <div className="flex flex-wrap gap-2">
                    {response.sources.map((source, i) => (
                      <a 
                        key={i}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pdf-source-link inline-flex items-center gap-1.5 px-3 py-2 bg-lime-50/50 dark:bg-slate-800 border border-lime-100 dark:border-lime-900 rounded-xl text-[10px] font-bold text-lime-700 dark:text-lime-400 transition-colors"
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
