import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mascot } from './components/Mascot';
import { cn } from './utils/cn';
import { downloadPDF } from './utils/pdfGenerator';
import { Header } from './components/layout/Header';
import { SearchForm } from './components/forms/SearchForm';
import { ResultsGrid } from './components/results/ResultsGrid';
import { Footer } from './components/layout/Footer';
import { useTheme } from './hooks/useTheme';
import { useFormState } from './hooks/useFormState';
import { useFinancialAgents } from './hooks/useFinancialAgents';
import { type PDFMode } from './types';

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

  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfMode, setPdfMode] = useState<PDFMode>('standard');
  const [hasSurfed, setHasSurfed] = useState(false);

  const isAnyLoading = Object.values(loading).some(v => v);

  const handleSearch = async () => {
    if (!validateAll()) return;
    setHasSurfed(true);
    await runAll(ticker, purchaseDate, sellDate, shares, setError);
  };

  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    try {
      const scale = 2.0;
      await downloadPDF(ticker, theme, pdfMode, scale);
    } catch (err) {
      console.error(err);
      setError('Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
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
        />

        <main id="report-container">
          {/* PDF-only Header (Hidden in UI) */}
          <div 
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
            isCompact={hasSurfed && !isAnyLoading}
          />

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

          <ResultsGrid 
            responses={responses} 
            loading={loading} 
            accessMode={accessMode} 
          />
        </main>

        <Footer 
          onDownloadPDF={handleDownloadPDF} 
          isGeneratingPdf={generatingPdf}
          accessMode={accessMode}
          pdfMode={pdfMode}
          setPdfMode={setPdfMode}
        />
      </div>

      {/* PDF Generation Overlay */}
      <AnimatePresence>
        {generatingPdf && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white"
          >
            <div className="bg-slate-800 p-8 rounded-[3rem] shadow-2xl border border-slate-700 flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-cyan-500/20 rounded-full animate-ping absolute inset-0" />
                <div className="w-20 h-20 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin relative z-10" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Generating Report</h2>
                <p className="text-slate-400 font-medium">Capturing the market waves... please wait.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot Integration */}
      <div className="fixed bottom-8 right-8 z-50 pointer-events-none sm:pointer-events-auto">
        <Mascot mode={accessMode} isThinking={isAnyLoading} />
      </div>
    </div>
  );
}
