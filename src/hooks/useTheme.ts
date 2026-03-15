import { useState, useLayoutEffect } from 'react';
import { Theme, AccessMode } from '../types';

const THEME_KEY = 'finsurf-theme';
const ACCESS_KEY = 'finsurf-access-mode';

export function useTheme() {
  // Initialize from localStorage (synchronously to avoid first-render mismatch)
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(THEME_KEY) as Theme) || 'light';
  });

  const [accessMode, setAccessMode] = useState<AccessMode>(() => {
    return (localStorage.getItem(ACCESS_KEY) as AccessMode) || 'default';
  });

useLayoutEffect(() => {
  localStorage.setItem(ACCESS_KEY, accessMode);
}, [accessMode]);

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

  return {
    theme,
    setTheme,
    toggleTheme,
    accessMode,
    setAccessMode
  };
}
