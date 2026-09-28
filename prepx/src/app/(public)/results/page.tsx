import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Result Display',
};

export default function ResultsPage(): React.JSX.Element {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <section className="public-portal-surface w-full max-w-md rounded-2xl border border-white/90 bg-white/[0.88] p-8 text-center shadow-[0_28px_80px_-34px_rgba(30,64,175,0.34)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/[0.88]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
          <FileText aria-hidden="true" strokeWidth={1.8} className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">Result Display</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          The full result display with the grades table will be completed in the next result phase.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
        >
          <ArrowLeft aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
          Back to Search
        </Link>
      </section>
    </div>
  );
}
