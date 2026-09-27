'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean | 'true' | 'false';
  className?: string;
  menuClassName?: string;
  compact?: boolean;
  align?: 'left' | 'right';
  onValueChange?: (value: string) => void;
}

interface MenuPosition extends CSSProperties {
  top: number;
  left: number;
  minWidth: number;
  maxWidth: number;
}

function firstEnabledIndex(options: DropdownOption[]): number {
  return options.findIndex((option) => !option.disabled);
}

function nextEnabledIndex(options: DropdownOption[], current: number, direction: 1 | -1): number {
  if (!options.length) return -1;
  let next = current;
  for (let count = 0; count < options.length; count += 1) {
    next = (next + direction + options.length) % options.length;
    if (!options[next]?.disabled) return next;
  }
  return current;
}

/** Accessible, portal-backed listbox used by admin filters and forms. */
export function Dropdown({
  id,
  name,
  value,
  defaultValue = '',
  options,
  placeholder = 'Select an option',
  disabled = false,
  required = false,
  ariaLabel,
  ariaDescribedBy,
  ariaInvalid,
  className,
  menuClassName,
  compact = false,
  align = 'left',
  onValueChange,
}: DropdownProps): React.JSX.Element {
  const generatedId = useId();
  const controlId = id ?? `dropdown-${generatedId.replace(/:/g, '')}`;
  const listboxId = `${controlId}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    minWidth: 0,
    maxWidth: 0,
  });
  const selectedValue = value ?? internalValue;
  const selectedIndex = options.findIndex((option) => option.value === selectedValue);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const choose = useCallback(
    (option: DropdownOption) => {
      if (option.disabled) return;
      if (value === undefined) setInternalValue(option.value);
      onValueChange?.(option.value);
      close();
      requestAnimationFrame(() => triggerRef.current?.focus());
    },
    [close, onValueChange, value]
  );

  const openMenu = useCallback(
    (preferredIndex?: number) => {
      if (disabled || options.length === 0) return;
      const fallback = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex(options);
      setActiveIndex(preferredIndex ?? fallback);
      setOpen(true);
    },
    [disabled, options, selectedIndex]
  );

  const updatePosition = useCallback(() => {
    if (!open || !triggerRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const viewportPadding = 8;
    const menuWidth = Math.min(
      Math.max(trigger.width, menuRef.current?.offsetWidth ?? trigger.width),
      window.innerWidth - viewportPadding * 2
    );
    const menuHeight = menuRef.current?.offsetHeight ?? Math.min(options.length * 44 + 12, 288);
    const roomBelow = window.innerHeight - trigger.bottom - viewportPadding;
    const showAbove = roomBelow < menuHeight + 6 && trigger.top > roomBelow;
    const preferredLeft = align === 'right' ? trigger.right - menuWidth : trigger.left;
    const left = Math.min(
      Math.max(viewportPadding, preferredLeft),
      window.innerWidth - menuWidth - viewportPadding
    );
    const top = showAbove
      ? Math.max(viewportPadding, trigger.top - menuHeight - 6)
      : Math.min(trigger.bottom + 6, window.innerHeight - menuHeight - viewportPadding);

    setMenuPosition({
      top,
      left,
      minWidth: trigger.width,
      maxWidth: window.innerWidth - viewportPadding * 2,
    });
  }, [align, open, options.length]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(frame);
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent): void {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    }

    function handleViewportChange(event: Event): void {
      if (event.type === 'scroll' && menuRef.current?.contains(event.target as Node)) return;
      close();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [close, open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    menuRef.current
      ?.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  useEffect(
    () => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    },
    []
  );

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (!open) {
        const edge = direction === 1 ? -1 : 0;
        openMenu(nextEnabledIndex(options, selectedIndex >= 0 ? selectedIndex : edge, direction));
      } else {
        setActiveIndex((current) => nextEnabledIndex(options, current, direction));
      }
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const start = event.key === 'Home' ? -1 : 0;
      openMenu(nextEnabledIndex(options, start, event.key === 'Home' ? 1 : -1));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open && activeIndex >= 0) choose(options[activeIndex]);
      else openMenu();
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
      return;
    }
    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      searchRef.current += event.key.toLowerCase();
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        searchRef.current = '';
      }, 500);
      const match = options.findIndex(
        (option) => !option.disabled && option.label.toLowerCase().startsWith(searchRef.current)
      );
      if (match >= 0) {
        event.preventDefault();
        if (open) setActiveIndex(match);
        else choose(options[match]);
      }
    }
  }

  const menu = open ? (
    <div
      ref={menuRef}
      id={listboxId}
      role="listbox"
      aria-label={ariaLabel}
      aria-activedescendant={activeIndex >= 0 ? `${controlId}-option-${activeIndex}` : undefined}
      className={cn(
        'fixed z-[100] max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-[0_18px_48px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_20px_54px_rgba(0,0,0,0.45)]',
        menuClassName
      )}
      style={menuPosition}
    >
      {options.map((option, index) => {
        const selected = option.value === selectedValue;
        const active = index === activeIndex;
        return (
          <button
            key={`${option.value}-${index}`}
            id={`${controlId}-option-${index}`}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={option.disabled}
            data-option-index={index}
            onPointerMove={() => !option.disabled && setActiveIndex(index)}
            onClick={() => choose(option)}
            className={cn(
              'flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none',
              active && 'bg-blue-50 text-blue-900 dark:bg-blue-950/70 dark:text-blue-100',
              selected && 'font-semibold',
              option.disabled && 'cursor-not-allowed opacity-45'
            )}
          >
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            <Check
              aria-hidden="true"
              className={cn(
                'h-4 w-4 shrink-0 text-blue-600',
                selected ? 'opacity-100' : 'opacity-0'
              )}
            />
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={
          open && activeIndex >= 0 ? `${controlId}-option-${activeIndex}` : undefined
        }
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={handleKeyDown}
        className={cn(
          'inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-left text-sm font-medium text-slate-800 shadow-sm transition-[background-color,border-color,box-shadow] hover:border-slate-400 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/20 dark:disabled:bg-slate-950 dark:disabled:text-slate-500',
          compact && 'min-h-9 rounded-lg px-2.5 py-1.5 text-xs',
          className
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', !selectedOption && 'text-slate-500')}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'h-4 w-4 shrink-0 text-slate-500 transition-transform duration-150',
            open && 'rotate-180'
          )}
        />
      </button>
      {menu && typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </>
  );
}
