import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Results Not Published',
};

export default function ResultsNotPublishedPage(): React.JSX.Element {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <section className="public-portal-surface w-full max-w-md rounded-2xl border border-white/90 bg-white/[0.88] p-5 text-center sm:p-8 shadow-[0_28px_80px_-34px_rgba(30,64,175,0.34)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/[0.88]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
          <Clock3 aria-hidden="true" strokeWidth={1.8} className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
          Results Not Yet Published
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Results for this examination have not been officially released. Please check back after
          the announcement.
        </p>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/70 dark:bg-amber-950/30">
          <p className="text-xs leading-5 text-amber-800 dark:text-amber-200">
            Contact your school or examination center for information about when results will be
            available.
          </p>
        </div>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
        >
          <ArrowLeft aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
          Back to Home
        </Link>
      </section>
    </div>
  );
}
