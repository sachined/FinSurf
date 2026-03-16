import React from 'react';
import { cn } from '../../utils/cn';
import { type AccessMode } from '../../types';

interface FooterProps {
  onDownloadPDF?: () => void;
  accessMode?: AccessMode;
  isDataAvailable?: boolean;
}

export function Footer({ accessMode }: FooterProps) {
  return (
    <footer className="relative z-20 pb-12 pt-4">
      <p className="text-center text-xs text-slate-400 dark:text-slate-600 font-medium">
        © {new Date().getFullYear()} FinSurf.ai · Not financial advice · For informational purposes only
      </p>
    </footer>
  );
}
