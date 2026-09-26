import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  className?: string;
  children: ReactNode;
}

export function Card({ className, children }: CardProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: CardProps): React.JSX.Element {
  return <div className={cn('mb-6', className)}>{children}</div>;
}

export function CardContent({ className, children }: CardProps): React.JSX.Element {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }: CardProps): React.JSX.Element {
  return (
    <div className={cn('mt-6 border-t border-gray-100 pt-4 dark:border-slate-800', className)}>
      {children}
    </div>
  );
}
