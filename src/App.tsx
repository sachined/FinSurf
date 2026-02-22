/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  TrendingUp, 
  Receipt, 
  Coins, 
  ArrowRight, 
  Loader2, 
  Calendar, 
  Hash,
  ExternalLink,
  Info,
  Circle,
  Sun,
  Moon,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  RotateCcw,
  HelpCircle,
  Download,
  Palmtree
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInDays, parseISO } from 'date-fns';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { researchAgent, taxAgent, dividendAgent, sentimentAgent, type AgentResponse, type DividendResponse } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Theme = 'light' | 'dark';
type AccessMode = 'default' | 'colorblind' | 'tropical';

export default function App() {
  const [ticker, setTicker] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sellDate, setSellDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [shares, setShares] = useState<string>('10');
  const [theme, setTheme] = useState<Theme>('light');
  const [accessMode, setAccessMode] = useState<AccessMode>('default');
  
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({
    research: false,
    tax: false,
    dividend: false,
    sentiment: false
  });

  const [responses, setResponses] = useState<{ 
    research: AgentResponse | null, 
    tax: AgentResponse | null, 
    dividend: DividendResponse | null,
    sentiment: AgentResponse | null
  }>({
    research: null,
    tax: null,
    dividend: null,
    sentiment: null
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const handleResearch = async () => {
    if (!ticker) return;
    setLoading(prev => ({ ...prev, research: true }));
    try {
      const res = await researchAgent(ticker);
      setResponses(prev => ({ ...prev, research: res }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(prev => ({ ...prev, research: false }));
    }
  };

  const handleTax = async () => {
    if (!ticker || !purchaseDate || !sellDate) return;
    setLoading(prev => ({ ...prev, tax: true }));
    try {
      const res = await taxAgent(ticker, purchaseDate, sellDate);
      setResponses(prev => ({ ...prev, tax: res }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(prev => ({ ...prev, tax: false }));
    }
  };

  const handleDividend = async () => {
    if (!ticker || !shares) return;
    const years = Math.max(1, Math.ceil(differenceInDays(parseISO(sellDate), parseISO(purchaseDate)) / 365));
    setLoading(prev => ({ ...prev, dividend: true }));
    try {
      const res = await dividendAgent(ticker, parseFloat(shares), years);
      setResponses(prev => ({ ...prev, dividend: res }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(prev => ({ ...prev, dividend: false }));
    }
  };

  const handleSentiment = async () => {
    if (!ticker) return;
    setLoading(prev => ({ ...prev, sentiment: true }));
    try {
      const res = await sentimentAgent(ticker);
      setResponses(prev => ({ ...prev, sentiment: res }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(prev => ({ ...prev, sentiment: false }));
    }
  };

  const runAll = async () => {
    handleResearch();
    handleTax();
    handleDividend();
    handleSentiment();
  };

  const handleClear = () => {
    setTicker('');
    setPurchaseDate(format(new Date(), 'yyyy-MM-dd'));
    setSellDate(format(new Date(), 'yyyy-MM-dd'));
    setShares('10');
    setResponses({
      research: null,
      tax: null,
      dividend: null,
      sentiment: null
    });
  };

  const downloadPDF = async () => {
    const element = document.getElementById('report-container');
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: theme === 'dark' ? '#0a1114' : '#fdfaf6',
        onclone: (clonedDoc) => {
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            // Force standard colors for common properties to avoid oklch parsing errors
            if (el.classList.contains('bg-white')) el.style.backgroundColor = '#ffffff';
            if (el.classList.contains('dark:bg-slate-900')) el.style.backgroundColor = '#0f172a';
            if (el.classList.contains('text-slate-900')) el.style.color = '#0f172a';
            if (el.classList.contains('dark:text-slate-100')) el.style.color = '#f1f5f9';
            
            // Remove any inline styles that might contain oklch
            const inlineStyle = el.getAttribute('style');
            if (inlineStyle && inlineStyle.includes('oklch')) {
              el.setAttribute('style', inlineStyle.replace(/oklch\([^)]+\)/g, '#888888'));
            }
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      
      // Open in a new window/dialog for printing or downloading
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('PDF Generation failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfaf6] dark:bg-[#0a1114] text-slate-900 dark:text-slate-100 font-sans selection:bg-cyan-100 dark:selection:bg-cyan-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-cyan-100 dark:border-cyan-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mascot mode={accessMode} className="w-12 h-12 mr-2" />
            <div className="w-10 h-10 bg-cyan-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-cyan-200 dark:shadow-cyan-900/20">
              <TrendingUp size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-cyan-900 dark:text-cyan-400">FINSURF</h1>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">Ride the Market Waves</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => {
                setAccessMode(prev => {
                  if (prev === 'default') return 'colorblind';
                  if (prev === 'colorblind') return 'tropical';
                  return 'default';
                });
              }}
              className={cn(
                "p-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider",
                accessMode === 'colorblind' ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" : 
                accessMode === 'tropical' ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" :
                "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              )}
              title="Toggle Theme Mode"
            >
              {accessMode === 'tropical' ? <Palmtree size={18} /> : <Eye size={18} />}
              <span className="hidden md:inline">
                {accessMode === 'colorblind' ? 'Accessible' : accessMode === 'tropical' ? 'Tropical' : 'Standard'}
              </span>
            </button>
            <button 
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all"
              title="Toggle Dark Mode"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Section */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-cyan-900/5 dark:shadow-black/20 border border-cyan-50 dark:border-cyan-900/50 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-widest">Stock Ticker</label>
                <span title="The unique series of letters assigned to a security for trading purposes (e.g., AAPL for Apple).">
                  <HelpCircle size={10} className="text-cyan-400 cursor-help" />
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300 dark:text-cyan-700" size={18} />
                <input 
                  type="text" 
                  placeholder="e.g. AAPL"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-2.5 bg-cyan-50/50 dark:bg-slate-800/50 border border-cyan-100 dark:border-cyan-900 rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none font-medium dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-widest">Purchase Date</label>
                <span title="The date you acquired the shares. Format: YYYY-MM-DD.">
                  <HelpCircle size={10} className="text-cyan-400 cursor-help" />
                </span>
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300 dark:text-cyan-700" size={18} />
                <input 
                  type="date" 
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-cyan-50/50 dark:bg-slate-800/50 border border-cyan-100 dark:border-cyan-900 rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none font-medium dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-widest">Sell Date</label>
                <span title="The date you sold or plan to sell the shares. Format: YYYY-MM-DD.">
                  <HelpCircle size={10} className="text-cyan-400 cursor-help" />
                </span>
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300 dark:text-cyan-700" size={18} />
                <input 
                  type="date" 
                  value={sellDate}
                  onChange={(e) => setSellDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-cyan-50/50 dark:bg-slate-800/50 border border-cyan-100 dark:border-cyan-900 rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none font-medium dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-widest">Shares</label>
                <span title="The number of shares owned. Can include fractional amounts (e.g., 10.5).">
                  <HelpCircle size={10} className="text-cyan-400 cursor-help" />
                </span>
              </div>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300 dark:text-cyan-700" size={18} />
                  <input 
                    type="number" 
                    step="any"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-cyan-50/50 dark:bg-slate-800/50 border border-cyan-100 dark:border-cyan-900 rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none font-medium dark:text-white"
                  />
                </div>
                <button 
                  onClick={runAll}
                  disabled={!ticker || Object.values(loading).some(v => v)}
                  className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white px-6 py-2.5 rounded-2xl font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-lg shadow-cyan-200 dark:shadow-none"
                >
                  {Object.values(loading).some(v => v) ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                  Surf
                </button>
                <button 
                  onClick={handleClear}
                  disabled={Object.values(loading).some(v => v)}
                  className="p-2.5 rounded-2xl border border-cyan-100 dark:border-cyan-900 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all disabled:opacity-50"
                  title="Clear All"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
              <button 
                onClick={downloadPDF}
                disabled={!responses.research && !responses.tax && !responses.dividend && !responses.sentiment}
                className="w-full mt-2 p-2.5 rounded-2xl bg-[#2e7d32] hover:bg-[#1b5e20] text-white transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-widest"
                title="Download PDF Report"
              >
                <Download size={18} />
                Download Report
              </button>
            </div>
          </div>
        </section>

        {/* Agents Grid */}
        <div id="report-container" className="p-4 rounded-[3rem]">
          <div className="flex items-center gap-4 mb-8">
            <Mascot mode={accessMode} className="w-20 h-20" />
            <div>
              <h2 className="text-3xl font-black tracking-tighter text-cyan-900 dark:text-cyan-400">Market Analysis Report</h2>
              <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Generated by FINSURF AI</p>
            </div>
          </div>
          <div id="agents-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            <AgentCard 
              title="Research Analyst"
              icon={<Search size={20} />}
              loading={loading.research}
              response={responses.research}
              color="cyan"
              accessMode={accessMode}
            />

            <AgentCard 
              title="Tax Strategist"
              icon={<Receipt size={20} />}
              loading={loading.tax}
              response={responses.tax}
              color="emerald"
              accessMode={accessMode}
            />

            <AgentCard 
              title="Dividend Specialist"
              icon={<Coins size={20} />}
              loading={loading.dividend}
              response={responses.dividend}
              color="amber"
              isDividendAgent
              accessMode={accessMode}
            />

            <AgentCard 
              title="Social Sentiment Analyst"
              icon={<MessageSquare size={20} />}
              loading={loading.sentiment}
              response={responses.sentiment}
              color="violet"
              accessMode={accessMode}
            />
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-cyan-800/40 dark:text-cyan-400/20 text-xs font-bold uppercase tracking-[0.2em]">
        <p>© {new Date().getFullYear()} FINSURF. Ride the waves responsibly.</p>
      </footer>
    </div>
  );
}

interface AgentCardProps {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  response: AgentResponse | DividendResponse | null;
  color: 'cyan' | 'emerald' | 'amber' | 'violet';
  isDividendAgent?: boolean;
  accessMode: AccessMode;
}

function Mascot({ mode, className }: { mode: AccessMode, className?: string }) {
  const filters = {
    default: 'none',
    colorblind: 'contrast(1.5) saturate(2) hue-rotate(200deg)',
    tropical: 'hue-rotate(45deg) saturate(1.5) brightness(1.1)'
  };

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <img 
        src="https://api.dicebear.com/7.x/bottts/svg?seed=Mascot&backgroundColor=transparent" 
        alt="FINSURF Mascot"
        className="w-full h-full object-contain transition-all duration-500"
        style={{ filter: filters[mode] }}
      />
    </div>
  );
}

function AgentCard({ title, icon, loading, response, color, isDividendAgent, accessMode }: AgentCardProps) {
  const colorClasses = {
    cyan: accessMode === 'tropical' 
      ? 'bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-900'
      : accessMode === 'colorblind'
      ? 'bg-blue-100 text-blue-900 border-blue-600 border-2 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-400'
      : 'bg-cyan-50 text-cyan-600 border-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-900',
    emerald: accessMode === 'tropical'
      ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900'
      : accessMode === 'colorblind'
      ? 'bg-orange-100 text-orange-900 border-orange-600 border-2 dark:bg-orange-900/40 dark:text-orange-100 dark:border-orange-400'
      : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900',
    amber: accessMode === 'tropical'
      ? 'bg-yellow-50 text-yellow-600 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900'
      : accessMode === 'colorblind'
      ? 'bg-yellow-100 text-yellow-900 border-yellow-600 border-2 dark:bg-yellow-900/40 dark:text-yellow-100 dark:border-yellow-400'
      : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900',
    violet: accessMode === 'tropical'
      ? 'bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-900'
      : accessMode === 'colorblind'
      ? 'bg-purple-100 text-purple-900 border-purple-600 border-2 dark:bg-purple-900/40 dark:text-purple-100 dark:border-purple-400'
      : 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900'
  };

  const accentClasses = {
    cyan: accessMode === 'tropical' ? 'bg-teal-600' : accessMode === 'colorblind' ? 'bg-blue-700' : 'bg-cyan-600',
    emerald: accessMode === 'tropical' ? 'bg-orange-600' : accessMode === 'colorblind' ? 'bg-orange-700' : 'bg-emerald-600',
    amber: accessMode === 'tropical' ? 'bg-yellow-600' : accessMode === 'colorblind' ? 'bg-yellow-700' : 'bg-amber-600',
    violet: accessMode === 'tropical' ? 'bg-pink-600' : accessMode === 'colorblind' ? 'bg-purple-700' : 'bg-violet-600'
  };

  const divResponse = isDividendAgent ? (response as DividendResponse) : null;

  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl flex flex-col transition-all hover:scale-[1.01] resize overflow-auto min-h-[400px] min-w-[280px] h-fit",
      accessMode === 'colorblind' 
        ? "border-4 border-blue-600 shadow-blue-900/20" 
        : "shadow-cyan-900/5 dark:shadow-black/20 border border-cyan-50 dark:border-cyan-900/50"
    )}>
      <div className="p-6 border-b border-cyan-50 dark:border-cyan-900/30 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border", colorClasses[color])}>
            {icon}
          </div>
          <div>
            <h2 className="font-black text-slate-800 dark:text-white tracking-tight">{title}</h2>
            {accessMode === 'colorblind' && (
              <span className="text-[8px] font-black uppercase tracking-tighter text-blue-600 dark:text-blue-400">High Contrast Mode</span>
            )}
          </div>
        </div>
        {loading && <Loader2 className="animate-spin text-cyan-400" size={18} />}
      </div>
      
      <div className="p-6">
        <AnimatePresence mode="wait">
          {!response && !loading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-cyan-200 dark:text-cyan-900 text-center space-y-3 py-12"
            >
              <div className="w-16 h-16 rounded-full bg-cyan-50/50 dark:bg-cyan-900/10 flex items-center justify-center">
                <TrendingUp size={32} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest">Waiting for waves...</p>
            </motion.div>
          ) : loading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="h-4 bg-cyan-50 dark:bg-slate-800 rounded-full w-3/4 animate-pulse" />
              <div className="h-4 bg-cyan-50 dark:bg-slate-800 rounded-full w-full animate-pulse" />
              <div className="h-4 bg-cyan-50 dark:bg-slate-800 rounded-full w-5/6 animate-pulse" />
              <div className="h-4 bg-cyan-50 dark:bg-slate-800 rounded-full w-2/3 animate-pulse" />
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "prose prose-sm prose-slate dark:prose-invert max-w-none",
                accessMode === 'colorblind' && "prose-strong:text-blue-900 dark:prose-strong:text-blue-100"
              )}
            >
              {isDividendAgent && divResponse && !divResponse.isDividendStock ? (
                <div className={cn(
                  "border rounded-2xl p-4 text-xs flex gap-3 mb-4",
                  accessMode === 'colorblind' 
                    ? "bg-blue-50 border-blue-600 text-blue-900" 
                    : "bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-400"
                )}>
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black uppercase tracking-tight">No Projection</p>
                    <p className="opacity-80 font-medium">This asset is not currently paying dividends. Historical context provided below.</p>
                  </div>
                </div>
              ) : null}

              <div className={cn(
                "markdown-body dark:text-slate-300 overflow-x-auto", 
                isDividendAgent && divResponse && !divResponse.isDividendStock && "opacity-60 grayscale",
                accessMode === 'colorblind' && "font-bold text-slate-900 dark:text-white"
              )}>
                <Markdown remarkPlugins={[remarkGfm]}>{response?.content}</Markdown>
              </div>
              
              {response?.sources && response.sources.length > 0 && (
                <div className="mt-8 pt-6 border-t border-cyan-50 dark:border-cyan-900/30">
                  <h4 className="text-[10px] font-black text-cyan-300 dark:text-cyan-700 uppercase tracking-widest mb-4">Sources</h4>
                  <div className="flex flex-wrap gap-2">
                    {response.sources.map((source, i) => (
                      <a 
                        key={i}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-50/50 dark:bg-slate-800 border border-cyan-100 dark:border-cyan-900 rounded-xl text-[10px] font-bold text-cyan-700 dark:text-cyan-400 transition-colors"
                      >
                        <ExternalLink size={10} />
                        <span className="max-w-[100px] truncate">{source.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className={cn("h-2 w-full", accentClasses[color])} />
    </div>
  );
}
