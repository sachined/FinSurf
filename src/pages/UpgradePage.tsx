import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Check, Zap, Infinity, Key, ChevronDown, ChevronUp, AlertCircle, Loader2,
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { cn } from '../utils/cn';
import { createPaymentIntent, validatePass } from '../services/apiService';

// Initialize outside component — avoids re-creation on re-renders.
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const FEATURES = [
  { icon: <Infinity size={16} />, text: 'Unlimited analyses — no daily cap' },
  { icon: <Zap size={16} />, text: 'All 5 AI agents: Research, Tax, Dividend, Sentiment & Summary' },
  { icon: <Key size={16} />, text: 'Use your own API keys (Gemini, Perplexity, Groq)' },
  { icon: <Check size={16} />, text: 'One-time payment — never expires' },
];

// ── Inner payment form (needs Elements context) ───────────────────────────────
function PaymentForm({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/upgrade` },
      redirect: 'if_required',
    });
    setSubmitting(false);
    if (error) {
      onError(error.message ?? 'Payment failed — please try again.');
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-amber-500 hover:bg-amber-400 text-white transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : 'Pay $15 →'}
      </button>
    </form>
  );
}

// ── Main UpgradePage ──────────────────────────────────────────────────────────
interface UpgradePageProps {
  onBack: () => void;
  onActivated: () => void;
}

export function UpgradePage({ onBack, onActivated }: UpgradePageProps) {
  type Step = 'email' | 'payment' | 'success';
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle return from Stripe redirect-based payment methods (3DS etc.)
  useEffect(() => {
    if (!stripePromise) return;
    const params = new URLSearchParams(window.location.search);
    const clientSecretParam = params.get('payment_intent_client_secret');
    if (!clientSecretParam) return;
    stripePromise.then(stripe => {
      if (!stripe) return;
      stripe.retrievePaymentIntent(clientSecretParam).then(({ paymentIntent }) => {
        if (paymentIntent?.status === 'succeeded') {
          const emailParam = params.get('email') ?? '';
          setEmail(emailParam);
          setStep('success');
          window.history.replaceState({}, '', window.location.pathname);
        }
      });
    });
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPaymentError('');
    try {
      const { clientSecret: cs } = await createPaymentIntent(email);
      setClientSecret(cs);
      setStep('payment');
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');
    setLoading(true);
    try {
      const data = await validatePass(codeInput.trim());
      if (data.valid && data.expiry) {
        localStorage.setItem('finsurf_vip_expiry', data.expiry.toString());
        localStorage.setItem('finsurf_active_pass', codeInput.trim());
        onActivated();
      } else {
        setCodeError('Invalid or expired code. Please check and try again.');
      }
    } catch {
      setCodeError('Could not validate code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stripeAppearance: Parameters<typeof Elements>[0]['options'] = {
    appearance: {
      theme: 'stripe',
      variables: { colorPrimary: '#f59e0b', borderRadius: '12px' },
    },
  };

  return (
    <div className="max-w-lg mx-auto py-8 space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-sm font-bold"
      >
        <ArrowLeft size={16} /> Back to FinSurf
      </button>

      {/* Success state */}
      {step === 'success' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl p-10 text-center space-y-4 border border-amber-100 dark:border-amber-900/30">
          <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto">
            <Check size={40} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">Payment Confirmed!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            We've sent your lifetime access code to{' '}
            <span className="font-bold text-slate-700 dark:text-slate-200">{email || 'your email'}</span>.
            <br />Check your inbox (and spam folder) for the activation link.
          </p>
          <button
            onClick={onBack}
            className="mt-4 px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-colors shadow-lg bg-amber-500 hover:bg-amber-400 shadow-amber-500/20"
          >
            Back to FinSurf
          </button>
        </div>
      )}

      {/* Email + Payment steps */}
      {step !== 'success' && (
        <>
          {/* Pricing card */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-amber-100 dark:border-amber-900/30 overflow-hidden">
            <div className="px-8 py-6 text-white bg-gradient-to-br from-amber-500 to-amber-600">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">FinSurf Pro</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black">$15</span>
                <span className="text-base opacity-80 mb-1">one-time</span>
              </div>
              <p className="text-sm opacity-90 mt-1">Lifetime access — no subscription</p>
            </div>
            <ul className="px-8 py-6 space-y-3">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="mt-0.5 shrink-0 text-amber-500 dark:text-amber-400">{f.icon}</span>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Step: email */}
          {step === 'email' && (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-amber-100 dark:border-amber-900/30 p-8 space-y-4">
              {!stripePublishableKey ? (
                <p className="text-amber-600 dark:text-amber-400 text-sm font-bold text-center">
                  Payments are not yet available in this environment.
                </p>
              ) : (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                      Your email address
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600 transition"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Your access code will be emailed here after payment.
                    </p>
                  </label>
                  {paymentError && (
                    <p className="flex items-center gap-2 text-red-500 text-sm font-medium">
                      <AlertCircle size={14} /> {paymentError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 shadow-amber-500/20"
                  >
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Loading…</> : 'Continue to Payment →'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Step: payment */}
          {step === 'payment' && clientSecret && stripePromise && (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-amber-100 dark:border-amber-900/30 p-8 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Paying as <span className="text-slate-700 dark:text-slate-200">{email}</span>
              </p>
              {paymentError && (
                <p className="flex items-center gap-2 text-red-500 text-sm font-medium">
                  <AlertCircle size={14} /> {paymentError}
                </p>
              )}
              <Elements
                stripe={stripePromise}
                options={{ clientSecret, ...stripeAppearance }}
              >
                <PaymentForm
                  onSuccess={() => setStep('success')}
                  onError={msg => setPaymentError(msg)}
                />
              </Elements>
            </div>
          )}

          {/* Already have a code? */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6">
            <button
              type="button"
              onClick={() => setShowCodeEntry(v => !v)}
              className="w-full flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Already have an access code?
              {showCodeEntry ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showCodeEntry && (
              <form onSubmit={handleCodeSubmit} className="mt-4 space-y-3">
                <input
                  type="text"
                  required
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="PAID-XXXX-XXXX or FINSURF-XXXX-XXXX"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600 transition"
                />
                {codeError && (
                  <p className="flex items-center gap-2 text-red-500 text-sm font-medium">
                    <AlertCircle size={14} /> {codeError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    'w-full py-3 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2',
                    'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20'
                  )}
                >
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Checking…</> : 'Activate Code'}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
