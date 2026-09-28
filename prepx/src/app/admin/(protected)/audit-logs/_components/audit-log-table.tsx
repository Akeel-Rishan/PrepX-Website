'use client';

import { useState } from 'react';
import { ExternalLink, ScrollText } from 'lucide-react';
import { Pagination } from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { AUDIT_ACTION_META, getAuditSummary } from '@/lib/audit-actions';
import type { AuditLog } from '@/types';

interface AuditLogTableProps {
  logs: AuditLog[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  currentParams: Record<string, string>;
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Colombo',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const FULL_DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Colombo',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const TIME_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Colombo',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

function formatDate(value: string): string {
  return DATE_FORMAT.format(new Date(value));
}

function formatTime(value: string): string {
  return TIME_FORMAT.format(new Date(value));
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return `${FULL_DATE_FORMAT.format(date)}, ${TIME_FORMAT.format(date)}`;
}

function EntityDisplay({ log }: { log: AuditLog }): React.JSX.Element {
  const typeLabel = log.entity_type
    ? log.entity_type
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : 'Not recorded';
  const shortId = log.entity_id ? `${log.entity_id.slice(0, 8)}…` : null;

  return (
    <div>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{typeLabel}</span>
      {shortId && (
        <div className="mt-0.5 font-mono text-xs text-slate-400 dark:text-slate-500">{shortId}</div>
      )}
    </div>
  );
}

function JsonBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: NonNullable<AuditLog['old_value']>;
  tone: 'previous' | 'new';
}): React.JSX.Element {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <pre
        className={
          tone === 'new'
            ? 'max-h-64 overflow-auto rounded-xl border border-blue-200 bg-blue-50 p-3 font-mono text-xs leading-5 text-slate-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-100'
            : 'max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
        }
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export function AuditLogTable({
  logs,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  currentParams,
}: AuditLogTableProps): React.JSX.Element {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
        <ScrollText
          aria-hidden="true"
          className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600"
        />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No audit log entries match your filters.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--app-shadow)] dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50">
              <tr>
                {['Time', 'Action', 'Entity', 'Summary'].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400"
                  >
                    {heading}
                  </th>
                ))}
                <th scope="col" className="px-5 py-3 text-right">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => {
                const meta = AUDIT_ACTION_META[log.action];
                const summary = getAuditSummary(log.action, log.new_value, log.old_value);
                return (
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {formatDate(log.created_at)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        {formatTime(log.created_at)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge variant={meta?.badgeVariant ?? 'default'}>
                          {meta?.label ?? log.action}
                        </Badge>
                        <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                          {log.action}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <EntityDisplay log={log} />
                    </td>
                    <td className="px-5 py-4">
                      <p
                        className="max-w-[260px] truncate text-sm text-slate-600 dark:text-slate-300"
                        title={summary}
                      >
                        {summary}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-500 dark:hover:bg-blue-950/50 dark:hover:text-blue-300"
                        aria-label={`View details for ${meta?.label ?? log.action}`}
                        title="View details"
                      >
                        <ExternalLink aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 dark:border-slate-800 dark:bg-slate-950/30">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {totalCount.toLocaleString()} total event{totalCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="px-5">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            basePath="/admin/audit-logs"
            currentParams={currentParams}
          />
        </div>
      </div>

      <Modal
        isOpen={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
        title={
          selectedLog
            ? (AUDIT_ACTION_META[selectedLog.action]?.label ?? selectedLog.action)
            : 'Audit log details'
        }
        description={selectedLog ? formatDateTime(selectedLog.created_at) : undefined}
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-5">
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Action code
                </dt>
                <dd className="break-all font-mono text-xs text-slate-700 dark:text-slate-200">
                  {selectedLog.action}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Entity type
                </dt>
                <dd className="capitalize text-slate-900 dark:text-slate-100">
                  {selectedLog.entity_type?.replaceAll('_', ' ') ?? 'Not recorded'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Entity ID
                </dt>
                <dd className="break-all font-mono text-xs text-slate-600 dark:text-slate-300">
                  {selectedLog.entity_id ?? 'Not recorded'}
                </dd>
              </div>
              {selectedLog.admin_id && (
                <div>
                  <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Administrator ID
                  </dt>
                  <dd className="break-all font-mono text-xs text-slate-600 dark:text-slate-300">
                    {selectedLog.admin_id}
                  </dd>
                </div>
              )}
              {selectedLog.ip_address && (
                <div>
                  <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    IP address
                  </dt>
                  <dd className="font-mono text-xs text-slate-600 dark:text-slate-300">
                    {selectedLog.ip_address}
                  </dd>
                </div>
              )}
            </dl>

            {selectedLog.old_value !== null && (
              <JsonBlock label="Previous value" value={selectedLog.old_value} tone="previous" />
            )}
            {selectedLog.new_value !== null && (
              <JsonBlock label="New value" value={selectedLog.new_value} tone="new" />
            )}
            {selectedLog.old_value === null && selectedLog.new_value === null && (
              <p className="py-3 text-center text-sm text-slate-400 dark:text-slate-500">
                No value changes were recorded for this event.
              </p>
            )}

            <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
