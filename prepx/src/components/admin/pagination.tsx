'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  basePath: string;
  currentParams: Record<string, string>;
}

export function getPaginationRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

export function buildPageUrl(
  page: number,
  basePath: string,
  params: Record<string, string>
): string {
  const searchParams = new URLSearchParams(params);
  searchParams.set('page', String(page));
  return `${basePath}?${searchParams.toString()}`;
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  basePath,
  currentParams,
}: PaginationProps): React.JSX.Element {
  const page = Math.max(1, Math.min(currentPage, totalPages || 1));
  const summary =
    totalCount === 0
      ? 'No results'
      : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`;
  const control = 'rounded-lg border px-3 py-1.5 text-sm transition-colors';
  const href = (target: number) => buildPageUrl(target, basePath, currentParams);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-1 py-3 sm:flex-row dark:border-slate-800">
      <p className="order-2 text-xs text-gray-500 sm:order-1 dark:text-slate-400">{summary}</p>
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="order-1 flex flex-wrap items-center justify-center gap-1 sm:order-2"
        >
          {page === 1 ? (
            <span aria-disabled="true" className={cn(control, 'cursor-not-allowed border-gray-200 text-gray-300 dark:border-slate-700 dark:text-slate-600')}>
              ← Prev
            </span>
          ) : (
            <Link href={href(page - 1)} className={cn(control, 'border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800')}>
              ← Prev
            </Link>
          )}
          {getPaginationRange(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400 dark:text-slate-500">
                …
              </span>
            ) : (
              <Link
                key={p}
                href={href(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors',
                  p === page
                    ? 'border-blue-600 bg-blue-600 font-medium text-white'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                )}
              >
                {p}
              </Link>
            )
          )}
          {page === totalPages ? (
            <span aria-disabled="true" className={cn(control, 'cursor-not-allowed border-gray-200 text-gray-300 dark:border-slate-700 dark:text-slate-600')}>
              Next →
            </span>
          ) : (
            <Link href={href(page + 1)} className={cn(control, 'border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800')}>
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
