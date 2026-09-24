import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  rightElement?: ReactNode;
}

export function Input({
  label,
  id,
  error,
  hint,
  rightElement,
  className,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...rest
}: InputProps): JSX.Element {
  const helpId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          {...rest}
          id={id}
          aria-invalid={error ? true : invalid}
          aria-describedby={[describedBy, helpId].filter(Boolean).join(' ') || undefined}
          className={cn(
            'w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors',
            error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500',
            rightElement && 'pr-10',
            className
          )}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">{rightElement}</div>
        )}
      </div>
      {error && (
        <p id={helpId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={helpId} className="mt-1 text-sm text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}
