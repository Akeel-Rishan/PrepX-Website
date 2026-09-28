import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AUDIT_ACTION_META, ENTITY_TYPE_OPTIONS } from '@/lib/audit-actions';
import { getAuditLogs } from '@/lib/data/audit-logs';
import { AuditLogFilterBar } from './_components/audit-log-filter-bar';
import { AuditLogTable } from './_components/audit-log-table';

export const metadata: Metadata = { title: 'Audit Logs | PrepX Admin' };
export const dynamic = 'force-dynamic';

interface AuditLogsPageProps {
  searchParams: Promise<{
    page?: string | string[];
    action?: string | string[];
    entityType?: string | string[];
    dateFrom?: string | string[];
    dateTo?: string | string[];
  }>;
}

const entityTypes = new Set<string>(
  ENTITY_TYPE_OPTIONS.map((option) => option.value).filter(Boolean)
);

function text(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
}

export default async function AuditLogsPage({
  searchParams,
}: AuditLogsPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const requestedPage = Number(text(params.page));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 1_000_000
      ? requestedPage
      : 1;
  const requestedAction = text(params.action);
  const action = Object.hasOwn(AUDIT_ACTION_META, requestedAction) ? requestedAction : '';
  const requestedEntityType = text(params.entityType);
  const entityType = entityTypes.has(requestedEntityType) ? requestedEntityType : '';
  const dateFrom = validDate(text(params.dateFrom));
  const dateTo = validDate(text(params.dateTo));

  const result = await getAuditLogs({ page, action, entityType, dateFrom, dateTo });
  const currentParams: Record<string, string> = {};
  if (action) currentParams.action = action;
  if (entityType) currentParams.entityType = entityType;
  if (dateFrom) currentParams.dateFrom = dateFrom;
  if (dateTo) currentParams.dateTo = dateTo;

  if (result.currentPage !== page) {
    const normalized = new URLSearchParams(currentParams);
    normalized.set('page', String(result.currentPage));
    redirect(`/admin/audit-logs?${normalized.toString()}`);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Audit Logs</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Immutable record of all administrative actions.
          </p>
        </div>
        {result.totalCount > 0 && (
          <Badge variant="neutral">{result.totalCount.toLocaleString()} events</Badge>
        )}
      </div>

      <AuditLogFilterBar
        key={JSON.stringify([action, entityType, dateFrom, dateTo])}
        initialAction={action}
        initialEntityType={entityType}
        initialDateFrom={dateFrom}
        initialDateTo={dateTo}
      />

      {result.error ? (
        <Alert variant="error" title="Unable to load audit logs">
          {result.error}
        </Alert>
      ) : (
        <AuditLogTable
          logs={result.logs}
          currentPage={result.currentPage}
          totalPages={result.totalPages}
          totalCount={result.totalCount}
          pageSize={result.pageSize}
          currentParams={currentParams}
        />
      )}
    </div>
  );
}
