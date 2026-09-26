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
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <textarea
        {...rest}
        id={id}
        aria-invalid={error ? true : invalid}
        aria-describedby={[describedBy, helpId].filter(Boolean).join(' ') || undefined}
        className={cn(
          'min-h-[100px] w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 transition-colors',
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500',
          className
        )}
      />
      {error && <p id={helpId} className="mt-1 text-sm text-red-600">{error}</p>}
      {!error && hint && <p id={helpId} className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}
