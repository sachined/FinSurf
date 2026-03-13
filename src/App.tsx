import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mascot } from './components/ui/Mascot';
import { cn } from './utils/cn';
import { downloadPDF } from './utils/pdfGenerator';
import { Header } from './components/layout/Header';
import { SearchForm } from './components/forms/SearchForm';
import { ResultsGrid } from './components/results/ResultsGrid';
import { Footer } from './components/layout/Footer';
import { WelcomeHero } from './components/ui/WelcomeHero';
import { AgentProgressStrip } from './components/cards/AgentProgressStrip';
import { ApiKeyModal } from './components/modals/ApiKeyModal';
import { AboutPage } from './pages/AboutPage';
import { TickerSummaryBar } from './components/ui/TickerSummaryBar';
import { useTheme } from './hooks/useTheme';
import { useFormState } from './hooks/useFormState';
import { useFinancialAgents } from './hooks/useFinancialAgents';
import { UserApiKeys } from './types';

// localStorage keys
const LS_SURF_COUNT = 'finsurf_surf_count';
const LS_USER_KEYS  = 'finsurf_user_keys';
const FREE_TRIES    = 3;

function loadUserKeys(): UserApiKeys | null {
  try {
    const raw = localStorage.getItem(LS_USER_KEYS);
    return raw ? (JSON.parse(raw) as UserApiKeys) : null;
  } catch {
    return null;
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function getSurfCount(): number {
  try {
    const raw = localStorage.getItem(LS_SURF_COUNT);
    if (!raw) return 0;
    const { count, date } = JSON.parse(raw);
    // Reset counter when the stored date is from a previous day
    if (date !== todayISO()) return 0;
    return typeof count === 'number' ? count : 0;
  } catch {
    return 0;
  }
}

function incrementSurfCount(): number {
  const next = getSurfCount() + 1;
  localStorage.setItem(LS_SURF_COUNT, JSON.stringify({ count: next, date: todayISO() }));
  return next;
}

export default function App() {
  const { theme, toggleTheme, accessMode, setAccessMode } = useTheme();
  const {
    ticker, setTicker,
    purchaseDate, setPurchaseDate,
    sellDate, setSellDate,
    shares, setShares,
    error, setError,
    validateAll
  } = useFormState();

  const {
    loading,
    responses,
    runAll
  } = useFinancialAgents();

  const [hasSurfed, setHasSurfed] = useState(false);
  const [userKeys, setUserKeys] = useState<UserApiKeys | null>(() => loadUserKeys());
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [currentPage, setCurrentPage] = useState<'home' | 'about'>('home');

  const isAnyLoading = Object.values(loading).some(v => v);
  const hasResponses = Object.values(responses).some(r => r !== null);

  // isProd is true only in the Vite production build (Docker / CI).
  // In dev (`npm run dev`) import.meta.env.PROD is always false.
  const isProd = import.meta.env.PROD;

  const executeSearch = useCallback(async (keys: UserApiKeys | null) => {
    setHasSurfed(true);
    setError(null);
    await runAll(ticker, purchaseDate, sellDate, shares, setError, keys ?? undefined);
  }, [ticker, purchaseDate, sellDate, shares, runAll, setError]);

  const handleSearch = async () => {
    if (!validateAll()) return;

    // In production: enforce free-try limit when no user keys are stored.
    if (isProd && !userKeys) {
      const count = incrementSurfCount();
      if (count > FREE_TRIES) {
        setShowApiKeyModal(true);
        return;
      }
    }

    await executeSearch(userKeys);
  };

  const handleApiKeysSubmit = useCallback(async (keys: UserApiKeys) => {
    localStorage.setItem(LS_USER_KEYS, JSON.stringify(keys));
    setUserKeys(keys);
    setShowApiKeyModal(false);
    // Run the search immediately with the newly provided keys.
    await executeSearch(keys);
  }, [executeSearch]);

  const handleDownloadPDF = () => {
    downloadPDF(ticker);
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500 font-sans selection:bg-cyan-500 selection:text-white p-4 md:p-8 lg:p-12 overflow-x-hidden relative",
      accessMode === 'tropical' 
        ? "bg-orange-50/30 dark:bg-slate-950" 
        : accessMode === 'colorblind'
        ? "bg-blue-50 dark:bg-slate-950"
        : "bg-slate-50 dark:bg-slate-950"
    )}>
      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {accessMode === 'tropical' ? (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-orange-300/20 dark:bg-orange-500/5 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] bg-pink-400/15 dark:bg-pink-500/5 blur-[100px] rounded-full" />
            <div className="absolute bottom-[-10%] left-[10%] w-[50%] h-[50%] bg-teal-300/20 dark:bg-teal-500/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-yellow-300/20 dark:bg-yellow-500/5 blur-[120px] rounded-full animate-pulse" />
            
            {/* Wave Pattern */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          </>
        ) : accessMode === 'colorblind' ? (
          <>
            <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-blue-600/10 dark:bg-blue-400/5 blur-[100px] rounded-full" />
            <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-yellow-500/10 dark:bg-yellow-400/5 blur-[100px] rounded-full" />
            
            {/* Grid Pattern for Structure */}
            <div className="absolute inset-0 opacity-[0.08] dark:opacity-[0.1] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(#2563eb 1px, transparent 1px), linear-gradient(90deg, #2563eb 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          </>
        ) : (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 dark:bg-cyan-500/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] rounded-full" />
          </>
        )}
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <Header 
          theme={theme} 
          toggleTheme={toggleTheme} 
          accessMode={accessMode} 
          setAccessMode={setAccessMode}
          onAbout={() => setCurrentPage(p => p === 'about' ? 'home' : 'about')}
        />

        {currentPage === 'about' && (
          <AboutPage accessMode={accessMode} onBack={() => setCurrentPage('home')} />
        )}

        <main id="report-container" style={{ display: currentPage === 'about' ? 'none' : undefined }}>
          {/* PDF-only Header (Hidden in UI) */}
          <div 
            data-no-print=""
            data-pdf-chunk="pdf-header" 
            className="hidden flex-col items-center justify-center text-center p-12 mb-12 bg-white dark:bg-slate-900 rounded-[3rem] border-4 border-cyan-500 shadow-2xl"
          >
            <div className="flex items-center gap-6 mb-6">
              <Mascot mode={accessMode} className="w-24 h-24" isThinking={false} />
              <div className="text-left">
                <h1 className="text-6xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">
                  FinSurf<span className="text-cyan-500">.ai</span>
                </h1>
                <p className="text-sm font-bold uppercase tracking-[0.4em] text-cyan-600 mt-2">
                  Market Analysis Report
                </p>
              </div>
            </div>
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-30" />
          </div>

          <div data-no-print="">
            <AnimatePresence>
              {!hasSurfed && (
                <WelcomeHero accessMode={accessMode} />
              )}
            </AnimatePresence>
          </div>

          <div data-no-print="">
            <SearchForm
              ticker={ticker}
              setTicker={setTicker}
              purchaseDate={purchaseDate}
              setPurchaseDate={setPurchaseDate}
              sellDate={sellDate}
              setSellDate={setSellDate}
              shares={shares}
              setShares={setShares}
              onSearch={handleSearch}
              isLoading={isAnyLoading}
              hasSurfed={hasSurfed}
              accessMode={accessMode}
              isCompact={hasResponses && !isAnyLoading}
            />
          </div>

          <div data-no-print="">
            <AgentProgressStrip loading={loading} responses={responses} accessMode={accessMode} />
          </div>

          <div data-no-print="">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="pdf-alert mb-8 p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-[2rem] text-red-600 dark:text-red-400 font-bold text-center shadow-xl shadow-red-900/5 flex items-center justify-center gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="min-h-[104px] mb-6">
          {responses.research && !isAnyLoading ? (
            <TickerSummaryBar
              ticker={ticker}
              currentPrice={responses.research.currentPrice}
              pnlSummary={responses.research.pnlSummary ?? null}
              shares={parseFloat(shares) || 0}
              purchaseDate={purchaseDate}
              sellDate={sellDate}
              accessMode={accessMode}
            />
          ) : isAnyLoading ? (
              <div className="w-full h-[88px] animate-pulse bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800" />
          ) : null }
          </div>

          <ResultsGrid
            responses={responses} 
            loading={loading} 
            accessMode={accessMode} 
          />
        </main>

        <Footer
          onDownloadPDF={handleDownloadPDF}
          accessMode={accessMode}
          isDataAvailable={hasResponses && !isAnyLoading}
        />
      </div>

      {/* Mascot Integration */}
      <div className="fixed bottom-8 right-8 z-50 pointer-events-none sm:pointer-events-auto">
        <Mascot mode={accessMode} className="w-24 h-24" isThinking={isAnyLoading} />
      </div>

      {/* API Key Modal — production only, shown after free tries are exhausted */}
      {showApiKeyModal && (
        <ApiKeyModal onSubmit={handleApiKeysSubmit} />
      )}
    </div>
  );
}
