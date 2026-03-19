import React, { useState } from 'react';
import { Search, Calendar, Hash, ArrowRight, Download, Check, Zap, BookOpen, ShieldAlert, Mail } from 'lucide-react';
import { cn } from '../../utils/cn';
import { downloadPDF } from '../../utils/pdfGenerator';

const EXAMPLE_TICKERS = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'GOOG'];

interface SearchFormProps {
  ticker: string;
  setTicker: (val: string) => void;
  purchaseDate: string;
  setPurchaseDate: (val: string) => void;
  sellDate: string;
  setSellDate: (val: string) => void;
  shares: string;
  setShares: (val: string) => void;
  onSearch: () => void;
  isLoading: boolean;
  hasSurfed?: boolean;
  isCompact?: boolean;
  isDataAvailable?: boolean;
  onTickerSelect?: (ticker: string) => void;
  onAboutClick?: () => void;
}

export function SearchForm({
  ticker,
  setTicker,
  purchaseDate,
  setPurchaseDate,
  sellDate,
  setSellDate,
  shares,
  setShares,
  onSearch,
  isLoading,
  hasSurfed,
  isCompact,
  isDataAvailable,
  onTickerSelect,
  onAboutClick,
}: SearchFormProps) {
  const [emailCopied, setEmailCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('sachin.nediyanchath@gmail.com').then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) onSearch();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-20 transition-all duration-700 mb-12">

      {/* Benefit badges */}
      <div className="lg:col-span-12 flex flex-wrap items-center gap-2">
        {/* Benefit pills */}
        {[
          { icon: <Check size={11} />,    text: 'Free · 3 analyses per day'     },
          { icon: <Zap size={11} />,      text: '5 AI agents · One search'      },
          { icon: <BookOpen size={11} />, text: 'Plain English · No jargon'     },
        ].map(({ icon, text }) => (
          <div
            key={text}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800/60"
          >
            {icon}
            {text}
          </div>
        ))}

        {/* Email CTA pill */}
        <button
          onClick={handleCopyEmail}
          title="Click to copy email address"
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors",
            emailCopied
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
              : "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-100 dark:border-violet-800/60 hover:bg-violet-100 dark:hover:bg-violet-900/40"
          )}
        >
          {emailCopied ? <Check size={11} /> : <Mail size={11} />}
          {emailCopied ? 'Email copied!' : 'Want your own tool? Email me'}
        </button>

        {/* Disclaimer pill — links to About */}
        <button
          onClick={onAboutClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700/60 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
        >
          <ShieldAlert size={11} />
          Tool only · Not financial advice
        </button>
      </div>

        <div className={cn(
            "lg:col-span-12 flex flex-wrap items-center gap-2 transition-opacity duration-300",
            isCompact ? "opacity-0 pointer-events-none" : "opacity-100"
)}>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Try an example:</span>
          {EXAMPLE_TICKERS.map(t => (
            <button
              key={t}
              onClick={() => { setTicker(t); onTickerSelect?.(t); }}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide transition-all border",
                ticker === t
                  ? "bg-amber-500 text-slate-900 border-amber-500"
                  : "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      <div className={cn(
        "lg:col-span-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 shadow-sm border transition-all duration-500",
        "bg-white dark:bg-slate-900",
        isCompact ? "rounded-none" : "rounded-2xl",
        "shadow-amber-900/5 border-amber-50 dark:border-amber-900/50"
      )}>
        <div className="space-y-2 group">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 transition-colors px-1 group-focus-within:text-amber-600 dark:group-focus-within:text-amber-400">
            <Search size={12} /> Stock Ticker
          </label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="e.g. AAPL"
            maxLength={10}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500"
          />
          <p className="text-xs text-slate-400 px-1 font-medium">The stock symbol (e.g. AAPL = Apple)</p>
        </div>

        <div className="space-y-2 group">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 transition-colors px-1 group-focus-within:text-amber-600 dark:group-focus-within:text-amber-400">
            <Calendar size={12} /> Purchase Date
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold transition-all outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500"
          />
          <p className="text-xs text-slate-400 px-1 font-medium">When did you buy it (or plan to)?</p>
        </div>

        <div className="space-y-2 group">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 transition-colors px-1 group-focus-within:text-amber-600 dark:group-focus-within:text-amber-400">
            <Calendar size={12} /> Sell / Analysis Date
          </label>
          <input
            type="date"
            value={sellDate}
            onChange={(e) => setSellDate(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold transition-all outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500"
          />
          <p className="text-xs text-slate-400 px-1 font-medium">Planning to sell soon? Over 1 year = lower tax rate</p>
        </div>

        <div className="space-y-2 group">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 transition-colors px-1 group-focus-within:text-amber-600 dark:group-focus-within:text-amber-400">
            <Hash size={12} /> Shares Owned
          </label>
          <input
            type="number"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 10"
            min="0.00000001"
            step="any"
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500"
          />
          <p className="text-xs text-slate-400 px-1 font-medium">Fractional shares supported</p>
        </div>
      </div>

      <div className="lg:col-span-2 flex flex-col gap-3">
        <button
          onClick={onSearch}
          disabled={isLoading}
          title="Press Enter to search"
          className={cn(
            "group relative overflow-hidden text-white px-8 py-6 font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 flex-1",
            isCompact ? "rounded-none" : "rounded-2xl",
            hasSurfed
              ? "bg-emerald-500 dark:bg-emerald-600 shadow-emerald-500/20"
              : "bg-slate-900 dark:bg-amber-600 shadow-amber-900/10",
            isLoading ? "cursor-wait" : "cursor-pointer"
          )}
        >
          <span className="relative z-10">{isLoading ? 'Riding...' : 'Surf'}</span>
          {!isLoading && <ArrowRight className="relative z-10 group-hover:translate-x-2 transition-transform" size={20} />}
          <div className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
            hasSurfed
              ? "bg-gradient-to-r from-emerald-600 to-teal-600"
              : "bg-gradient-to-r from-amber-600 to-amber-700"
          )} />
        </button>

        <button
          onClick={() => downloadPDF(ticker)}
          disabled={!isDataAvailable}
          title="Download report as PDF"
          className={cn(
            "group flex items-center justify-center gap-2 px-8 py-4 font-black uppercase tracking-widest text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed border-2",
            isCompact ? "rounded-none" : "rounded-2xl",
            "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          )}
        >
          <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />
          <span>Download PDF</span>
        </button>
      </div>
    </div>
  );
}
