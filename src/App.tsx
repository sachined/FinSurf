import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { Mascot } from './components/ui/Mascot';
import { cn } from './utils/cn';
import { Header } from './components/layout/Header';
import { SearchForm } from './components/forms/SearchForm';
import { ResultsGrid } from './components/results/ResultsGrid';
import { Footer } from './components/layout/Footer';
import { WelcomeHero } from './components/ui/WelcomeHero';
import { AgentProgressStrip } from './components/cards/AgentProgressStrip';
import { ApiKeyModal } from './components/modals/ApiKeyModal';
import { ContactModal } from './components/modals/ContactModal';
import { TickerSummaryBar } from './components/ui/TickerSummaryBar';
import { ErrorDisplay } from './components/ui/ErrorDisplay';
import { ComingSoonModal } from './components/modals/ComingSoonModal';
import { useTheme } from './hooks/useTheme';
import { useFormState } from './hooks/useFormState';
import { useFinancialAgents } from './hooks/useFinancialAgents';
import { validatePass } from './services/apiService';
import { UserApiKeys } from './types';
import { FREE_TRIES, LS_KEYS } from './constants';
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));

const LS_SURF_COUNT = 'finsurf_surf_count';

function loadUserKeys(): UserApiKeys | null {
  try {
    const raw = localStorage.getItem(LS_KEYS.userKeys);
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
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pass = params.get('pass');

    if (pass) {
      validatePass(pass).then(data => {
        if (data.valid && data.expiry) {
          localStorage.setItem('finsurf_vip_expiry', data.expiry.toString());
          localStorage.setItem(LS_KEYS.activePass, pass);
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

  const { loading, responses, runAll } = useFinancialAgents();

  const [hasSurfed, setHasSurfed] = useState(false);
  const [surfCount, setSurfCount] = useState(() => getSurfCount());
  const [userKeys, setUserKeys] = useState<UserApiKeys | null>(() => loadUserKeys());
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [currentPage, setCurrentPage] = useState<'home' | 'about'>('home');
  const isAnyLoading = Object.values(loading).some(v => v);
  const hasResponses = Object.values(responses).some(r => r !== null);

  // isProd is true only in the Vite production build (Docker / CI).
  // In dev (`npm run dev`) import.meta.env.PROD is always false.
  const isProd = import.meta.env.PROD;

  const vipExpiry = localStorage.getItem('finsurf_vip_expiry');
  const isVipActive = Boolean(vipExpiry && parseInt(vipExpiry, 10) > Date.now());
  const triesLeft = (isProd && !userKeys && !isVipActive) ? Math.max(0, FREE_TRIES - surfCount) : undefined;

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
      setSurfCount(count);
      if (count > FREE_TRIES) {
        setShowApiKeyModal(true);
        return;
      }
    }
    await executeSearch(userKeys);
  }, [validateAll, isProd, userKeys, executeSearch]);

  const handleApiKeysSubmit = useCallback(async (keys: UserApiKeys) => {
    localStorage.setItem(LS_KEYS.userKeys, JSON.stringify(keys));
    setUserKeys(keys);
    setShowApiKeyModal(false);
    // Run the search immediately with the newly provided keys.
    await executeSearch(keys);
  }, [executeSearch]);

  const handleAbout = useCallback(() => {
    setCurrentPage(p => p === 'about' ? 'home' : 'about');
  }, []);

  const handleUpgrade = useCallback(() => {
    setShowComingSoonModal(true);
  }, []);

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-0 font-sans selection:bg-amber-500 selection:text-white p-4 md:p-8 lg:p-12 overflow-x-hidden relative",
      "bg-[#f8f5f0] dark:bg-[#070B14]"
    )}>
      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        <div className="absolute -top-60 -right-60 w-[500px] h-[500px] rounded-full bg-amber-500/[0.04] dark:bg-amber-400/[0.04] blur-3xl" />
        <div className="absolute -bottom-60 -left-60 w-[600px] h-[600px] rounded-full bg-lime-500/[0.04] dark:bg-lime-400/[0.04] blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <Header
          theme={theme}
          toggleTheme={toggleTheme}
          onAboutClick={handleAbout}
          onUpgradeClick={handleUpgrade}
        />

        {currentPage === 'about' ? (
          <Suspense fallback={<div className="min-h-100 flex items-center justify-center animate-pulse" />}>
            <AboutPage onBack={() => setCurrentPage('home')} />
          </Suspense>
        ) : (
            <main id="report-container">
            {/* PDF-only Header (Hidden in UI) */}
          <div
            data-no-print=""
            data-pdf-chunk="pdf-header"
            className="hidden flex-col items-center justify-center text-center p-12 mb-12 bg-white dark:bg-slate-900 rounded-[3rem] border-4 border-amber-500 shadow-2xl"
          >
            <div className="flex items-center gap-6 mb-6">
              <Mascot className="w-24 h-24" isThinking={false} />
              <div className="text-left">
                <h1 className="text-6xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">
                  FinSurf<span className="text-amber-500">.ai</span>
                </h1>
                <p className="text-sm font-bold uppercase tracking-[0.4em] text-amber-600 mt-2">
                  Market Analysis Report
                </p>
              </div>
            </div>
            <div className="w-full h-1 bg-linear-to-r from-transparent via-amber-500 to-transparent opacity-30" />
          </div>

          <div data-no-print="">
            <AnimatePresence>
              {!hasSurfed && (
                <WelcomeHero />
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
              isCompact={hasResponses && !isAnyLoading}
              isDataAvailable={hasResponses && !isAnyLoading}
              onAboutClick={handleAbout}
              onContactClick={() => setShowContactModal(true)}
              triesLeft={triesLeft}
            />
          </div>

          <div data-no-print="">
            <AgentProgressStrip loading={loading} responses={responses} />
          </div>

          <div data-no-print="">
            <AnimatePresence>
              {error && (
                <ErrorDisplay error={error} onDismiss={() => setError(null)} />
              )}
            </AnimatePresence>
          </div>

          <div className="min-h-26 mb-4">
          {responses.research && !isAnyLoading ? (
            <TickerSummaryBar
              ticker={ticker}
              currentPrice={responses.research.currentPrice}
              pnlSummary={responses.research.pnlSummary ?? null}
              priceHistory={responses.research.priceHistory}
              shares={parseFloat(shares) || 0}
              purchaseDate={purchaseDate}
              sellDate={sellDate}
            />
          ) : isAnyLoading ? (
              <div className="w-full h-22 animate-pulse bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800" />
          ) : null }
          </div>

          <ResultsGrid
            responses={responses}
            loading={loading}
          />

          <Footer />
        </main>
        )}
      </div>
      {/* Mascot Integration */}
      <div className="hidden sm:block fixed bottom-8 right-8 z-50 pointer-events-none sm:pointer-events-auto">
        <Mascot className="w-24 h-24" isThinking={isAnyLoading} />
      </div>

      {/* API Key Modal — production only, shown after free tries are exhausted */}
      {showApiKeyModal && (
        <ApiKeyModal onSubmit={handleApiKeysSubmit} />
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <ContactModal onClose={() => setShowContactModal(false)} />
      )}

      {/* Coming Soon Modal — shown when user clicks Upgrade */}
      <AnimatePresence>
        {showComingSoonModal && (
          <ComingSoonModal onClose={() => setShowComingSoonModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
