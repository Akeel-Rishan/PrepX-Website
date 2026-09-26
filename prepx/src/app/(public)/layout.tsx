import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function PublicLayout({
  children,
}: Readonly<{ children: ReactNode }>): React.JSX.Element {
  return (
    <main className="theme-content relative min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="fixed right-4 top-4 z-40">
        <ThemeToggle />
      </div>
      {children}
    </main>
  );
}
