import { useState, useLayoutEffect } from 'react';
import { Theme } from '../types';

const THEME_KEY = 'finsurf-theme';

export function useTheme() {
  // Initialize from localStorage (synchronously to avoid first-render mismatch)
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(THEME_KEY) as Theme) || 'light';
  });

useLayoutEffect(() => {
  const root = window.document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return { theme, setTheme, toggleTheme };
}
