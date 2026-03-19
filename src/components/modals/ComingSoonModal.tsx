import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Check, Mail, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ComingSoonModalProps {
  onClose: () => void;
}

const FEATURES = [
  { icon: <Zap size={14} />, text: 'Unlimited analyses — no daily limit' },
  { icon: <Sparkles size={14} />, text: 'Priority API access — faster results' },
  { icon: <Check size={14} />, text: 'Advanced features coming soon' },
];

export function ComingSoonModal({ onClose }: ComingSoonModalProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Store email in localStorage for now (you can add backend endpoint later)
    const existingEmails = JSON.parse(localStorage.getItem('finsurf_waitlist') || '[]');
    if (!existingEmails.includes(email)) {
      existingEmails.push(email);
      localStorage.setItem('finsurf_waitlist', JSON.stringify(existingEmails));
    }

    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('sachin.nediyanchath@gmail.com');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-amber-500 to-lime-500 dark:from-amber-600 dark:to-lime-600 p-8 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Zap size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter leading-none">Upgrade</h2>
              <p className="text-sm font-semibold opacity-90">Coming Soon</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed opacity-90">
            Premium features are in development. Join the waitlist to be notified when they launch!
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Features */}
                <div className="space-y-3 mb-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    What's coming
                  </h3>
                  {FEATURES.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-7 h-7 rounded-lg bg-lime-50 dark:bg-lime-900/20 text-lime-600 dark:text-lime-400 flex items-center justify-center shrink-0">
                        {feature.icon}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Email form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                      Join the waitlist
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className={cn(
                      "w-full py-3 rounded-2xl font-bold uppercase tracking-wide text-sm transition-all",
                      "bg-gradient-to-r from-amber-500 to-lime-500 hover:from-amber-600 hover:to-lime-600",
                      "text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40",
                      "active:scale-95"
                    )}
                  >
                    Notify me when it launches
                  </button>
                </form>

                {/* Or contact directly */}
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-3">
                    Or reach out directly
                  </p>
                  <button
                    onClick={handleCopyEmail}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Mail size={14} />
                    Copy email address
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-lime-100 dark:bg-lime-900/20 flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-lime-600 dark:text-lime-400" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                  You're on the list!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  We'll notify you when premium features launch.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
