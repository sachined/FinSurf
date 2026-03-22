
export function Footer() {
  return (
    <footer className="relative z-20 pb-12 pt-4">
      <p className="text-center text-xs text-slate-400 dark:text-slate-600 font-medium">
        © {new Date().getFullYear()} FinSurf.ai · Not financial advice · For informational purposes only ·{' '}
        <a href="/blog" className="hover:text-slate-600 dark:hover:text-slate-400 transition-colors underline-offset-2 hover:underline">
          Blog
        </a>
      </p>
    </footer>
  );
}
