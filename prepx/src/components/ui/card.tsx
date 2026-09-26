import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  className?: string;
  children: ReactNode;
}

export function Card({ className, children }: CardProps): React.JSX.Element {
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200 p-6', className)}>
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
  return <div className={cn('mt-6 pt-4 border-t border-gray-100', className)}>{children}</div>;
}
