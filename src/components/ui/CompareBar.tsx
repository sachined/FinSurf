import { useState, useRef, useEffect } from 'react';
import { GitCompareArrows, X, ArrowRight, Info, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';

interface CompareBarProps {
  isComparing: boolean;
  compareTicker: string;
  isLoading: boolean;
  onCompare: (ticker: string) => void;
  onClear: () => void;
}

const COMPARE_HINTS = [
      'Runs a lite analysis — research, sentiment & summary only.',
      'No tax or dividend calculation (no dates or shares needed).',
      'Comparison is complimentary — it does not count as a separate use.',
      'Starting a new primary search clears the comparison.',
];

export function CompareBar({ isComparing, compareTicker, isLoading, onCompare, onClear }: CompareBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [showHints, setShowHints] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  const handleCompare = () => {
    const t = input.trim().toUpperCase();
    if (!t) return;
    onCompare(t);
    setExpanded(false);
    setInput('');
  };

  const handleClear = () => {
    onClear();
    setExpanded(false);
    setInput('');
  };

  if (isComparing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
      >
        <GitCompareArrows size={14} className="text-amber-500 shrink-0" />
        <span>
          Comparing with{' '}
          <span className="font-bold text-slate-700 dark:text-slate-200">{compareTicker}</span>
          {isLoading && <span className="ml-1 animate-pulse">· analysing…</span>}
        </span>
        <button
          onClick={handleClear}
          className="ml-1 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Remove comparison"
        >
          <X size={12} />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
      <AnimatePresence mode="wait">
        {!expanded ? (
          <motion.button
            key="toggle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpanded(true)}
            aria-expanded={expanded}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border transition-all",
              "text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
              "hover:border-amber-400 hover:text-amber-600 dark:hover:border-amber-500 dark:hover:text-amber-400",
              "hover:bg-amber-50 dark:hover:bg-amber-500/10"
            )}
          >
            <GitCompareArrows size={14} />
            Compare vs another ticker
          </motion.button>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase().slice(0, 10))}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCompare();
                if (e.key === 'Escape') { setExpanded(false); setInput(''); }
              }}
              placeholder="e.g. MSFT"
              className={cn(
                "w-28 px-3 py-1.5 text-sm font-mono rounded-xl border outline-none transition-all",
                "bg-white dark:bg-slate-800/80",
                "border-amber-400 dark:border-amber-500",
                "text-slate-800 dark:text-slate-100 placeholder-slate-400",
                "focus:ring-2 focus:ring-amber-400/30"
              )}
            />
            <button
              onClick={handleCompare}
              disabled={!input.trim()}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-xl transition-all",
                "bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              Compare <ArrowRight size={13} />
            </button>
            <button
              onClick={() => { setExpanded(false); setInput(''); }}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!expanded && (
        <button
          onClick={() => setShowHints(h => !h)}
          aria-expanded={showHints}
          className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
        >
          <Info size={11} />
          How does this work?
          <ChevronDown size={11} className={cn("transition-transform", showHints && "rotate-180")} />
        </button>
      )}
      </div>

      <AnimatePresence>
        {showHints && !expanded && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden ml-1 space-y-0.5"
          >
            {COMPARE_HINTS.map((hint, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <span className="text-amber-400 mt-px">·</span>
                {hint}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
