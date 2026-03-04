import React, { useState } from 'react';
import { UserApiKeys } from '../../types';

interface ApiKeyModalProps {
  onSubmit: (keys: UserApiKeys) => void;
}

export function ApiKeyModal({ onSubmit }: ApiKeyModalProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [perplexityKey, setPerplexityKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = geminiKey.trim();
    if (!trimmed) {
      setError('A Gemini API key is required to continue.');
      return;
    }
    onSubmit({
      geminiKey: trimmed,
      perplexityKey: perplexityKey.trim() || undefined,
      groqKey: groqKey.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Enter Your API Keys
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          You've used your 3 free analyses. To continue, please provide your
          own API keys. Keys are stored locally in your browser and never sent
          to our servers except to make analysis requests on your behalf.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Gemini — required */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
              Gemini API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={e => { setGeminiKey(e.target.value); setError(''); }}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              autoFocus
            />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Get a free key at{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[var(--accent)]"
              >
                aistudio.google.com
              </a>
            </p>
          </div>

          {/* Perplexity — optional */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
              Perplexity API Key{' '}
              <span className="text-[var(--text-secondary)] font-normal">(optional — improves Sentiment)</span>
            </label>
            <input
              type="password"
              value={perplexityKey}
              onChange={e => setPerplexityKey(e.target.value)}
              placeholder="pplx-..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          {/* Groq — optional */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
              Groq API Key{' '}
              <span className="text-[var(--text-secondary)] font-normal">(optional — speeds up Tax &amp; Dividend)</span>
            </label>
            <input
              type="password"
              value={groqKey}
              onChange={e => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Free at{' '}
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[var(--accent)]"
              >
                console.groq.com
              </a>
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Save Keys &amp; Continue
          </button>
        </form>
      </div>
    </div>
  );
}
