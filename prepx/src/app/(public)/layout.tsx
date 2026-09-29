import type { Metadata } from 'next';
import Image from 'next/image';
import type { ReactNode } from 'react';
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

      <header className="public-portal-surface relative z-10 border-b border-white/80 bg-white/75 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/[0.72]">
        <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#17204f] p-1.5 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10">
              <Image
                src="/brand/prepx-mark.png"
                alt=""
                aria-hidden="true"
                width={40}
                height={40}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold tracking-tight text-slate-950 dark:text-white">
                PrepX
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Examination Results Portal
              </p>
            </div>
          </div>

          <ThemeToggle className="ml-4" />
        </div>
      </header>

      <main className="relative z-0 flex min-w-0 flex-1 flex-col [overflow-wrap:anywhere]">{children}</main>

      <footer className="public-portal-surface relative z-10 border-t border-white/80 bg-white/70 px-4 py-6 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/[0.72]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-center sm:px-2 md:flex-row md:items-end md:justify-between md:text-left">
          <p className="max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
            Results displayed here are official and final as published. Contact your school&apos;s
            examination coordinator for queries or corrections.
          </p>
          <p className="text-xs text-slate-400 md:shrink-0 dark:text-slate-500">
            &copy; {currentYear} PrepX Examination System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
