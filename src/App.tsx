import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
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
import { TickerSummaryBar } from './components/ui/TickerSummaryBar';
import { useTheme } from './hooks/useTheme';
import { useFormState } from './hooks/useFormState';
import { useFinancialAgents } from './hooks/useFinancialAgents';
import { validatePass } from './services/apiService';
import { UserApiKeys } from './types';
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const UpgradePage = lazy(() => import('./pages/UpgradePage').then(m => ({ default: m.UpgradePage })));

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pass = params.get('pass');

    if (pass) {
      validatePass(pass).then(data => {
        if (data.valid && data.expiry) {
          localStorage.setItem('finsurf_vip_expiry', data.expiry.toString());
          localStorage.setItem('finsurf_active_pass', pass);
          window.history.replaceState({}, '', window.location.pathname);
          alert("VIP Early Access Activated! You have unlimited analyses for 15 days.");
        }
      }).catch(err => {
        console.error("Failed to validate VIP pass:", err);
      });
    }
  }, []);

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
  const [currentPage, setCurrentPage] = useState<'home' | 'about' | 'upgrade'>('home');
  const [upgradePage, setUpgradePage] = useState<'home' | 'about'>('home');

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

  const handleSearch = useCallback(async () => {
    if (!validateAll()) return;

    // Check if a user has an active VIP pass
    const vipExpiry = localStorage.getItem('finsurf_vip_expiry');
    const isVip = vipExpiry && parseInt(vipExpiry, 10) > Date.now();

    // In production: enforce the limit ONLY if not VIP and no user keys are provided
    if (isProd && !userKeys && !isVip) {
      const count = incrementSurfCount();
      if (count > FREE_TRIES) {
        setShowApiKeyModal(true);
        return;
      }
    }
    await executeSearch(userKeys);
  }, [validateAll, isProd, userKeys, executeSearch]);

  const handleApiKeysSubmit = useCallback(async (keys: UserApiKeys) => {
    localStorage.setItem(LS_USER_KEYS, JSON.stringify(keys));
    setUserKeys(keys);
    setShowApiKeyModal(false);
    // Run the search immediately with the newly provided keys.
    await executeSearch(keys);
  }, [executeSearch]);

  const handleAbout = useCallback(() => {
    setCurrentPage(p => p === 'about' ? 'home' : 'about');
  }, []);

  const handleUpgrade = useCallback(() => {
    setUpgradePage(p => p === 'about' ? 'home' : 'about');
  }, []);

  const handleDownloadPDF = useCallback(() => {
    downloadPDF(ticker);
  }, [ticker]);

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-0 font-sans selection:bg-cyan-500 selection:text-white p-4 md:p-8 lg:p-12 overflow-x-hidden relative",
      accessMode === 'tropical'
        ? "bg-orange-50/30 dark:bg-teal-950"
        : accessMode === 'colorblind'
        ? "bg-blue-50 dark:bg-[#050810]"
        : "bg-transparent dark:bg-[#0c1310]"
    )}>
      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {accessMode === 'tropical' ? (
          <>
            {/* Teal — tropical ocean */}
            <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] bg-teal-400/25 dark:bg-teal-500/8 blur-[140px] rounded-full animate-pulse" />
            {/* Rose/coral — hibiscus */}
            <div className="absolute top-[10%] right-[-10%] w-[45%] h-[45%] bg-rose-400/20 dark:bg-rose-500/6 blur-[110px] rounded-full" />
            {/* Fuchsia — bougainvillea */}
            <div className="absolute bottom-[-5%] left-[5%] w-[40%] h-[40%] bg-fuchsia-400/15 dark:bg-fuchsia-500/5 blur-[130px] rounded-full" />
            {/* Yellow — golden sunshine */}
            <div className="absolute bottom-[15%] right-[-5%] w-[35%] h-[35%] bg-yellow-300/25 dark:bg-yellow-500/8 blur-[100px] rounded-full animate-pulse" />
            {/* Dot pattern */}
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
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime-500/20 to-transparent" />
        )}
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <Header 
          theme={theme} 
          toggleTheme={toggleTheme} 
          accessMode={accessMode} 
          setAccessMode={setAccessMode}
          onAboutClick={handleAbout}
          onUpgradeClick={handleUpgrade}
        />

        {currentPage === 'about' ? (
          <Suspense fallback={<div className="min-h-100 flex items-center justify-center animate-pulse" />}>
            <AboutPage accessMode={accessMode} onBack={() => setCurrentPage('home')} />
          </Suspense>
        ) : currentPage === 'upgrade' ? (
          <Suspense fallback={<div className="min-h-100 flex items-center justify-center animate-pulse" />}>
            <UpgradePage accessMode={accessMode} onBack={() => setCurrentPage('home')} onActivated={() => setCurrentPage('home')} />
          </Suspense>
        ) : (
            <main id="report-container">
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
            <div className="w-full h-1 bg-linear-to-r from-transparent via-cyan-500 to-transparent opacity-30" />
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
              isDataAvailable={hasResponses && !isAnyLoading}
              onAboutClick={handleAbout}
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
                  className="pdf-alert mb-8 p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-4xl text-red-600 dark:text-red-400 font-bold text-center shadow-xl shadow-red-900/5 flex items-center justify-center gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="min-h-26 mb-6">
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
              <div className="w-full h-22 animate-pulse bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800" />
          ) : null }
          </div>

          <ResultsGrid
            responses={responses}
            loading={loading}
            accessMode={accessMode}
          />

          <Footer accessMode={accessMode} />
        </main>
        )}
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
