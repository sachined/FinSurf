import React from 'react';
import { Download, Info, RotateCcw, HelpCircle, Layers, Grid3X3 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { type AccessMode, type PDFMode } from '../../types';

interface FooterProps {
  onDownloadPDF: () => void;
  isGeneratingPdf: boolean;
  accessMode?: AccessMode;
  pdfMode: PDFMode;
  setPdfMode: (mode: PDFMode) => void;
}

export function Footer({ onDownloadPDF, isGeneratingPdf, accessMode, pdfMode, setPdfMode }: FooterProps) {
  return (
    <footer className="relative z-20 space-y-8">
      <div className={cn(
        "flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-[3rem] shadow-2xl text-white transition-all duration-500",
        accessMode === 'tropical' 
          ? "bg-gradient-to-r from-orange-600 to-pink-600 dark:from-orange-800 dark:to-pink-900" 
          : accessMode === 'colorblind'
          ? "bg-blue-900 dark:bg-blue-950 border-4 border-blue-600 dark:border-blue-400 shadow-blue-900/40"
          : "bg-slate-900 dark:bg-slate-800"
      )}>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex w-16 h-16 bg-white/10 rounded-[1.5rem] items-center justify-center">
            <Download size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight">Export Report</h3>
            <p className="text-slate-400 text-sm font-medium">Download your financial surf report in PDF format</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* PDF Mode Toggle */}
          <div className={cn(
            "flex p-1 rounded-2xl border transition-all",
            accessMode === 'tropical' 
              ? "bg-orange-900/20 border-orange-400/20" 
              : accessMode === 'colorblind'
              ? "bg-blue-950 border-blue-600"
              : "bg-slate-800/50 border-white/10"
          )}>
            <button
              onClick={() => setPdfMode('standard')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                pdfMode === 'standard' 
                  ? (accessMode === 'tropical' ? "bg-yellow-400 text-orange-900 shadow-lg" : accessMode === 'colorblind' ? "bg-white text-blue-900 shadow-lg" : "bg-cyan-500 text-white shadow-lg")
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Layers size={14} />
              Standard
            </button>
            <button
              onClick={() => setPdfMode('hd')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                pdfMode === 'hd' 
                  ? (accessMode === 'tropical' ? "bg-yellow-400 text-orange-900 shadow-lg" : accessMode === 'colorblind' ? "bg-white text-blue-900 shadow-lg" : "bg-cyan-500 text-white shadow-lg")
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Grid3X3 size={14} />
              HD View
            </button>
          </div>

          <button
            onClick={() => onDownloadPDF()}
            disabled={isGeneratingPdf}
            className={cn(
              "w-full sm:w-auto disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3",
              accessMode === 'tropical' 
                ? "bg-yellow-400 hover:bg-yellow-300 text-orange-900 shadow-lg shadow-yellow-500/20" 
                : accessMode === 'colorblind'
                ? "bg-white text-blue-900 hover:bg-slate-100 shadow-lg shadow-blue-900/30 font-black"
                : "bg-cyan-500 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
            )}
          >
            {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-12">
        <div className={cn(
          "backdrop-blur-md p-6 rounded-[2rem] border flex items-center gap-4 group transition-all duration-500",
          accessMode === 'tropical' 
            ? "bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30" 
            : accessMode === 'colorblind'
            ? "bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-400"
            : "bg-white/50 dark:bg-slate-900/50 border-white dark:border-slate-800"
        )}>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform",
            accessMode === 'tropical' 
              ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" 
              : accessMode === 'colorblind'
              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-600 dark:border-blue-400"
              : "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
          )}>
            <RotateCcw size={20} />
          </div>
          <div className="text-xs">
            <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Real-time Data</p>
            <p className="text-slate-500 font-medium">Synced with market waves</p>
          </div>
        </div>
        <div className={cn(
          "backdrop-blur-md p-6 rounded-[2rem] border flex items-center gap-4 group transition-all duration-500",
          accessMode === 'tropical' 
            ? "bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/30" 
            : accessMode === 'colorblind'
            ? "bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
            : "bg-white/50 dark:bg-slate-900/50 border-white dark:border-slate-800"
        )}>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform",
            accessMode === 'tropical' 
              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400" 
              : accessMode === 'colorblind'
              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-900 dark:border-white"
              : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          )}>
            <HelpCircle size={20} />
          </div>
          <div className="text-xs">
            <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">AI Insights</p>
            <p className="text-slate-500 font-medium">Powered by specialized agents</p>
          </div>
        </div>
        <div className={cn(
          "backdrop-blur-md p-6 rounded-[2rem] border flex items-center gap-4 group transition-all duration-500",
          accessMode === 'tropical' 
            ? "bg-pink-50/50 dark:bg-pink-900/10 border-pink-100 dark:border-pink-900/30" 
            : accessMode === 'colorblind'
            ? "bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-800 dark:border-blue-400"
            : "bg-white/50 dark:bg-slate-900/50 border-white dark:border-slate-800"
        )}>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform",
            accessMode === 'tropical' 
              ? "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400" 
              : accessMode === 'colorblind'
              ? "bg-blue-200 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200 border border-blue-800"
              : "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
          )}>
            <Info size={20} />
          </div>
          <div className="text-xs">
            <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Tax Ready</p>
            <p className="text-slate-500 font-medium">Automated holding analysis</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
