import Image from 'next/image';
import { cn } from '@/lib/utils';
import { LoadingProgress, Skeleton } from './loading-primitives';

interface LoadingMarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const markSizes = {
  sm: { frame: 'h-9 w-9', image: 22 },
  md: { frame: 'h-14 w-14', image: 34 },
  lg: { frame: 'h-[4.5rem] w-[4.5rem]', image: 44 },
};

export function LoadingMark({ size = 'md', className }: LoadingMarkProps): React.JSX.Element {
  const dimensions = markSizes[size];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'app-loading-mark relative inline-grid shrink-0 place-items-center rounded-2xl bg-[#17204f] shadow-lg shadow-blue-950/15',
        dimensions.frame,
        className
      )}
    >
      <span className="app-loading-mark-ring absolute -inset-1.5 rounded-[1.2rem]" />
      <Image
        src="/brand/prepx-mark.png"
        alt=""
        width={dimensions.image}
        height={dimensions.image}
        className="app-loading-mark-logo relative h-auto w-auto object-contain"
      />
    </span>
  );
}

export function AppLoadingScreen(): React.JSX.Element {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="app-loading-enter grid min-h-[100dvh] place-items-center bg-[var(--app-canvas)] px-5 text-center text-[var(--app-text)]"
    >
      <div className="flex max-w-xs flex-col items-center">
        <LoadingMark size="lg" />
        <p className="mt-6 text-base font-bold tracking-tight">Preparing PrepX</p>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">Loading your secure workspace...</p>
        <LoadingProgress className="mt-5 w-48" />
      </div>
    </main>
  );
}

export function PublicPageSkeleton(): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="app-loading-enter flex flex-1 px-5 py-10 sm:px-8 lg:px-10 lg:py-14"
    >
      <span className="sr-only">Loading examination portal...</span>
      <div
        aria-hidden="true"
        className="mx-auto grid w-full max-w-[1380px] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(430px,530px)] lg:gap-16 xl:gap-24"
      >
        <div className="space-y-6">
          <Skeleton className="h-4 w-40" rounded="full" />
          <div className="space-y-3">
            <Skeleton className="h-12 w-[88%] max-w-xl" />
            <Skeleton className="h-12 w-[62%] max-w-md" />
          </div>
          <div className="space-y-2 pt-1">
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-[78%] max-w-lg" />
          </div>
          <div className="grid max-w-2xl gap-4 border-t border-slate-200/70 pt-7 dark:border-slate-800 sm:grid-cols-2">
            <Skeleton className="h-20" rounded="xl" />
            <Skeleton className="h-20" rounded="xl" />
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 shadow-[var(--app-shadow)] dark:border-slate-800 dark:bg-slate-900/75">
          <div className="flex items-center gap-4 border-b border-slate-200/80 p-6 dark:border-slate-800">
            <Skeleton className="h-11 w-11 shrink-0" rounded="xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-[70%]" />
            </div>
          </div>
          <div className="space-y-5 p-6 sm:p-7">
            <Skeleton className="h-11 w-full" rounded="xl" />
            <Skeleton className="h-14 w-full" rounded="xl" />
            <Skeleton className="h-14 w-full" rounded="xl" />
          </div>
          <LoadingProgress />
        </div>
      </div>
    </div>
  );
}

export function AdminPageSkeleton(): React.JSX.Element {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="app-loading-enter mx-auto max-w-7xl space-y-6">
      <span className="sr-only">Loading page...</span>
      <div aria-hidden="true" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <LoadingProgress />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-36" rounded="xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
          <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
            <Skeleton className="h-6 w-44" />
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48" rounded="xl" />
            <Skeleton className="h-40" rounded="xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResultPageSkeleton({ className }: { className?: string }): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn('result-loading app-loading-enter mx-auto w-full max-w-3xl px-3 py-6 sm:px-6 sm:py-10', className)}
    >
      <span className="sr-only">Loading result...</span>
      <div aria-hidden="true" className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 shadow-[var(--app-shadow)] dark:border-slate-800 dark:bg-slate-900/80">
        <div className="space-y-3 bg-[#17204f] px-5 py-7 sm:px-7">
          <Skeleton className="app-skeleton-inverse h-5 w-24" rounded="full" />
          <Skeleton className="app-skeleton-inverse h-8 w-56" />
          <Skeleton className="app-skeleton-inverse h-4 w-40" />
        </div>
        <div className="space-y-6 p-5 sm:p-7">
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
          <Skeleton className="h-56 w-full" rounded="xl" />
          <Skeleton className="h-20 w-full" rounded="xl" />
        </div>
        <LoadingProgress />
      </div>
    </div>
  );
}
