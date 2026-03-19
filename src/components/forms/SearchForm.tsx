import React, { useState, useEffect } from 'react';
import { Search, Calendar, Hash, ArrowRight, Download, Check, Zap, BookOpen, ShieldAlert, Mail, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';
import { downloadPDF } from '../../utils/pdfGenerator';
import { LS_KEYS } from '../../constants';

const EXAMPLE_TICKERS = ['AAPL', 'NVDA', 'GOOG', 'TSLA', 'AVGO', 'META', 'PLTR', 'AMD', 'RKLB', 'GME'];
const MAX_RECENT = 5;

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEYS.recentSearches);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentSearches(Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : []);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save search to recent searches
  const addToRecentSearches = (searchTicker: string) => {
    const upper = searchTicker.toUpperCase().trim();
    if (!upper) return;

    setRecentSearches(prev => {
      // Remove if already exists, then add to front
      const filtered = prev.filter(t => t !== upper);
      const updated = [upper, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(LS_KEYS.recentSearches, JSON.stringify(updated));
      return updated;
    });
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('sachin.nediyanchath@gmail.com').then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      addToRecentSearches(ticker);
      onSearch();
    }
  };

  const handleSearchClick = () => {
    addToRecentSearches(ticker);
    onSearch();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-20 transition-all duration-700 mb-12">

      {/* Benefit badges */}
      <div className="lg:col-span-12 flex flex-wrap items-center gap-2">
        {/* Benefit pills */}
        {[
          { icon: <Check size={11} />,    text: 'Free · 3 analyses per day', cls: 'bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300 border-lime-100 dark:border-lime-800/60'     },
          { icon: <Zap size={11} />,      text: '4 AI agents · One search',  cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800/60' },
          { icon: <BookOpen size={11} />, text: 'Plain English · No jargon', cls: 'bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300 border-lime-100 dark:border-lime-800/60'     },
        ].map(({ icon, text, cls }) => (
          <div
            key={text}
            className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border", cls)}
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
              : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
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

      {/* Recent searches */}
      {recentSearches.length > 0 && !isCompact && (
        <div className="lg:col-span-12 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
            <Clock size={11} /> Recent:
          </span>
          {recentSearches.map(t => (
            <button
              key={t}
              onClick={() => { setTicker(t); onTickerSelect?.(t); }}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide transition-all border",
                ticker === t
                  ? "bg-violet-500 text-white border-violet-500"
                  : "bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800 hover:dark:bg-violet-900/40"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

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
                  ? "bg-lime-500 text-white border-lime-500"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700 hover:dark:bg-slate-800"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      <div className={cn(
        "lg:col-span-10 p-6 shadow-sm border transition-all duration-500",
        "bg-white dark:bg-slate-900",
        isCompact ? "rounded-none" : "rounded-2xl",
        "shadow-amber-900/5 border-amber-50 dark:border-amber-900/50"
      )}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2 group sm:col-span-2">
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
        </div>

        {/* Advanced fields toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full mb-4 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
        >
          {showAdvanced ? '▼' : '►'} Optional: Add dates & shares for tax analysis
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        )}
      </div>

      <div className="lg:col-span-2 flex flex-col gap-3">
        <button
          onClick={handleSearchClick}
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

        {/* What happens next micro-copy */}
        {!hasSurfed && (
          <p className="text-xs text-center text-slate-400 dark:text-slate-500 font-medium leading-relaxed px-2">
            Analysis takes ~15-30 seconds · All 4 agents run in parallel
          </p>
        )}

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
