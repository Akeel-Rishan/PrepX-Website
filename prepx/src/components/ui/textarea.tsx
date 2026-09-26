import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
  error?: string;
  hint?: string;
}

export function Textarea({
  label,
  id,
  error,
  hint,
  className,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...rest
}: TextareaProps): React.JSX.Element {
  const helpId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>
      <textarea
        {...rest}
        id={id}
        aria-invalid={error ? true : invalid}
        aria-describedby={[describedBy, helpId].filter(Boolean).join(' ') || undefined}
        className={cn(
          'min-h-[112px] w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-950 shadow-sm placeholder:text-slate-500 transition-[background-color,border-color,box-shadow] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:disabled:bg-slate-950 dark:disabled:text-slate-500',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-slate-300 dark:border-slate-700 dark:focus:border-blue-400',
          className
        )}
      />
      {error && (
        <p id={helpId} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={helpId} className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}
