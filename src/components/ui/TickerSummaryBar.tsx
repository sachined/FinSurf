import React from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign, Landmark } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';
import { AccessMode, PnLSummary } from '../../types';

interface TickerSummaryBarProps {
  ticker: string;
  currentPrice: number | null;
  pnlSummary: PnLSummary | null;
  shares: number;
  purchaseDate: string;
  sellDate: string;
  accessMode: AccessMode;
}

function fmt(value: number | null, prefix = '$'): string {
  if (value === null || value === undefined) return 'N/A';
  return `${prefix}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function TickerSummaryBar({
  ticker,
  currentPrice,
  pnlSummary,
  shares,
  purchaseDate,
  sellDate,
  accessMode,
}: TickerSummaryBarProps) {
  const hasDates = purchaseDate && sellDate;

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
    accessMode === 'colorblind'
      ? isNeutral ? 'text-blue-600 dark:text-blue-400' : isPositive ? 'text-blue-700 dark:text-blue-300' : 'text-yellow-600 dark:text-yellow-400'
      : isNeutral ? 'text-cyan-600 dark:text-cyan-400' : isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';

  const PnLIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  const pnlLabel = pnl !== null
    ? `Realized P&L (${shares} share${shares !== 1 ? 's' : ''})`
    : unrealized !== null
    ? `Unrealized P&L (${shares} share${shares !== 1 ? 's' : ''})`
    : `P&L (${shares} share${shares !== 1 ? 's' : ''})`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'rounded-2xl border px-6 py-4 mb-6 flex flex-wrap gap-6 items-center justify-between',
        'bg-white dark:bg-slate-900',
        accessMode === 'tropical'
          ? 'border-orange-200 dark:border-orange-900'
          : accessMode === 'colorblind'
          ? 'border-blue-200 dark:border-blue-900'
          : 'border-slate-200 dark:border-slate-700',
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
        value={fmt(currentPrice)}
        icon={<DollarSign size={15} />}
        valueClass="text-slate-800 dark:text-white"
      />

      {/* Buy price — only shown when dates provided */}
      {hasDates && (
        <Stat
          label={`Buy Price${purchaseDate ? ` (${purchaseDate})` : ''}`}
          value={fmt(buyPrice)}
          valueClass="text-slate-700 dark:text-slate-300"
          note={buyPrice === null ? 'Date outside available history' : undefined}
        />
      )}

      {/* Sell price — only shown when dates provided */}
      {hasDates && (
        <Stat
          label={`Sell Price${sellDate ? ` (${sellDate})` : ''}`}
          value={fmt(sellPrice)}
          valueClass="text-slate-700 dark:text-slate-300"
          note={sellPrice === null ? 'Date outside available history' : undefined}
        />
      )}

      {/* Realized / Unrealized P&L — shown when shares provided */}
      {shares > 0 && (
        <Stat
          label={pnlLabel}
          value={activePnl !== null ? fmt(activePnl) : 'N/A'}
          valueClass={accentColor}
          icon={<PnLIcon size={15} />}
          subValue={fmtPct(activePnlPct)}
        />
      )}

      {/* Total dividends — shown when dividend_node has enriched pnl_summary */}
      {totalDividends !== null && (
        <Stat
          label="Est. Total Dividends"
          value={fmt(totalDividends)}
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
