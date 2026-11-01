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
  lg: { frame: 'h-18 w-18', image: 44 },
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
      className="app-loading-enter grid min-h-dvh place-items-center bg-(--app-canvas) px-5 text-center text-(--app-text)"
    >
      <div className="flex max-w-xs flex-col items-center">
        <LoadingMark size="lg" />
        <p className="mt-6 text-base font-bold tracking-tight">Preparing PrepX</p>
        <p className="mt-1 text-sm text-(--app-text-muted)">Loading your secure workspace...</p>
        <LoadingProgress className="mt-5 w-48" />
      </div>
    </main>
  );
}

export function AdminPageSkeleton(): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="app-loading-enter mx-auto max-w-7xl space-y-6"
    >
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
