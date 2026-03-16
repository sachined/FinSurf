import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { type PricePoint, type AccessMode } from '../../types';

interface PriceChartProps {
  data: PricePoint[];
  accessMode: AccessMode;
}

interface TooltipPayloadEntry {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-cyan-100 dark:border-cyan-900 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-slate-500 dark:text-slate-400">{label}</p>
      <p className="font-bold text-slate-800 dark:text-white">
        ${payload[0].value.toFixed(2)}
      </p>
    </div>
  );
}

export function PriceChart({ data, accessMode }: PriceChartProps) {
  const [period, setPeriod] = useState<'1y' | '2y'>('2y');

  if (!data || data.length === 0) return null;

  // Filter data to the selected period
  const filtered = useMemo(() => {
    if (period === '2y') return data;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    return data.filter(p => new Date(p.date) >= cutoff);
  }, [data, period]);

  // Thin the series to ~24 monthly points for a clean per-month x-axis
  const thinned = useMemo(() => {
    if (filtered.length <= 24) return filtered;
    const step = Math.floor(filtered.length / 24);
    return filtered.filter((_, i) => i % step === 0 || i === filtered.length - 1);
  }, [filtered]);

  const strokeColor =
    accessMode === 'colorblind' ? '#1d4ed8'
    : accessMode === 'tropical' ? '#0d9488'
    : '#0891b2';

  const fillId = 'priceAreaGradient';

  const formatTick = (val: string) => {
    try {
      const d = new Date(val);
      return d.toLocaleDateString('en-US', { month: 'short' });
    } catch {
      return val;
    }
  };

  const btnBase = "px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors";
  const btnActive = "bg-cyan-600 text-white";
  const btnInactive = "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300";

  return (
    <div className="mt-4 -mx-6 not-prose">
      <div className="flex items-center justify-between px-6 mb-2">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Price History
        </p>
        <div className="flex gap-1">
          <button className={`${btnBase} ${period === '1y' ? btnActive : btnInactive}`} onClick={() => setPeriod('1y')}>1Y</button>
          <button className={`${btnBase} ${period === '2y' ? btnActive : btnInactive}`} onClick={() => setPeriod('2y')}>2Y</button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={thinned} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.18} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            tickFormatter={formatTick}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="close"
            stroke={strokeColor}
            strokeWidth={2}
            fill={`url(#${fillId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}