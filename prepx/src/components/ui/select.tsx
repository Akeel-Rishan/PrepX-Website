'use client';

import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';

export type SelectOption = DropdownOption;

interface SelectProps {
  id: string;
  name?: string;
  label: string;
  placeholder?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
}

export function Select({
  id,
  name,
  label,
  placeholder,
  options,
  error,
  hint,
  value,
  defaultValue,
  disabled,
  required,
  className,
  onValueChange,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: SelectProps): React.JSX.Element {
  const helpId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const ariaDescribedBy = [describedBy, helpId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>
      <Dropdown
        id={id}
        name={name}
        value={value}
        defaultValue={defaultValue}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        ariaLabel={label}
        ariaDescribedBy={ariaDescribedBy}
        ariaInvalid={error ? true : invalid}
        onValueChange={onValueChange}
        className={className}
      />
      {error && (
        <p id={helpId} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={helpId} className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}
