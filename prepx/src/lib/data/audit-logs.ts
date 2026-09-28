import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import type { AuditLog } from '@/types';

export interface AuditLogFilters {
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditLogsResult {
  logs: AuditLog[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  error?: string;
}

const DEFAULT_PAGE_SIZE = 25;
const RETRY_DELAY_MS = 250;
const LOAD_ERROR = 'Audit logs could not be loaded. Check your connection and try again.';

interface QueryError {
  code?: string;
  message?: string;
  details?: string;
}

function isTransientQueryError(error: QueryError | null): boolean {
  if (!error) return false;
  if (!error.code) return true;
  const details = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return /fetch failed|network|timeout|timed out|econnreset|terminated/.test(details);
}

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** Reads audit events only. This module exposes no mutation operation. */
export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogsResult> {
  const pageSize =
    Number.isSafeInteger(filters.pageSize) && filters.pageSize! > 0
      ? Math.min(filters.pageSize!, 100)
      : DEFAULT_PAGE_SIZE;
  const page =
    Number.isSafeInteger(filters.page) && filters.page! > 0
      ? Math.min(filters.page!, 1_000_000)
      : 1;
  const empty = { logs: [], totalCount: 0, totalPages: 0, currentPage: page, pageSize };

  try {
    const supabase = createAdminClient();
    const makeQuery = (head = false) => {
      let query = supabase.from('audit_logs').select('*', { count: 'exact', head });
      if (filters.action?.trim()) query = query.eq('action', filters.action.trim());
      if (filters.entityType?.trim()) {
        query = query.eq('entity_type', filters.entityType.trim());
      }
      if (filters.dateFrom?.trim()) {
        query = query.gte('created_at', `${filters.dateFrom.trim()}T00:00:00.000Z`);
      }
      if (filters.dateTo?.trim()) {
        query = query.lte('created_at', `${filters.dateTo.trim()}T23:59:59.999Z`);
      }
      return query;
    };

    const from = (page - 1) * pageSize;
    const runPageQuery = () =>
      makeQuery()
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + pageSize - 1);
    let queryResult = await runPageQuery();
    if (isTransientQueryError(queryResult.error)) {
      await pause(RETRY_DELAY_MS);
      queryResult = await runPageQuery();
    }
    const { data, count, error } = queryResult;

    if (error?.code === 'PGRST103' && page > 1) {
      const { count: matchingCount, error: countError } = await makeQuery(true);
      if (!countError) {
        const lastPage = Math.max(1, Math.ceil((matchingCount ?? 0) / pageSize));
        if (lastPage < page) return getAuditLogs({ ...filters, page: lastPage, pageSize });
      }
    }
    if (error) {
      console.warn('[Audit Logs Query Warning]', {
        reason: error.code || 'network',
      });
      return { ...empty, error: LOAD_ERROR };
    }

    const totalCount = count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    const currentPage = Math.min(page, Math.max(1, totalPages));
    if (totalCount > 0 && currentPage !== page) {
      return getAuditLogs({ ...filters, page: currentPage, pageSize });
    }
    return {
      logs: data ?? [],
      totalCount,
      totalPages,
      currentPage,
      pageSize,
    };
  } catch {
    console.warn('[Audit Logs Query Warning]', { reason: 'network' });
    return { ...empty, error: LOAD_ERROR };
  }
}
