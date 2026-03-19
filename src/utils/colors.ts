export type AgentColor = 'cyan' | 'emerald' | 'amber' | 'violet';

export const agentColors = {
  badge: {
    cyan:    'bg-lime-50 text-lime-700 border-lime-100 dark:bg-lime-900/20 dark:text-lime-400 dark:border-lime-900',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900',
    amber:   'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900',
    violet:  'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900',
  },
  accent: {
    cyan:    'bg-lime-500',
    emerald: 'bg-emerald-600',
    amber:   'bg-amber-500',
    violet:  'bg-violet-600',
  },
  cardBorder: {
    cyan:    'border-lime-50 dark:border-lime-900/50',
    emerald: 'border-emerald-50 dark:border-emerald-900/50',
    amber:   'border-amber-50 dark:border-amber-900/50',
    violet:  'border-violet-50 dark:border-violet-900/50',
  },
  headerBorder: {
    cyan:    'border-lime-50 dark:border-lime-900/30',
    emerald: 'border-emerald-50 dark:border-emerald-900/30',
    amber:   'border-amber-50 dark:border-amber-900/30',
    violet:  'border-violet-50 dark:border-violet-900/30',
  },
  spinner: {
    cyan:    'text-lime-400',
    emerald: 'text-emerald-400',
    amber:   'text-amber-400',
    violet:  'text-violet-400',
  },
  emptyState: {
    cyan:    'text-lime-200 dark:text-lime-900',
    emerald: 'text-emerald-200 dark:text-emerald-900',
    amber:   'text-amber-200 dark:text-amber-900',
    violet:  'text-violet-200 dark:text-violet-900',
  },
  emptyBg: {
    cyan:    'bg-lime-50/50 dark:bg-lime-900/10',
    emerald: 'bg-emerald-50/50 dark:bg-emerald-900/10',
    amber:   'bg-amber-50/50 dark:bg-amber-900/10',
    violet:  'bg-violet-50/50 dark:bg-violet-900/10',
  },
  skeleton: {
    cyan:    'bg-lime-100 dark:bg-lime-900/30',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30',
    amber:   'bg-amber-100 dark:bg-amber-900/30',
    violet:  'bg-violet-100 dark:bg-violet-900/30',
  },
  sourcesBadge: {
    cyan:    'bg-lime-50 dark:bg-lime-900/20 text-lime-600 dark:text-lime-500 border-lime-100 dark:border-lime-900/40',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-500 border-emerald-100 dark:border-emerald-900/40',
    amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 border-amber-100 dark:border-amber-900/40',
    violet:  'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-500 border-violet-100 dark:border-violet-900/40',
  },
  sources: {
    cyan:    { header: 'text-lime-500 dark:text-lime-700',    border: 'border-lime-50 dark:border-lime-900/30',    link: 'bg-lime-50/50 dark:bg-slate-800 border-lime-100 dark:border-lime-900 text-lime-700 dark:text-lime-400'       },
    emerald: { header: 'text-emerald-500 dark:text-emerald-700', border: 'border-emerald-50 dark:border-emerald-900/30', link: 'bg-emerald-50/50 dark:bg-slate-800 border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400' },
    amber:   { header: 'text-amber-400 dark:text-amber-800',  border: 'border-amber-50 dark:border-amber-900/30',  link: 'bg-amber-50/50 dark:bg-slate-800 border-amber-100 dark:border-amber-900 text-amber-700 dark:text-amber-400'     },
    violet:  { header: 'text-violet-500 dark:text-violet-700', border: 'border-violet-50 dark:border-violet-900/30', link: 'bg-violet-50/50 dark:bg-slate-800 border-violet-100 dark:border-violet-900 text-violet-700 dark:text-violet-400'   },
  },
} as const;

/** Status-state colors for AgentProgressStrip badges (loading / done / inactive). */
export const statusColors = {
  loading:  'bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-400 border-lime-100 dark:border-lime-900/50',
  done:     'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/50',
  inactive: 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700/50',
} as const;

export const statusIconColors = {
  loading: 'animate-spin text-lime-600 dark:text-lime-400',
  done:    'text-amber-600 dark:text-amber-400',
} as const;
