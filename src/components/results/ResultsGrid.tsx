import React from 'react';
import { Search, Receipt, Coins, MessageSquare, Sparkles, Download, Info, RotateCcw, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { AgentCard } from '../cards/AgentCard';
import { FinancialAgentsState, LoadingState, AccessMode } from '../../types';
import { cn } from '../../utils/cn';

interface ResultsGridProps {
  responses: FinancialAgentsState;
  loading: LoadingState;
  accessMode: AccessMode;
  onDownloadPDF: () => void;
}

const TRUST_BADGES = [
  { icon: <RotateCcw size={20} />, title: 'Real-time Data', desc: 'Synced with market waves' },
  { icon: <HelpCircle size={20} />, title: 'AI Insights', desc: 'Powered by specialized agents' },
  { icon: <Info size={20} />, title: 'Tax Ready', desc: 'Automated holding analysis' },
];

export function ResultsGrid({ responses, loading, accessMode, onDownloadPDF }: ResultsGridProps) {
  const isDone = !Object.values(loading).some(v => v) && Object.values(responses).some(r => r !== null);

  return (
      <div className="space-y-12">
    <div
      id="agents-grid"
      className="grid grid-cols-1 md:grid-cols-2 relative z-20 transition-all duration-700 gap-8 mb-12"
    >
      {/* Executive Summary — full-width at the top */}
      <div className="col-span-1 md:col-span-2 mb-4">
        <AgentCard
          title="Executive Summary"
          icon={<Sparkles size={24} className="text-cyan-500" />}
          loading={loading.summary}
          response={responses.summary}
          color="cyan"
          emptyDescription="A plain-English investment brief combining all findings — the best place to start."
          accessMode={accessMode}
          isCompact={isDone}
        />
      </div>
      <AgentCard
        title="Research Analyst"
        icon={<Search size={20} />}
        loading={loading.research}
        response={responses.research}
        color="cyan"
        emptyDescription="Is the company healthy? Earnings growth, valuation, and who the big investors are."
        accessMode={accessMode}
        isCompact={isDone}
      />
      <AgentCard
        title="Tax Strategist"
        icon={<Receipt size={20} />}
        loading={loading.tax}
        response={responses.tax}
        color="emerald"
        emptyDescription="Know your tax bill before you sell — short-term vs. long-term rates, explained simply."
        accessMode={accessMode}
        isCompact={isDone}
      />
      <AgentCard
        title="Dividend Specialist"
        icon={<Coins size={20} />}
        loading={loading.dividend}
        response={responses.dividend}
        color="amber"
        isDividendAgent
        emptyDescription="How much cash will this stock pay you? Income projections on your exact share count."
        accessMode={accessMode}
        isCompact={isDone}
      />
      <AgentCard
        title="Sentiment Analyst"
        icon={<MessageSquare size={20} />}
        loading={loading.sentiment}
        response={responses.sentiment}
        color="violet"
        emptyDescription="What is everyone saying? Reddit, X, StockTwits & news — the crowd's mood right now."
        accessMode={accessMode}
        isCompact={isDone}
      />
    </div>
        {/* New Section: Info Boxes & Download Bar (Visible only when done) */}
      {isDone && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-8 pb-12"
        >
          {/* Three Info Graphic Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TRUST_BADGES.map(({ icon, title, desc }) => (
              <div key={title} className={cn(
                "flex items-center gap-4 px-6 py-5 rounded-[2rem] border transition-all duration-500",
                accessMode === 'tropical' ? "bg-orange-50/40 border-orange-100" : "bg-white/60 dark:bg-slate-900/60 border-cyan-50 dark:border-cyan-900/40"
              )}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600">
                  {icon}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white">{title}</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Prominent Download Bar */}
          <div className={cn(
            "flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-[3rem] shadow-2xl text-white",
            accessMode === 'tropical' ? "bg-orange-500" : "bg-slate-900 dark:bg-slate-800"
          )}>
            <div className="flex items-center gap-6">
              <Download size={32} className="opacity-20 hidden sm:block" />
              <div>
                <h3 className="text-xl font-black tracking-tight">Export Report</h3>
                <p className="text-sm opacity-80">Download your financial surf report in PDF format</p>
              </div>
            </div>
            <button
              onClick={onDownloadPDF}
              className="w-full sm:w-auto px-8 py-4 bg-white text-cyan-600 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-50 transition-all flex items-center justify-center gap-2"
            >
              <Download size={18} /> Download PDF
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
