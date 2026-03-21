import { Moon, Sun, Waves, UserCircle2, Zap } from 'lucide-react';
import { Theme } from '../../types';

interface HeaderProps {
  theme: Theme;
  toggleTheme: () => void;
  onAboutClick: () => void;
  onUpgradeClick: () => void;
}

export function Header({ theme, toggleTheme, onAboutClick, onUpgradeClick }: HeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-lime-500 dark:from-amber-400 dark:to-lime-400">
          <Waves className="text-white" size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter leading-none mb-0.5">
            FinSurf<span className="text-amber-500 dark:text-amber-400">.ai</span>
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60 text-lime-700 dark:text-lime-400">
            Ride the market waves
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
        <button
          onClick={onUpgradeClick}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold uppercase tracking-wide transition-all bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/30 hover:shadow-amber-500/50"
          title="Join the waitlist for premium features"
        >
          <Zap size={16} />
          <span className="hidden sm:inline">Upgrade</span>
        </button>
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
        <button
          onClick={onAboutClick}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-semibold uppercase tracking-wide"
          title="About / Bio"
        >
          <UserCircle2 size={16} />
          <span className="hidden sm:inline">About</span>
        </button>
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-semibold uppercase tracking-wide min-w-[44px] min-h-[44px] justify-center"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          <span className="hidden sm:inline">{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </header>
  );
}
