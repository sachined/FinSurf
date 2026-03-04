import React, { useMemo } from 'react';
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
  if (!data || data.length === 0) return null;

  // Thin the series to ~52 weekly points for performance while keeping shape
  const thinned = useMemo(() => {
    if (data.length <= 52) return data;
    const step = Math.floor(data.length / 52);
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  }, [data]);

  // Colour tokens per access mode
  const strokeColor =
    accessMode === 'colorblind' ? '#1d4ed8'
    : accessMode === 'tropical' ? '#0d9488'
    : '#0891b2';

  const fillId = 'priceAreaGradient';

  // Format x-axis tick: show month abbreviation for ~monthly samples
  const formatTick = (val: string) => {
    try {
      const d = new Date(val);
      return d.toLocaleDateString('en-US', { month: 'short' });
    } catch {
      return val;
    }
  };

  return (
    <div className="mt-4 -mx-6 not-prose">
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-6">
        1-Year Price History
      </p>
      <ResponsiveContainer width="105%" height={`100%`}>
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
