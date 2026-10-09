'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { ResultCard } from '@/components/public/result-card';
import { isPublicStudentResult } from '@/lib/public-result';
import type { PublicStudentResult } from '@/types';

type DisplayState =
  { status: 'loading' } | { status: 'missing' } | { status: 'ready'; result: PublicStudentResult };

export function ResultDisplay(): React.JSX.Element {
  const [state, setState] = useState<DisplayState>({ status: 'loading' });

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('prepx_result');
      if (!stored) {
        setState({ status: 'missing' });
        return;
      }
      sessionStorage.removeItem('prepx_result');
      const parsed: unknown = JSON.parse(stored);
      setState(
        isPublicStudentResult(parsed) ? { status: 'ready', result: parsed } : { status: 'missing' }
      );
    } catch {
      setState({ status: 'missing' });
    }
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="mx-auto w-full max-w-4xl animate-pulse rounded-3xl border border-slate-200/90 bg-white/80 p-8 dark:border-white/10 dark:bg-[#0b1424]/90">
        <div className="h-6 w-48 rounded-lg bg-slate-200 dark:bg-white/10" />
        <div className="mt-4 h-10 w-72 max-w-full rounded-lg bg-slate-200 dark:bg-white/10" />
        <div className="mt-8 h-64 rounded-2xl bg-slate-100 dark:bg-white/[0.06]" />
        <span className="sr-only">Loading result</span>
      </div>
    );
  }

  if (state.status === 'missing') {
    return (
      <section className="public-portal-surface mx-auto w-full max-w-md rounded-3xl border border-slate-200/90 bg-white/95 p-8 text-center shadow-[0_28px_80px_-34px_rgba(30,64,175,0.4)] dark:border-white/10 dark:bg-[#0b1424]/95">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-400/[0.08] dark:text-blue-400">
          <FileQuestion aria-hidden="true" strokeWidth={1.8} className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">No result loaded</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Search with your Index Number or NIC Number to securely load your examination result.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0b1424]"
        >
          <ArrowLeft aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
          Go to result search
        </Link>
      </section>
    );
  }

  return <ResultCard result={state.result} />;
}
