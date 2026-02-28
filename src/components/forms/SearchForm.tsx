import React from 'react';
import { Search, Calendar, Hash, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { type AccessMode } from '../../types';

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
  accessMode?: AccessMode;
  isCompact?: boolean;
  onTickerSelect?: (ticker: string) => void;
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
  accessMode,
  isCompact,
  onTickerSelect
}: SearchFormProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) onSearch();
  };

  return (
    <div className={cn(
      "grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-20 transition-all duration-700",
      isCompact ? "mb-0" : "mb-12"
    )}>
      {!isCompact && (
        <div className="lg:col-span-12 flex flex-wrap items-center gap-2">
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest",
            accessMode === 'tropical' ? "text-orange-500" : accessMode === 'colorblind' ? "text-blue-700 dark:text-blue-400" : "text-cyan-600 dark:text-cyan-400"
          )}>Try an example:</span>
          {EXAMPLE_TICKERS.map(t => (
            <button
              key={t}
              onClick={() => { setTicker(t); onTickerSelect?.(t); }}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide transition-all border",
                ticker === t
                  ? accessMode === 'tropical' ? "bg-orange-500 text-white border-orange-500" : accessMode === 'colorblind' ? "bg-blue-700 text-white border-blue-700" : "bg-cyan-500 text-white border-cyan-500"
                  : accessMode === 'tropical' ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800" : accessMode === 'colorblind' ? "bg-white text-blue-900 border-blue-600 hover:bg-blue-50 dark:bg-slate-900 dark:text-blue-200 dark:border-blue-400" : "bg-cyan-50 text-cyan-700 border-cyan-100 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <div className={cn(
        "lg:col-span-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-6 shadow-2xl backdrop-blur-sm border transition-all duration-500",
        isCompact ? "rounded-none" : "rounded-[2.5rem]",
        accessMode === 'tropical'
          ? "shadow-orange-900/5 border-orange-100 dark:border-orange-900/50"
          : accessMode === 'colorblind'
          ? "shadow-blue-900/10 border-blue-600 dark:border-blue-400 border-2"
          : "shadow-cyan-900/5 border-cyan-50 dark:border-cyan-900/50"
      )}>
        <div className="space-y-2 group">
          <label className={cn(
            "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors px-1",
            accessMode === 'tropical' ? "group-focus-within:text-orange-500" : accessMode === 'colorblind' ? "group-focus-within:text-blue-700 dark:group-focus-within:text-blue-400 font-black" : "group-focus-within:text-cyan-500"
          )}>
            <Search size={12} /> Stock Ticker
          </label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="e.g. AAPL"
            maxLength={10}
            className={cn(
              "w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all outline-none",
              accessMode === 'tropical' ? "focus:ring-4 focus:ring-orange-500/10" : accessMode === 'colorblind' ? "focus:ring-4 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400" : "focus:ring-4 focus:ring-cyan-500/10"
            )}
          />
          <p className="text-[10px] text-slate-400 px-1 font-medium">The stock symbol (e.g. AAPL = Apple)</p>
        </div>

        <div className="space-y-2 group">
          <label className={cn(
            "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors px-1",
            accessMode === 'tropical' ? "group-focus-within:text-orange-500" : accessMode === 'colorblind' ? "group-focus-within:text-blue-700 dark:group-focus-within:text-blue-400 font-black" : "group-focus-within:text-cyan-500"
          )}>
            <Calendar size={12} /> Purchase Date
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className={cn(
              "w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold transition-all outline-none",
              accessMode === 'tropical' ? "focus:ring-4 focus:ring-orange-500/10" : accessMode === 'colorblind' ? "focus:ring-4 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400" : "focus:ring-4 focus:ring-cyan-500/10"
            )}
          />
          <p className="text-[10px] text-slate-400 px-1 font-medium">When did you buy (or plan to buy)?</p>
        </div>

        <div className="space-y-2 group">
          <label className={cn(
            "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors px-1",
            accessMode === 'tropical' ? "group-focus-within:text-orange-500" : accessMode === 'colorblind' ? "group-focus-within:text-blue-700 dark:group-focus-within:text-blue-400 font-black" : "group-focus-within:text-cyan-500"
          )}>
            <Calendar size={12} /> Sell / Target Date
          </label>
          <input
            type="date"
            value={sellDate}
            onChange={(e) => setSellDate(e.target.value)}
            className={cn(
              "w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold transition-all outline-none",
              accessMode === 'tropical' ? "focus:ring-4 focus:ring-orange-500/10" : accessMode === 'colorblind' ? "focus:ring-4 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400" : "focus:ring-4 focus:ring-cyan-500/10"
            )}
          />
          <p className="text-[10px] text-slate-400 px-1 font-medium">Affects tax rate: &gt;1 yr = lower tax</p>
        </div>

        <div className="space-y-2 group">
          <label className={cn(
            "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors px-1",
            accessMode === 'tropical' ? "group-focus-within:text-orange-500" : accessMode === 'colorblind' ? "group-focus-within:text-blue-700 dark:group-focus-within:text-blue-400 font-black" : "group-focus-within:text-cyan-500"
          )}>
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
            className={cn(
              "w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all outline-none",
              accessMode === 'tropical' ? "focus:ring-4 focus:ring-orange-500/10" : accessMode === 'colorblind' ? "focus:ring-4 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400" : "focus:ring-4 focus:ring-cyan-500/10"
            )}
          />
          <p className="text-[10px] text-slate-400 px-1 font-medium">Fractional shares supported</p>
        </div>
      </div>

      <button
        onClick={onSearch}
        disabled={isLoading}
        title="Press Enter to search"
        className={cn(
          "lg:col-span-2 group relative overflow-hidden text-white px-8 py-6 font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3",
          isCompact ? "rounded-none" : "rounded-[2.5rem]",
          hasSurfed 
            ? "bg-emerald-500 dark:bg-emerald-600 shadow-emerald-500/20" 
            : accessMode === 'tropical'
            ? "bg-orange-500 dark:bg-orange-600 shadow-orange-500/30"
            : accessMode === 'colorblind'
            ? "bg-blue-700 dark:bg-blue-600 shadow-blue-900/30 border-b-4 border-blue-900 active:border-b-0 active:translate-y-1"
            : "bg-slate-900 dark:bg-cyan-600 shadow-cyan-900/10",
          isLoading ? "cursor-wait" : "cursor-pointer"
        )}
      >
        <span className="relative z-10">{isLoading ? 'Riding...' : 'Surf'}</span>
        {!isLoading && <ArrowRight className="relative z-10 group-hover:translate-x-2 transition-transform" size={20} />}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
          hasSurfed 
            ? "bg-gradient-to-r from-emerald-600 to-teal-600" 
            : accessMode === 'tropical'
            ? "bg-gradient-to-r from-orange-600 to-pink-600"
            : "bg-gradient-to-r from-cyan-600 to-blue-600"
        )} />
      </button>
    </div>
  );
}
