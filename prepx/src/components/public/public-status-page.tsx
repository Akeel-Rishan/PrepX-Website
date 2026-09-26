import type { ComponentType, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface PublicStatusPageProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  children?: ReactNode;
}

/** Consistent public-facing frame for the result portal and its status pages. */
export function PublicStatusPage({
  icon: Icon,
  label,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref = '/',
  secondaryLabel = 'Back to home',
  children,
}: PublicStatusPageProps): React.JSX.Element {
  return (
    <div className="flex min-h-[100dvh] items-center px-4 py-20 sm:px-6">
      <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--app-shadow)] dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-[#0b172a] px-6 py-5 dark:border-slate-800 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-slate-950 p-1.5">
              <Image
                src="/brand/prepx-mark.png"
                alt=""
                aria-hidden="true"
                width={44}
                height={44}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-white">PrepX</p>
              <p className="text-xs text-slate-400">Examination Results Portal</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-10 sm:px-10 sm:py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
            <Icon aria-hidden="true" className="h-6 w-6" />
          </div>
          <p className="mt-6 text-sm font-semibold text-blue-600 dark:text-blue-400">{label}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {description}
          </p>
          {children && <div className="mt-6">{children}</div>}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {primaryHref && primaryLabel && (
              <Link
                href={primaryHref}
                className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] active:scale-[0.98] hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:ring-offset-slate-900"
              >
                {primaryLabel}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
            <Link
              href={secondaryHref}
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition-[background-color,border-color,transform] active:scale-[0.98] hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
