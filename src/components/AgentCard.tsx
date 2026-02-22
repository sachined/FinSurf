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
import { type AgentResponse, type DividendResponse } from '../services/geminiService';
import { type AccessMode } from '../types';

interface AgentCardProps {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  response: AgentResponse | DividendResponse | null;
  color: 'cyan' | 'emerald' | 'amber' | 'violet';
  isDividendAgent?: boolean;
  accessMode: AccessMode;
}

export function AgentCard({ title, icon, loading, response, color, isDividendAgent, accessMode }: AgentCardProps) {
  const colorClasses = {
    cyan: accessMode === 'tropical' 
      ? 'bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-900'
      : accessMode === 'colorblind'
      ? 'bg-blue-100 text-blue-900 border-blue-600 border-2 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-400'
      : 'bg-cyan-50 text-cyan-600 border-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-900',
    emerald: accessMode === 'tropical'
      ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900'
      : accessMode === 'colorblind'
      ? 'bg-orange-100 text-orange-900 border-orange-600 border-2 dark:bg-orange-900/40 dark:text-orange-100 dark:border-orange-400'
      : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900',
    amber: accessMode === 'tropical'
      ? 'bg-yellow-50 text-yellow-600 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900'
      : accessMode === 'colorblind'
      ? 'bg-yellow-100 text-yellow-900 border-yellow-600 border-2 dark:bg-yellow-900/40 dark:text-yellow-100 dark:border-yellow-400'
      : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900',
    violet: accessMode === 'tropical'
      ? 'bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-900'
      : accessMode === 'colorblind'
      ? 'bg-purple-100 text-purple-900 border-purple-600 border-2 dark:bg-purple-900/40 dark:text-purple-100 dark:border-purple-400'
      : 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900'
  };

  const accentClasses = {
    cyan: accessMode === 'tropical' ? 'bg-teal-600' : accessMode === 'colorblind' ? 'bg-blue-700' : 'bg-cyan-600',
    emerald: accessMode === 'tropical' ? 'bg-orange-600' : accessMode === 'colorblind' ? 'bg-orange-700' : 'bg-emerald-600',
    amber: accessMode === 'tropical' ? 'bg-yellow-600' : accessMode === 'colorblind' ? 'bg-yellow-700' : 'bg-amber-600',
    violet: accessMode === 'tropical' ? 'bg-pink-600' : accessMode === 'colorblind' ? 'bg-purple-700' : 'bg-violet-600'
  };

  const divResponse = isDividendAgent ? (response as DividendResponse) : null;

  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl flex flex-col transition-all hover:scale-[1.01] resize overflow-auto min-h-[400px] min-w-[280px] h-fit",
      accessMode === 'colorblind' 
        ? "border-4 border-blue-600 shadow-blue-900/20" 
        : "shadow-cyan-900/5 dark:shadow-black/20 border border-cyan-50 dark:border-cyan-900/50"
    )}>
      <div className="p-6 border-b border-cyan-50 dark:border-cyan-900/30 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border", colorClasses[color])}>
            {icon}
          </div>
          <div>
            <h2 className="font-black text-slate-800 dark:text-white tracking-tight">{title}</h2>
            {accessMode === 'colorblind' && (
              <span className="text-[8px] font-black uppercase tracking-tighter text-blue-600 dark:text-blue-400">High Contrast Mode</span>
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
                  "border rounded-2xl p-4 text-xs flex gap-3 mb-4",
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
                accessMode === 'colorblind' && "font-bold text-slate-900 dark:text-white"
              )}>
                <Markdown remarkPlugins={[remarkGfm]}>{response?.content}</Markdown>
              </div>
              
              {response?.sources && response.sources.length > 0 && (
                <div className="mt-8 pt-6 border-t border-cyan-50 dark:border-cyan-900/30">
                  <h4 className="text-[10px] font-black text-cyan-300 dark:text-cyan-700 uppercase tracking-widest mb-4">Sources</h4>
                  <div className="flex flex-wrap gap-2">
                    {response.sources.map((source, i) => (
                      <a 
                        key={i}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-50/50 dark:bg-slate-800 border border-cyan-100 dark:border-cyan-900 rounded-xl text-[10px] font-bold text-cyan-700 dark:text-cyan-400 transition-colors"
                      >
                        <ExternalLink size={10} />
                        <span className="max-w-[100px] truncate">{source.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className={cn("h-2 w-full", accentClasses[color])} />
    </div>
  );
}
