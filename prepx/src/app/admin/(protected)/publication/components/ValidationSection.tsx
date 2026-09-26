'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CheckStatus, ValidationCheck } from '@/lib/publication-validator';

interface ValidationSectionProps {
  category: string;
  checks: ValidationCheck[];
  defaultOpen?: boolean;
}

const STATUS_STYLE: Record<CheckStatus, { icon: typeof CheckCircle2; color: string }> = {
  pass: { icon: CheckCircle2, color: 'text-green-600' },
  fail: { icon: XCircle, color: 'text-red-600' },
  warn: { icon: AlertTriangle, color: 'text-amber-600' },
  info: { icon: Info, color: 'text-blue-500' },
};

/** Collapsible group of publication checks with expandable affected records. */
export function ValidationSection({
  category,
  checks,
  defaultOpen = false,
}: ValidationSectionProps): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const summaryStatus = useMemo<CheckStatus>(() => {
    if (checks.some((item) => item.status === 'fail')) return 'fail';
    if (checks.some((item) => item.status === 'warn')) return 'warn';
    if (checks.some((item) => item.status === 'pass')) return 'pass';
    return 'info';
  }, [checks]);
  const summary =
    summaryStatus === 'fail'
      ? `${checks.filter((item) => item.status === 'fail').length} blocking`
      : summaryStatus === 'warn'
        ? `${checks.filter((item) => item.status === 'warn').length} warning${checks.filter((item) => item.status === 'warn').length === 1 ? '' : 's'}`
        : `${checks.filter((item) => item.status === 'pass').length}/${checks.length} passed`;
  const SummaryIcon = STATUS_STYLE[summaryStatus].icon;

  function toggleAffected(id: string): void {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <SummaryIcon
            aria-hidden="true"
            className={cn('h-5 w-5 shrink-0', STATUS_STYLE[summaryStatus].color)}
          />
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900">{category}</h3>
            <p className="text-xs text-gray-500">
              {checks.length} checks, {summary}
            </p>
          </div>
        </div>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="divide-y divide-gray-100 border-t border-gray-100 px-4 sm:px-5">
            {checks.map((item) => {
              const style = STATUS_STYLE[item.status];
              const Icon = style.icon;
              const affected = item.affectedItems ?? [];
              const showAffected = expanded.has(item.id);
              return (
                <div key={item.id} className="py-4">
                  <div className="flex items-start gap-3">
                    <Icon
                      aria-hidden="true"
                      className={cn('mt-0.5 h-4 w-4 shrink-0', style.color)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="mt-1 text-sm text-gray-600">{item.message}</p>
                      {item.detail && <p className="mt-1 text-xs text-gray-500">{item.detail}</p>}
                      {affected.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleAffected(item.id)}
                            className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                          >
                            {showAffected ? 'Hide' : 'Show'} {affected.length} affected record
                            {affected.length === 1 ? '' : 's'}
                          </button>
                          {showAffected && (
                            <div className="mt-2 space-y-1.5 border-l-2 border-gray-200 pl-3">
                              {affected.slice(0, 10).map((record, index) => (
                                <p
                                  key={`${record.label}-${index}`}
                                  className="text-xs text-gray-600"
                                >
                                  <strong className="text-gray-800">{record.label}</strong>:{' '}
                                  {record.detail}
                                </p>
                              ))}
                              {affected.length > 10 && (
                                <p className="text-xs text-gray-500">
                                  … and {affected.length - 10} more
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
