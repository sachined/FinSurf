import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign, Landmark, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';
import { fmtUsd, fmtPct } from '../../utils/formatting';
import { PnLSummary, PricePoint } from '../../types';

interface TickerSummaryBarProps {
  ticker: string;
  currentPrice: number | null;
  pnlSummary: PnLSummary | null;
  priceHistory: PricePoint[];
  shares: number;
  purchaseDate: string;
  sellDate: string;
}

export function TickerSummaryBar({
  ticker,
  currentPrice,
  pnlSummary,
  priceHistory,
  shares,
  purchaseDate,
  sellDate,
}: TickerSummaryBarProps) {
  const hasDates = purchaseDate && sellDate;
  const isQuickSearch = !hasDates && shares <= 0;

  // Read pre-computed values from the shared P&L summary (Tax Calculator tool output)
  const buyPrice       = pnlSummary?.buy_price       ?? null;
  const sellPrice      = pnlSummary?.sell_price      ?? null;
  const pnl            = pnlSummary?.realized_gain   ?? null;
  const pnlPct         = pnlSummary?.realized_gain_pct ?? null;
  const unrealized     = pnlSummary?.unrealized_gain ?? null;
  const unrealizedPct  = pnlSummary?.unrealized_gain_pct ?? null;
  const totalDividends = pnlSummary?.total_dividends ?? null;

  // Determine the active gain figure to display (realized preferred, then unrealized)
  const activePnl    = pnl    ?? unrealized;
  const activePnlPct = pnlPct ?? unrealizedPct;

  const isPositive = activePnl !== null && activePnl >= 0;
  const isNeutral  = activePnl === null;

  const accentColor =
    isNeutral ? 'text-amber-700 dark:text-amber-400' : isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';

  const PnLIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  const pnlLabel = pnl !== null
    ? `Realized P&L (${shares} share${shares !== 1 ? 's' : ''})`
    : unrealized !== null
    ? `Unrealized P&L (${shares} share${shares !== 1 ? 's' : ''})`
    : `P&L (${shares} share${shares !== 1 ? 's' : ''})`;

  // Quick-search metrics derived from priceHistory
  const weekRange = useMemo(() => {
    if (!isQuickSearch || priceHistory.length === 0) return null;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const yearData = priceHistory.filter(p => new Date(p.date) >= cutoff);
    if (yearData.length === 0) return null;
    const closes = yearData.map(p => p.close);
    return { low: Math.min(...closes), high: Math.max(...closes) };
  }, [isQuickSearch, priceHistory]);

  // TODO(human): Implement dailyChange derivation
  // Given: currentPrice (number | null) and priceHistory (PricePoint[])
  // priceHistory is sorted chronologically, last entry = most recent trading day close
  // Return: { change: number, pct: number } | null
  const dailyChange = useMemo<{ change: number; pct: number } | null>(() => {
    if (!isQuickSearch || currentPrice === null || priceHistory.length < 2) return null;
    const prevClose = priceHistory[priceHistory.length - 2].close;
    if (prevClose === 0) return null;

    const myChange = currentPrice - prevClose;
    const myPct = (myChange / prevClose) * 100

    return {change: myChange, pct: myPct};
  }, [isQuickSearch, currentPrice, priceHistory]);

  const dayColor = dailyChange === null
    ? 'text-slate-500'
    : dailyChange.change >= 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';

  const DayIcon = dailyChange === null ? Minus : dailyChange.change >= 0 ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'rounded-2xl border px-6 py-4 mb-6 flex flex-wrap gap-6 items-center justify-between',
        'bg-white dark:bg-slate-900',
        'border-amber-100 dark:border-amber-900/40',
      )}
    >
      {/* Ticker label */}
      <div className="flex items-center gap-2 min-w-[80px]">
        <span className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
          {ticker.toUpperCase()}
        </span>
      </div>

      {/* Current price */}
      <Stat
        label="Current Price"
        value={fmtUsd(currentPrice)}
        icon={<DollarSign size={15} />}
        valueClass="text-slate-800 dark:text-white"
      />

      {/* Quick-search metrics: 52-week range + daily change */}
      {isQuickSearch && weekRange && (
        <Stat
          label="52wk Range"
          value={`${fmtUsd(weekRange.low)} – ${fmtUsd(weekRange.high)}`}
          icon={<BarChart3 size={15} />}
          valueClass="text-slate-700 dark:text-slate-300"
        />
      )}

      {isQuickSearch && dailyChange !== null && (
        <Stat
          label="Today"
          value={fmtUsd(dailyChange.change, dailyChange.change >= 0 ? '+$' : '-$')}
          icon={<DayIcon size={15} />}
          valueClass={dayColor}
          subValue={fmtPct(dailyChange.pct)}
        />
      )}

      {/* Buy price — only shown when dates provided */}
      {hasDates && (
        <Stat
          label={`Buy Price${purchaseDate ? ` (${purchaseDate})` : ''}`}
          value={fmtUsd(buyPrice)}
          valueClass="text-slate-700 dark:text-slate-300"
          note={buyPrice === null ? 'Date outside available history' : undefined}
        />
      )}

      {/* Sell price — only shown when dates provided */}
      {hasDates && (
        <Stat
          label={`Sell Price${sellDate ? ` (${sellDate})` : ''}`}
          value={fmtUsd(sellPrice)}
          valueClass="text-slate-700 dark:text-slate-300"
          note={sellPrice === null ? 'Date outside available history' : undefined}
        />
      )}

      {/* Realized / Unrealized P&L — shown when shares provided */}
      {shares > 0 && (
        <Stat
          label={pnlLabel}
          value={activePnl !== null ? fmtUsd(activePnl) : 'N/A'}
          valueClass={accentColor}
          icon={<PnLIcon size={15} />}
          subValue={fmtPct(activePnlPct)}
        />
      )}

      {/* Total dividends — shown when dividend_node has enriched pnl_summary */}
      {totalDividends !== null && (
        <Stat
          label="Est. Total Dividends"
          value={fmtUsd(totalDividends)}
          icon={<Landmark size={15} />}
          valueClass="text-violet-600 dark:text-violet-400"
          note="Conservative projection"
        />
      )}
    </motion.div>
  );
}

interface StatProps {
  label: string;
  value: string;
  valueClass?: string;
  icon?: React.ReactNode;
  subValue?: string;
  note?: string;
}

function Stat({ label, value, valueClass, icon, subValue, note }: StatProps) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[110px]">
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <div className={cn('flex items-center gap-1 text-xl font-bold', valueClass)}>
        {icon}
        {value}
      </div>
      {subValue && subValue !== 'N/A' && (
        <span className={cn('text-sm font-semibold', valueClass)}>{subValue}</span>
      )}
      {note && (
        <span className="text-xs text-slate-400 dark:text-slate-500 italic">{note}</span>
      )}
    </div>
  );
}
