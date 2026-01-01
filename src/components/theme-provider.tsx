import { createContext, useContext, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'smartpick-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => {
      // Always use light theme
      logger.debug('[ThemeProvider init] Forcing light theme');
      return 'light';
    }
  );

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Always apply light theme
    root.classList.remove('light', 'dark');
    root.classList.add('light');
    logger.debug('[ThemeProvider] Light theme applied');
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      logger.debug('[ThemeProvider] setTheme called:', { old: theme, new: newTheme });
      localStorage.setItem(storageKey, newTheme);
      setThemeState(newTheme);
      
      // Force immediate DOM update as backup
      setTimeout(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        if (newTheme !== 'system') {
          root.classList.add(newTheme);
          logger.debug('[ThemeProvider] Force applied class:', newTheme, 'Classes:', root.className);
        }
      }, 0);
      
      logger.debug('[ThemeProvider] Theme updated, localStorage:', localStorage.getItem(storageKey));
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
