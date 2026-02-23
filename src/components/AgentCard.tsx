import React from 'react';
import { 
  TrendingUp, 
  Loader2, 
  ExternalLink,
  Info,
  MessageSquare,
  Search,
  Receipt,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../utils/cn';
import { type AgentResponse, type DividendResponse, type AccessMode } from '../types';

interface AgentCardProps {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  response: AgentResponse | DividendResponse | null;
  color: 'cyan' | 'emerald' | 'amber' | 'violet';
  isDividendAgent?: boolean;
  accessMode: AccessMode;
  isCompact?: boolean;
}

export function AgentCard({ title, icon, loading, response, color, isDividendAgent, accessMode, isCompact }: AgentCardProps) {
  const colorClasses = {
    cyan: accessMode === 'tropical' 
      ? 'bg-teal-50/50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800'
      : accessMode === 'colorblind'
      ? 'bg-white text-blue-950 border-blue-600 border-2 dark:bg-slate-900 dark:text-blue-100 dark:border-blue-400 shadow-[4px_4px_0px_0px_rgba(37,99,235,1)]'
      : 'bg-cyan-50 text-cyan-600 border-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-900',
    emerald: accessMode === 'tropical'
      ? 'bg-orange-50/50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
      : accessMode === 'colorblind'
      ? 'bg-white text-slate-900 border-slate-900 border-2 dark:bg-slate-900 dark:text-white dark:border-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]'
      : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900',
    amber: accessMode === 'tropical'
      ? 'bg-yellow-50/50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800'
      : accessMode === 'colorblind'
      ? 'bg-yellow-50 text-yellow-950 border-yellow-600 border-2 dark:bg-yellow-900/40 dark:text-yellow-100 dark:border-yellow-400 shadow-[4px_4px_0px_0px_rgba(202,138,4,1)]'
      : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900',
    violet: accessMode === 'tropical'
      ? 'bg-pink-50/50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800'
      : accessMode === 'colorblind'
      ? 'bg-blue-50 text-blue-950 border-blue-800 border-2 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-400 shadow-[4px_4px_0px_0px_rgba(30,58,138,1)]'
      : 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900'
  };

  const accentClasses = {
    cyan: accessMode === 'tropical' ? 'bg-gradient-to-r from-teal-400 to-cyan-400' : accessMode === 'colorblind' ? 'bg-blue-700' : 'bg-cyan-600',
    emerald: accessMode === 'tropical' ? 'bg-gradient-to-r from-orange-400 to-amber-400' : accessMode === 'colorblind' ? 'bg-orange-700' : 'bg-emerald-600',
    amber: accessMode === 'tropical' ? 'bg-gradient-to-r from-yellow-400 to-orange-400' : accessMode === 'colorblind' ? 'bg-yellow-700' : 'bg-amber-600',
    violet: accessMode === 'tropical' ? 'bg-gradient-to-r from-pink-400 to-rose-400' : accessMode === 'colorblind' ? 'bg-purple-700' : 'bg-violet-600'
  };

  const divResponse = isDividendAgent ? (response as DividendResponse) : null;

  return (
    <div data-pdf-chunk="card" data-pdf-title={title} className={cn(
      "bg-white dark:bg-slate-900 flex flex-col transition-all resize overflow-auto min-h-[400px] min-w-[280px] h-full",
      isCompact ? "rounded-none shadow-none border-none" : "rounded-[2rem] shadow-xl hover:scale-[1.01]",
      accessMode === 'colorblind' 
        ? "border-4 border-blue-600 dark:border-blue-500 shadow-[8px_8px_0px_0px_rgba(30,58,138,0.2)]" 
        : accessMode === 'tropical'
        ? "shadow-orange-900/5 dark:shadow-orange-950/20 border border-orange-100 dark:border-orange-900/50"
        : "shadow-cyan-900/5 dark:shadow-black/20 border border-cyan-50 dark:border-cyan-900/50"
    )}>
      <div className={cn(
        "p-6 border-b flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10",
        accessMode === 'tropical' ? "border-orange-50 dark:border-orange-900/20" : "border-cyan-50 dark:border-cyan-900/30"
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
              className="h-full flex flex-col items-center justify-center text-cyan-200 dark:text-cyan-900 text-center space-y-3 py-12"
            >
              <div className="w-16 h-16 rounded-full bg-cyan-50/50 dark:bg-cyan-900/10 flex items-center justify-center">
                <TrendingUp size={32} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest">Waiting for waves...</p>
            </motion.div>
          ) : loading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="h-4 bg-cyan-50 dark:bg-slate-800 rounded-full w-3/4 animate-pulse" />
              <div className="h-4 bg-cyan-50 dark:bg-slate-800 rounded-full w-full animate-pulse" />
              <div className="h-4 bg-cyan-50 dark:bg-slate-800 rounded-full w-5/6 animate-pulse" />
              <div className="h-4 bg-cyan-50 dark:bg-slate-800 rounded-full w-2/3 animate-pulse" />
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

              <div className={cn(
                "markdown-body dark:text-slate-300 overflow-x-auto", 
                isDividendAgent && divResponse && !divResponse.isDividendStock && "opacity-60 grayscale",
                accessMode === 'colorblind' && "font-bold text-slate-900 dark:text-white leading-relaxed"
              )}>
                <Markdown remarkPlugins={[remarkGfm]}>{response?.content}</Markdown>
              </div>
              
              {response?.sources && response.sources.length > 0 && (
                <div className="pdf-sources mt-8 pt-6 border-t border-cyan-50 dark:border-cyan-900/30">
                  <h4 className="text-[10px] font-black text-cyan-300 dark:text-cyan-700 uppercase tracking-widest mb-4">Sources</h4>
                  <div className="flex flex-wrap gap-2">
                    {response.sources.map((source, i) => (
                      <a 
                        key={i}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pdf-source-link inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-50/50 dark:bg-slate-800 border border-cyan-100 dark:border-cyan-900 rounded-xl text-[10px] font-bold text-cyan-700 dark:text-cyan-400 transition-colors"
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
