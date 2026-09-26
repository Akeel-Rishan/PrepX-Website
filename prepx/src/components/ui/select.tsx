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
        className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>
      <select
        {...rest}
        id={id}
        aria-invalid={error ? true : invalid}
        aria-describedby={[describedBy, helpId].filter(Boolean).join(' ') || undefined}
        className={cn(
          'min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-950 shadow-sm transition-[background-color,border-color,box-shadow] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-950 dark:disabled:text-slate-500',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-slate-300 dark:border-slate-700 dark:focus:border-blue-400',
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
