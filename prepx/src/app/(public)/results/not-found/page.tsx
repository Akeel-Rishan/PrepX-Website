import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, SearchX } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Result Not Found',
};

const checks = [
  'Enter your Index Number exactly as shown on your admission card.',
  'Include every NIC digit and the V or X suffix when applicable.',
  'Confirm that you are searching for the current examination.',
  'Confirm that your examination results have been published.',
];

export default function ResultNotFoundPage(): React.JSX.Element {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <section className="public-portal-surface w-full max-w-md rounded-2xl border border-white/90 bg-white/[0.88] p-6 shadow-[0_28px_80px_-34px_rgba(30,64,175,0.34)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/[0.88] sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
            <SearchX aria-hidden="true" strokeWidth={1.8} className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
            Result Not Found
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            The information entered does not match an available result for the current examination.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 dark:text-slate-200">
            Please check the following
          </h2>
          <ul className="mt-3 space-y-2.5">
            {checks.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2
                  aria-hidden="true"
                  strokeWidth={1.8}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                />
                <span className="text-xs leading-5 text-slate-600 dark:text-slate-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus-visible:ring-offset-slate-900"
        >
          <ArrowLeft aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
          Try Again
        </Link>
      </section>
    </div>
  );
}
