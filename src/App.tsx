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
  RotateCcw,
  HelpCircle,
  Download,
  Palmtree,
  Eye,
  Moon,
  Sun,
  MessageSquare,
  Info
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { researchAgent, taxAgent, dividendAgent, sentimentAgent, type AgentResponse, type DividendResponse } from './services/geminiService';
import { Mascot } from './components/Mascot';
import { AgentCard } from './components/AgentCard';
import { downloadPDF } from './utils/pdfGenerator';
import { cn } from './utils/cn';
import { type Theme, type AccessMode } from './types';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [ticker, setTicker] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sellDate, setSellDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [shares, setShares] = useState<string>('10');
  const [theme, setTheme] = useState<Theme>('light');
  const [accessMode, setAccessMode] = useState<AccessMode>('default');
  const [pdfQuality, setPdfQuality] = useState<'standard' | 'high'>('high');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  const validateAll = () => {
    const tickerRegex = /^[A-Z0-9.^=-]{1,10}$/;
    if (!tickerRegex.test(ticker)) {
      setError('Invalid Ticker format. Use up to 10 characters (A-Z, 0-9, ., ^, =, -).');
      return false;
    }

    if (!purchaseDate || !sellDate) {
      setError('Both Purchase and Sell dates are required.');
      return false;
    }

    const pDate = parseISO(purchaseDate);
    const sDate = parseISO(sellDate);
    if (isNaN(pDate.getTime()) || isNaN(sDate.getTime())) {
      setError('Invalid date format.');
      return false;
    }

    if (differenceInDays(sDate, pDate) < 0) {
      setError('Sell Date cannot be before Purchase Date.');
      return false;
    }

    const shareNum = parseFloat(shares);
    if (isNaN(shareNum) || shareNum <= 0) {
      setError('Shares must be a positive number.');
      return false;
    }

    if (shareNum > 1000000000) {
      setError('Shares count exceeds maximum limit (1,000,000,000).');
      return false;
    }

    setError(null);
    return true;
  };

  const sanitizeShares = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    // Limit to 8 decimal places and cap at 1 billion
    const capped = Math.min(num, 1000000000);
    return Number(capped.toFixed(8)).toString();
  };

  const handleResearch = async () => {
    if (!ticker) return;
    const tickerRegex = /^[A-Z0-9.^=-]{1,10}$/;
    if (!tickerRegex.test(ticker)) {
      setError('Invalid Ticker format.');
      return;
    }
    setError(null);
    setLoading(prev => ({ ...prev, research: true }));
    try {
      const res = await researchAgent(ticker);
      setResponses(prev => ({ ...prev, research: res }));
    } catch (error) {
      console.error(error);
      setError('Research failed. Please check the ticker or try again.');
    } finally {
      setLoading(prev => ({ ...prev, research: false }));
    }
  };

  const handleTax = async () => {
    if (!ticker || !purchaseDate || !sellDate) return;
    const pDate = parseISO(purchaseDate);
    const sDate = parseISO(sellDate);
    if (differenceInDays(sDate, pDate) < 0) {
      setError('Sell Date cannot be before Purchase Date.');
      return;
    }
    setError(null);
    setLoading(prev => ({ ...prev, tax: true }));
    try {
      const res = await taxAgent(ticker, purchaseDate, sellDate);
      setResponses(prev => ({ ...prev, tax: res }));
    } catch (error) {
      console.error(error);
      setError('Tax analysis failed.');
    } finally {
      setLoading(prev => ({ ...prev, tax: false }));
    }
  };

  const handleDividend = async () => {
    if (!ticker || !shares) return;
    const shareNum = parseFloat(shares);
    if (isNaN(shareNum) || shareNum <= 0) {
      setError('Shares must be a positive number.');
      return;
    }
    const sanitizedShares = sanitizeShares(shares);
    setShares(sanitizedShares);

    const years = Math.max(1, Math.ceil(differenceInDays(parseISO(sellDate), parseISO(purchaseDate)) / 365));
    setLoading(prev => ({ ...prev, dividend: true }));
    try {
      const res = await dividendAgent(ticker, parseFloat(sanitizedShares), years);
      setResponses(prev => ({ ...prev, dividend: res }));
    } catch (error) {
      console.error(error);
      setError('Dividend analysis failed.');
    } finally {
      setLoading(prev => ({ ...prev, dividend: false }));
    }
  };

  const handleSentiment = async () => {
    if (!ticker) return;
    const tickerRegex = /^[A-Z0-9.^=-]{1,10}$/;
    if (!tickerRegex.test(ticker)) {
      setError('Invalid Ticker format.');
      return;
    }
    setError(null);
    setLoading(prev => ({ ...prev, sentiment: true }));
    try {
      const res = await sentimentAgent(ticker);
      setResponses(prev => ({ ...prev, sentiment: res }));
    } catch (error) {
      console.error(error);
      setError('Sentiment analysis failed.');
    } finally {
      setLoading(prev => ({ ...prev, sentiment: false }));
    }
  };

  const runAll = async () => {
    if (!validateAll()) return;
    
    // Sanitize shares before running
    const sanitized = sanitizeShares(shares);
    setShares(sanitized);

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
    setError(null);
    setResponses({
      research: null,
      tax: null,
      dividend: null,
      sentiment: null
    });
  };

  const handleDownloadReport = async () => {
    setGeneratingPdf(true);
    try {
      await downloadPDF(ticker, theme, pdfQuality === 'high' ? 2 : 1);
    } catch (e) {
      setError('PDF generation failed. Try standard quality.');
    } finally {
      setGeneratingPdf(false);
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
        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 flex items-center justify-between gap-4 overflow-hidden"
            >
              <div className="flex items-center gap-3 text-red-800 dark:text-red-400">
                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                  <Info size={18} />
                </div>
                <p className="text-sm font-bold">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-red-400 transition-colors"
              >
                <RotateCcw size={16} className="rotate-45" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

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
              
              <div className="mt-4 flex items-center justify-between gap-2 px-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">PDF Quality</span>
                <div className="flex bg-cyan-50/50 dark:bg-slate-800/50 p-1 rounded-xl border border-cyan-100 dark:border-cyan-900">
                  <button 
                    onClick={() => setPdfQuality('standard')}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all",
                      pdfQuality === 'standard' 
                        ? "bg-white dark:bg-slate-700 text-cyan-600 shadow-sm" 
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Standard
                  </button>
                  <button 
                    onClick={() => setPdfQuality('high')}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all",
                      pdfQuality === 'high' 
                        ? "bg-cyan-600 text-white shadow-sm" 
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    High
                  </button>
                </div>
              </div>

              <button 
                onClick={handleDownloadReport}
                disabled={generatingPdf || (!responses.research && !responses.tax && !responses.dividend && !responses.sentiment)}
                className="w-full mt-2 p-2.5 rounded-2xl bg-[#2e7d32] hover:bg-[#1b5e20] text-white transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-widest"
                title="Download PDF Report"
              >
                {generatingPdf ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                {generatingPdf ? 'Generating...' : 'Download Report'}
              </button>
            </div>
          </div>
        </section>

        {/* Agents Grid */}
        <div id="report-container" className="p-4 rounded-[3rem]">
          <div data-pdf-chunk="header" className="flex items-center gap-4 mb-8">
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
