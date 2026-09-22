import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('phase10_theme') as Theme) || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('phase10_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.className = 'bg-phase-darkBg text-white antialiased select-none overflow-x-hidden font-sans';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.className = 'bg-slate-100 text-slate-900 antialiased select-none overflow-x-hidden font-sans';
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark'
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
