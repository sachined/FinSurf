import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TimestampBadgeProps {
  timestamp: number; // Unix timestamp in milliseconds
  className?: string;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHr = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;

  // For older data, show the actual timestamp
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function TimestampBadge({ timestamp, className }: TimestampBadgeProps) {
  const [relativeTime, setRelativeTime] = useState(() => formatRelativeTime(timestamp));

  // Update relative time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(timestamp));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [timestamp]);

  // Determine if data is stale (> 1 hour old)
  const isStale = Date.now() - timestamp > 60 * 60 * 1000;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border',
        isStale
          ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400'
          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
        className
      )}
      title={`Data fetched at ${new Date(timestamp).toLocaleString()}`}
    >
      <Clock size={12} className={isStale ? 'animate-pulse' : ''} />
      <span>{relativeTime}</span>
      {isStale && <span className="text-[10px] opacity-70">⚠️ Stale</span>}
    </div>
  );
}
