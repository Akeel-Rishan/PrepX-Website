'use client';

import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  appearance?: 'default' | 'inverse';
}

/** Toggles and persists the application color theme. */
export function ThemeToggle({
  className,
  appearance = 'default',
}: ThemeToggleProps): React.JSX.Element {
  function toggleTheme(): void {
    const nextDark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', nextDark);
    document.documentElement.style.colorScheme = nextDark ? 'dark' : 'light';
    try {
      localStorage.setItem('prepx-theme', nextDark ? 'dark' : 'light');
    } catch {
      // The visual theme still works when browser storage is unavailable.
    }
  }

  const label = 'Toggle color theme';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-[background-color,border-color,color,transform] duration-150 active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        appearance === 'inverse'
          ? 'border border-white/15 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-offset-slate-950'
          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white dark:focus-visible:ring-offset-slate-900',
        className
      )}
    >
      <Moon aria-hidden="true" className="h-4 w-4 dark:hidden" />
      <Sun aria-hidden="true" className="hidden h-4 w-4 dark:block" />
    </button>
  );
}
