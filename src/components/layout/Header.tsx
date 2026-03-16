import React from 'react';
import { Palmtree, Eye, Moon, Sun, Waves, UserCircle2, Zap } from 'lucide-react';
import { Theme, AccessMode } from '../../types';
import { cn } from '../../utils/cn';

interface HeaderProps {
  theme: Theme;
  toggleTheme: () => void;
  accessMode: AccessMode;
  setAccessMode: (mode: AccessMode) => void;
  onAboutClick: () => void;
  onUpgradeClick: () => void;
}

export function Header({ theme, toggleTheme, accessMode, setAccessMode, onAboutClick, onUpgradeClick }: HeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-20">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center",
          accessMode === 'tropical'
            ? "bg-gradient-to-br from-teal-400 to-rose-500"
            : accessMode === 'colorblind'
            ? "bg-blue-700 dark:bg-blue-600"
            : "bg-lime-500 dark:bg-lime-600"
        )}>
          {accessMode === 'tropical' ? (
            <Palmtree className="text-white" size={22} />
          ) : (
            <Waves className="text-white" size={22} />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter leading-none mb-0.5">
            FinSurf<span className={
              accessMode === 'tropical'
                ? "text-orange-500"
                : accessMode === 'colorblind'
                ? "text-blue-700 dark:text-blue-400"
                : "text-lime-500"
            }>.ai</span>
          </h1>
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-[0.25em] opacity-60",
            accessMode === 'tropical' ? "text-orange-600 dark:text-orange-400" : accessMode === 'colorblind' ? "text-blue-700 dark:text-blue-400 font-black" : "text-lime-700 dark:text-lime-400"
          )}>
            {accessMode === 'colorblind' ? "Accessibility Enhanced View" : "Ride the market waves"}
          </p>
        </div>
      </div>

      <div className={cn(
        "flex items-center gap-1.5 p-1.5 rounded-xl border",
        accessMode === 'tropical'
          ? "border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-950/20"
          : "border-slate-200 dark:border-slate-800"
      )}>
        <button
          onClick={() => setAccessMode('default')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-wide ${accessMode === 'default' ? 'bg-lime-500 text-slate-900 shadow-lg shadow-lime-500/30' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Default Mode"
        >
          <Waves size={16} />
          <span className="hidden sm:inline">Default</span>
        </button>
        <button
          onClick={() => setAccessMode('colorblind')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-wide ${accessMode === 'colorblind' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="High Contrast Mode"
        >
          <Eye size={16} />
          <span className="hidden sm:inline">Accessible</span>
        </button>
        <button
          onClick={() => setAccessMode('tropical')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-wide ${accessMode === 'tropical' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Tropical Mode"
        >
          <Palmtree size={16} />
          <span className="hidden sm:inline">Tropical</span>
        </button>
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
        <button
          disabled
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wide cursor-not-allowed opacity-50",
            accessMode === 'tropical'
              ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30"
              : accessMode === 'colorblind'
              ? "bg-blue-700 text-white shadow-sm shadow-blue-700/30"
              : "bg-cyan-500 text-white shadow-sm shadow-cyan-500/30"
          )}
          title="Coming soon"
        >
          <Zap size={16} />
          <span className="hidden sm:inline">Upgrade</span>
        </button>
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
        <button
          onClick={onAboutClick}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-[10px] font-black uppercase tracking-wide"
          title="About / Bio"
        >
          <UserCircle2 size={16} />
          <span className="hidden sm:inline">About</span>
        </button>
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-[10px] font-black uppercase tracking-wide"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          <span className="hidden sm:inline">{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </header>
  );
}
