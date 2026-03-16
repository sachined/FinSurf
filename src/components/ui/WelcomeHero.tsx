import React from 'react';
import { Search, Receipt, Coins, MessageSquare, Zap, Sparkles, RotateCcw, HelpCircle, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';
import { type AccessMode } from '../../types';

interface WelcomeHeroProps {
  accessMode: AccessMode;
}

const TRUST_BADGES = [
  { icon: <RotateCcw size={16} />, title: 'Real-time Data', desc: 'Synced with live market feeds' },
  { icon: <HelpCircle size={16} />, title: 'AI-Powered', desc: '5 specialized financial agents' },
  { icon: <Info size={16} />, title: 'Tax Ready', desc: 'Short & long-term gain analysis' },
];

const AGENTS = [
  { icon: <Sparkles size={18} />, title: 'Executive Summary', desc: 'A plain-English brief combining all findings — great starting point for any investor.',   cbIcon: 'bg-slate-800 text-white border-slate-800',    tropicalCard: 'border-teal-200 dark:border-teal-800/60 bg-teal-50/40 dark:bg-teal-900/10',       tropicalIcon: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
  { icon: <Search size={18} />,    title: 'Research Analyst',   desc: 'Is the company healthy? Earnings growth, valuation, and who the big investors are.',         cbIcon: 'bg-blue-700 text-white border-blue-700',      tropicalCard: 'border-teal-200 dark:border-teal-800/60 bg-teal-50/40 dark:bg-teal-900/10',       tropicalIcon: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
  { icon: <Receipt size={18} />,   title: 'Tax Strategist',     desc: 'Know your tax bill before you sell — short-term vs. long-term rates, explained simply.',     cbIcon: 'bg-orange-600 text-white border-orange-600',  tropicalCard: 'border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-900/10',       tropicalIcon: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' },
  { icon: <Coins size={18} />,     title: 'Dividend Specialist', desc: 'How much cash will this stock pay you? Income projections on your exact share count.',      cbIcon: 'bg-amber-700 text-white border-amber-700',    tropicalCard: 'border-yellow-200 dark:border-yellow-800/60 bg-yellow-50/40 dark:bg-yellow-900/10', tropicalIcon: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  { icon: <MessageSquare size={18} />, title: 'Sentiment Analyst', desc: "What is everyone saying? Reddit, X, StockTwits & news — the crowd's mood right now.",    cbIcon: 'bg-rose-700 text-white border-rose-700',      tropicalCard: 'border-fuchsia-200 dark:border-fuchsia-800/60 bg-fuchsia-50/40 dark:bg-fuchsia-900/10', tropicalIcon: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300' },
];

export function WelcomeHero({ accessMode }: WelcomeHeroProps) {
  const accentText = accessMode === 'tropical'
    ? 'text-orange-500'
    : accessMode === 'colorblind'
    ? 'text-blue-700 dark:text-blue-400'
    : 'text-lime-500';

  // Trust badges use a generic teal in tropical; agent cards use per-card colors below
  const cardBorder = accessMode === 'tropical'
    ? 'border-teal-200 dark:border-teal-800/60 bg-teal-50/40 dark:bg-teal-900/10'
    : accessMode === 'colorblind'
    ? 'border-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-slate-900'
    : 'border-lime-100 dark:border-lime-900/40 bg-white/60 dark:bg-slate-900/60';

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
            ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800"
            : accessMode === 'colorblind'
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 border-blue-600 dark:border-blue-400"
            : "bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300 border-lime-100 dark:border-lime-900/50"
        )}>
          <Zap size={12} /> 5 AI agents · No finance degree needed · Free to use
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tighter leading-tight mb-3">
          Your personal team of{' '}
          <span className={accentText}>AI financial analysts</span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto text-sm leading-relaxed">
          Enter a stock symbol (like <strong className="text-slate-700 dark:text-slate-300">AAPL</strong> for Apple) and five AI agents instantly deliver research, your tax impact, dividend income, and social sentiment — explained in plain English.
        </p>
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {TRUST_BADGES.map(({ icon, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.06, duration: 0.35 }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl border",
              cardBorder
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
              accessMode === 'tropical'
                ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                : accessMode === 'colorblind'
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-600 dark:border-blue-400"
                : "bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-400"
            )}>
              {icon}
            </div>
            <div>
              <p className={cn(
                "text-[11px] font-black uppercase tracking-tight",
                accessMode === 'colorblind' ? "text-blue-950 dark:text-white" : "text-slate-800 dark:text-white"
              )}>{title}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">{desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {AGENTS.map(({ icon, title, desc, cbIcon, tropicalCard, tropicalIcon }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
            className={cn(
              "flex items-start gap-3 p-4 rounded-2xl border transition-all",
              accessMode === 'tropical' ? tropicalCard : cardBorder
            )}
          >
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border border-transparent",
              accessMode === 'tropical'
                ? tropicalIcon
                : accessMode === 'colorblind'
                ? cbIcon
                : "bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-400"
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
