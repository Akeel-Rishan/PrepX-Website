import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  placeholder?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
}

export function Select({
  id,
  label,
  placeholder,
  options,
  error,
  hint,
  className,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...rest
}: SelectProps): React.JSX.Element {
  const helpId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200"
      >
        {label}
      </label>
      <select
        {...rest}
        id={id}
        aria-invalid={error ? true : invalid}
        aria-describedby={[describedBy, helpId].filter(Boolean).join(' ') || undefined}
        className={cn(
          'w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-50 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900 dark:disabled:text-slate-500',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:ring-blue-500 dark:border-slate-700',
          className
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(({ value, label: optionLabel, disabled }) => (
          <option key={value} value={value} disabled={disabled}>
            {optionLabel}
          </option>
        ))}
      </select>
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
