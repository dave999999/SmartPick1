import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="secondary"
        size="icon"
        disabled
        className="rounded-full shadow-xl bg-black/70 backdrop-blur-md border border-white/10"
      >
        <Sun className="h-5 w-5 text-yellow-400" />
      </Button>
    );
  }

  // Determine current effective theme
  const resolvedTheme = theme === 'system' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    // Always toggle between light and dark explicitly (not system)
    const newTheme = isDark ? 'light' : 'dark';
    logger.debug('Toggle theme:', { current: theme, resolved: resolvedTheme, isDark, newTheme });
    setTheme(newTheme);
  };

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={toggleTheme}
      className="rounded-full shadow-xl bg-white/90 dark:bg-black/70 backdrop-blur-md border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-black/80 transition-all active:scale-95"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-yellow-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="h-5 w-5 text-gray-700 transition-transform duration-200 hover:-rotate-12" />
      )}
    </Button>
  );
}
