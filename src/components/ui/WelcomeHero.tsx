import React from 'react';
import { Search, Receipt, Coins, MessageSquare, Zap, Sparkles, RotateCcw, HelpCircle, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';

const TRUST_BADGES = [
  { icon: <RotateCcw size={16} />, title: 'Real-time Data', desc: 'Synced with live market feeds' },
  { icon: <HelpCircle size={16} />, title: 'AI-Powered', desc: '5 specialized financial agents' },
  { icon: <Info size={16} />, title: 'Tax Ready', desc: 'Short & long-term gain analysis' },
];

const AGENTS = [
  { icon: <Sparkles size={18} />, title: 'Executive Summary',   desc: 'A plain-English brief combining all findings — great starting point for any investor.' },
  { icon: <Search size={18} />,   title: 'Research Analyst',    desc: 'Is the company healthy? Earnings growth, valuation, and who the big investors are.' },
  { icon: <Receipt size={18} />,  title: 'Tax Strategist',      desc: 'Know your tax bill before you sell — short-term vs. long-term rates, explained simply.' },
  { icon: <Coins size={18} />,    title: 'Dividend Specialist',  desc: 'How much cash will this stock pay you? Income projections on your exact share count.' },
  { icon: <MessageSquare size={18} />, title: 'Sentiment Analyst', desc: "What is everyone saying? Reddit, X, StockTwits & news — the crowd's mood right now." },
];

export function WelcomeHero() {
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
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50">
          <Zap size={12} /> 5 AI agents · No finance degree needed · Free to use
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tighter leading-tight mb-3">
          Your personal team of{' '}
          <span className="text-amber-500 dark:text-amber-400">AI financial analysts</span>
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
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-white/60 dark:bg-slate-900/60"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
              {icon}
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-tight text-slate-800 dark:text-white">{title}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">{desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {AGENTS.map(({ icon, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
            className="flex items-start gap-3 p-4 rounded-2xl border transition-all border-amber-100 dark:border-amber-900/40 bg-white/60 dark:bg-slate-900/60"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border border-transparent bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
              {icon}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-tight mb-0.5 text-slate-800 dark:text-white">{title}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
