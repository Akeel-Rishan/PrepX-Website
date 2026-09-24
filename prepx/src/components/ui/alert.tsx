'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}

const variants = {
  success: { classes: 'bg-green-50 border-green-200 text-green-800', icon: CheckCircle },
  error: { classes: 'bg-red-50 border-red-200 text-red-800', icon: XCircle },
  warning: { classes: 'bg-amber-50 border-amber-200 text-amber-800', icon: AlertTriangle },
  info: { classes: 'bg-blue-50 border-blue-200 text-blue-800', icon: Info },
};

export function Alert({ variant, title, children, className, onClose }: AlertProps): JSX.Element {
  const { classes, icon: Icon } = variants[variant];
  return (
    <div role="alert" className={cn('rounded-lg border p-4 flex gap-3', classes, className)}>
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="mb-1 text-sm font-semibold">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className="self-start rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
