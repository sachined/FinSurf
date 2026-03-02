import React from 'react';
import { Search, Receipt, Coins, MessageSquare, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';
import { type AccessMode } from '../types';

interface WelcomeHeroProps {
  accessMode: AccessMode;
}

const AGENTS = [
  { icon: <Search size={18} />, title: 'Research Analyst', desc: 'Fundamentals, P/E, revenue growth & institutional ownership.' },
  { icon: <Receipt size={18} />, title: 'Tax Strategist', desc: 'Short vs. long-term capital gains — know your tax before you sell.' },
  { icon: <Coins size={18} />, title: 'Dividend Specialist', desc: 'Dividend yield, payout ratio & projected income on your shares.' },
  { icon: <MessageSquare size={18} />, title: 'Sentiment Analyst', desc: 'Reddit, X, StockTwits & news — what the crowd is saying right now.' },
];

export function WelcomeHero({ accessMode }: WelcomeHeroProps) {
  const accentText = accessMode === 'tropical'
    ? 'text-orange-500'
    : accessMode === 'colorblind'
    ? 'text-blue-700 dark:text-blue-400'
    : 'text-cyan-500';

  const cardBorder = accessMode === 'tropical'
    ? 'border-orange-100 dark:border-orange-900/40 bg-orange-50/40 dark:bg-orange-900/10'
    : accessMode === 'colorblind'
    ? 'border-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-slate-900'
    : 'border-cyan-50 dark:border-cyan-900/40 bg-white/60 dark:bg-slate-900/60';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5 }}
      className="mb-12"
    >
      {/* Hero headline */}
      <div className="text-center mb-10">
        <div className={cn(
          "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border",
          accessMode === 'tropical'
            ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800"
            : accessMode === 'colorblind'
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 border-blue-600 dark:border-blue-400"
            : "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-100 dark:border-cyan-900/50"
        )}>
          <Zap size={12} /> 4 AI agents · Instant analysis · Free to use
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tighter leading-tight mb-3">
          Your personal team of{' '}
          <span className={accentText}>AI financial analysts</span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto text-sm leading-relaxed">
          Enter a stock ticker below and four specialized AI agents will instantly deliver research, tax implications, dividend projections, and market sentiment — all in one place.
        </p>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {AGENTS.map(({ icon, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
            className={cn(
              "flex items-start gap-3 p-4 rounded-2xl border transition-all",
              cardBorder
            )}
          >
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
              accessMode === 'tropical'
                ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                : accessMode === 'colorblind'
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-600 dark:border-blue-400"
                : "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400"
            )}>
              {icon}
            </div>
            <div>
              <p className={cn(
                "text-xs font-black uppercase tracking-tight mb-0.5",
                accessMode === 'colorblind' ? "text-blue-950 dark:text-white" : "text-slate-800 dark:text-white"
              )}>{title}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
