import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rounded?: 'md' | 'lg' | 'xl' | 'full';
}

const skeletonRadius = {
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  full: 'rounded-full',
};

export function Skeleton({
  className,
  rounded = 'lg',
  ...props
}: SkeletonProps): React.JSX.Element {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn('app-skeleton', skeletonRadius[rounded], className)}
    />
  );
}

export function LoadingProgress({ className }: { className?: string }): React.JSX.Element {
  return <span aria-hidden="true" className={cn('app-loading-progress block', className)} />;
}

interface LoadingStatusProps {
  label: string;
  detail?: string;
  compact?: boolean;
  className?: string;
}

export function LoadingStatus({
  label,
  detail,
  compact = false,
  className,
}: LoadingStatusProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'app-loading-enter flex items-center gap-3 text-slate-700 dark:text-slate-200',
        compact
          ? 'py-1'
          : 'rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80',
        className
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
      >
        <Spinner size="sm" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        {detail && (
          <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
        )}
        <LoadingProgress className="mt-2 max-w-48" />
      </div>
    </div>
  );
}
