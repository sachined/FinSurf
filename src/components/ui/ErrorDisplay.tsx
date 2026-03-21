import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Clock, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { EXAMPLE_TICKERS } from '../../constants';

interface ErrorDisplayProps {
  error: string;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  // Parse error type
  const isRateLimit = error.toLowerCase().includes('rate limit') || error.toLowerCase().includes('too many');
  const isNotFound = error.toLowerCase().includes('not found') || error.toLowerCase().includes('invalid ticker');
  const isPartialFailure = error.toLowerCase().includes('partial') || error.toLowerCase().includes('some agents');

  // Calculate time until daily reset (assumes midnight UTC reset)
  useEffect(() => {
    if (!isRateLimit) return;

    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      const diffMs = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      setTimeUntilReset(`${hours}h ${minutes}m`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isRateLimit]);

  // Get appropriate styling based on error type
  const getErrorStyle = () => {
    if (isPartialFailure) {
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/10',
        border: 'border-amber-100 dark:border-amber-900/30',
        text: 'text-amber-700 dark:text-amber-400',
        icon: 'text-amber-500',
        dot: 'bg-amber-500',
      };
    }
    return {
      bg: 'bg-red-50 dark:bg-red-900/10',
      border: 'border-red-100 dark:border-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      icon: 'text-red-500',
      dot: 'bg-red-500',
    };
  };

  const style = getErrorStyle();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'pdf-alert mb-8 p-6 rounded-4xl border shadow-xl relative',
        style.bg,
        style.border,
        'shadow-slate-900/5'
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn('shrink-0 mt-0.5', style.icon)}>
          {isRateLimit ? (
            <Clock size={24} />
          ) : (
            <AlertCircle size={24} />
          )}
        </div>

        <div className="flex-1">
          <div className={cn('font-bold text-sm mb-2', style.text)}>
            {isRateLimit && '⏳ Rate Limit Reached'}
            {isNotFound && '🔍 Ticker Not Found'}
            {isPartialFailure && '⚠️ Partial Results'}
            {!isRateLimit && !isNotFound && !isPartialFailure && '❌ Error'}
          </div>

          <p className={cn('text-sm leading-relaxed', style.text)}>
            {error}
          </p>

          {isRateLimit && timeUntilReset && (
            <div className={cn('mt-3 pt-3 border-t text-xs font-medium', style.border, style.text)}>
              💡 Free searches reset in <span className="font-black">{timeUntilReset}</span>
              <br />
              Or upgrade for unlimited analyses
            </div>
          )}

          {isNotFound && (
            <div className={cn('mt-3 text-xs', style.text)}>
              💡 Try: <span className="font-mono font-bold">{EXAMPLE_TICKERS.join(', ')}</span>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className={cn('shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center', style.text)}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className={cn('absolute top-6 left-6 w-2 h-2 rounded-full animate-pulse', style.dot)} />
    </motion.div>
  );
}
