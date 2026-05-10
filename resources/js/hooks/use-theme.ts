import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zoion_theme') as Theme;
      return saved || 'system';
    }
    return 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystem = () => {
        root.classList.toggle('dark', mediaQuery.matches);
      };
      applySystem();
      mediaQuery.addEventListener('change', applySystem);
      return () => mediaQuery.removeEventListener('change', applySystem);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
    
    localStorage.setItem('zoion_theme', theme);
  }, [theme]);

  return { theme, setTheme };
}