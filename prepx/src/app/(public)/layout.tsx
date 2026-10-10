import type { Metadata } from 'next';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { ResultProvider } from '@/components/public/result-provider';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: {
    default: 'Examination Results | PrepX',
    template: '%s | PrepX',
  },
  description: 'O/L Model Examination Results Portal for students and parents.',
};

export default function PublicLayout({
  children,
}: Readonly<{ children: ReactNode }>): React.JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <div className="public-portal-background theme-content flex min-h-[100dvh] flex-col text-slate-900 transition-colors dark:text-slate-100">
      <div aria-hidden="true" className="h-1 shrink-0 bg-blue-600" />

      <header className="public-portal-surface relative z-10 border-b border-white/80 bg-white/75 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#050a14]/80">
        <div className="mx-auto flex h-[82px] w-full max-w-[1380px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-blue-200/80 bg-[#17204f] p-1.5 shadow-lg shadow-blue-950/10 dark:border-white/[0.08] dark:bg-white/[0.06]">
              <Image
                src="/brand/prepx-mark.png"
                alt=""
                aria-hidden="true"
                width={48}
                height={48}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                  PrepX
                </p>
                <span className="hidden rounded-full border border-blue-300/60 bg-blue-100/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700 dark:border-blue-400/15 dark:bg-blue-400/[0.08] dark:text-blue-300 sm:inline-flex">
                  Official
                </span>
              </div>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Examination Results Portal
              </p>
            </div>
          </div>

          <ThemeToggle className="ml-4" />
        </div>
      </header>

      <main className="relative z-0 flex flex-1 flex-col">
        <ResultProvider>{children}</ResultProvider>
      </main>

      <footer className="public-portal-surface relative z-10 border-t border-white/80 bg-white/70 px-4 py-6 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#050a14]/80">
        <div className="mx-auto flex max-w-[1380px] flex-col gap-2 text-center sm:px-4 md:flex-row md:items-end md:justify-between md:text-left">
          <p className="max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
            Results displayed here are official and final as published. Contact your school&apos;s
            examination coordinator for queries or corrections.
          </p>
          <p className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
            &copy; {currentYear} PrepX Examination System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
