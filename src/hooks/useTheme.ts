import { useState, useEffect } from 'react';
import { Theme, AccessMode } from '../types';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  const [accessMode, setAccessMode] = useState<AccessMode>('default');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
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
