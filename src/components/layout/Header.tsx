import React from 'react';
import { Palmtree, Eye, Moon, Sun, Waves } from 'lucide-react';
import { Theme, AccessMode } from '../../types';
import { cn } from '../../utils/cn';

interface HeaderProps {
  theme: Theme;
  toggleTheme: () => void;
  accessMode: AccessMode;
  setAccessMode: (mode: AccessMode) => void;
}

export function Header({ theme, toggleTheme, accessMode, setAccessMode }: HeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-20">
      <div className="flex items-center gap-4 group">
        <div className={cn(
          "w-14 h-14 rounded-[2rem] flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:rotate-12",
          accessMode === 'tropical' 
            ? "bg-orange-500 dark:bg-orange-600 shadow-orange-500/30" 
            : accessMode === 'colorblind'
            ? "bg-blue-700 dark:bg-blue-600 shadow-blue-900/40"
            : "bg-cyan-500 dark:bg-cyan-600 shadow-cyan-500/20"
        )}>
          {accessMode === 'tropical' ? (
            <Palmtree className="text-white" size={32} />
          ) : (
            <Waves className="text-white" size={32} />
          )}
        </div>
        <div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter leading-none mb-1">
            FinSurf<span className={
              accessMode === 'tropical' 
                ? "text-orange-500" 
                : accessMode === 'colorblind' 
                ? "text-blue-700 dark:text-blue-400" 
                : "text-cyan-500"
            }>.ai</span>
          </h1>
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-[0.3em] opacity-70 group-hover:tracking-[0.4em] transition-all",
            accessMode === 'tropical' ? "text-orange-600 dark:text-orange-400" : accessMode === 'colorblind' ? "text-blue-700 dark:text-blue-400 font-black" : "text-cyan-600 dark:text-cyan-400"
          )}>
            {accessMode === 'colorblind' ? "Accessibility Enhanced View" : "Ride the market waves"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-900/50 p-2 rounded-3xl border border-white dark:border-slate-800 backdrop-blur-md shadow-sm">
        <button
          onClick={() => setAccessMode('default')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-wide ${accessMode === 'default' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
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
