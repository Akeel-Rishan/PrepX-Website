'use client';

import { useRef, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
import { LoadingProgress } from '@/components/ui/loading-primitives';
import { AUDIT_ACTION_GROUPS, AUDIT_ACTION_META, ENTITY_TYPE_OPTIONS } from '@/lib/audit-actions';

interface AuditLogFilterBarProps {
  initialAction: string;
  initialEntityType: string;
  initialDateFrom: string;
  initialDateTo: string;
}

const ACTION_OPTIONS: DropdownOption[] = [
  { value: '', label: 'All Actions' },
  ...AUDIT_ACTION_GROUPS.flatMap((group, index) => [
    { value: `__group-${index}`, label: group.group, disabled: true, isGroup: true },
    ...group.actions.map((action) => ({
      value: action,
      label: AUDIT_ACTION_META[action]?.label ?? action,
    })),
  ]),
];

export function AuditLogFilterBar({
  initialAction,
  initialEntityType,
  initialDateFrom,
  initialDateTo,
}: AuditLogFilterBarProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const filters = useRef({
    action: initialAction,
    entityType: initialEntityType,
    dateFrom: initialDateFrom,
    dateTo: initialDateTo,
  });

  function navigate(updates: Partial<typeof filters.current>): void {
    filters.current = { ...filters.current, ...updates };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters.current)) {
      if (value) params.set(key, value);
    }
    const destination = params.size ? `${pathname}?${params.toString()}` : pathname;
    startTransition(() => router.push(destination));
  }

  const hasFilters = Boolean(
    initialAction || initialEntityType || initialDateFrom || initialDateTo
  );
  const dateClass =
    'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none transition-[border-color,box-shadow] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 sm:w-auto';

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[var(--app-shadow)] dark:border-slate-800 dark:bg-slate-900"
      aria-busy={isPending || undefined}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-end">
        <div className="min-w-0 flex-1 xl:min-w-[220px]">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Action
          </label>
          <Dropdown
            ariaLabel="Filter by action"
            value={initialAction}
            options={ACTION_OPTIONS}
            onValueChange={(action) => navigate({ action })}
          />
        </div>
        <div className="min-w-0 flex-1 xl:min-w-[190px]">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Entity
          </label>
          <Dropdown
            ariaLabel="Filter by entity type"
            value={initialEntityType}
            options={ENTITY_TYPE_OPTIONS.map((option) => ({ ...option }))}
            onValueChange={(entityType) => navigate({ entityType })}
          />
        </div>
        <div>
          <label
            htmlFor="audit-date-from"
            className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            From
          </label>
          <input
            id="audit-date-from"
            type="date"
            value={initialDateFrom}
            onChange={(event) => navigate({ dateFrom: event.target.value })}
            className={dateClass}
          />
        </div>
        <div>
          <label
            htmlFor="audit-date-to"
            className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            To
          </label>
          <input
            id="audit-date-to"
            type="date"
            value={initialDateTo}
            onChange={(event) => navigate({ dateTo: event.target.value })}
            className={dateClass}
          />
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              filters.current = { action: '', entityType: '', dateFrom: '', dateTo: '' };
              startTransition(() => router.push(pathname));
            }}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X aria-hidden="true" className="h-4 w-4" />
            Clear filters
          </button>
        )}
      </div>
      {isPending && <LoadingProgress className="absolute inset-x-0 bottom-0" />}
    </div>
  );
}
