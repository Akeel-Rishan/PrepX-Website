'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Search, TriangleAlert } from 'lucide-react';
import { getPaginationRange } from '@/components/admin/pagination';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ValidatedRow } from '@/types/import';

type RowFilter = 'all' | 'errors' | 'warnings' | 'ready';
const BASE_COLUMNS = new Set([
  'index_number',
  'full_name',
  'nic_number',
  'school_name',
  'examination_center',
]);

interface PreviewTableProps {
  rows: ValidatedRow[];
  columns: string[];
  pageSize?: number;
}

function rowKind(row: ValidatedRow): 'error' | 'warning' | 'ready' {
  if (!row.isValid) return 'error';
  return row.cellErrors.some((issue) => issue.severity === 'warning') ? 'warning' : 'ready';
}

function gradeSummary(row: ValidatedRow, subjectCount: number): string {
  const entered = Object.values(row.grades).filter(Boolean).length;
  if (entered === 0 || subjectCount === 0) return '0';
  return entered === subjectCount ? `${entered}/${subjectCount} ✓` : `${entered}/${subjectCount}`;
}

/** Compact, searchable, paginated preview of every parsed spreadsheet row. */
export function PreviewTable({
  rows,
  columns,
  pageSize = 25,
}: PreviewTableProps): React.JSX.Element {
  const [filter, setFilter] = useState<RowFilter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const subjectCount = columns.filter((column) => !BASE_COLUMNS.has(column)).length;
  const counts = useMemo(
    () => ({
      errors: rows.filter((row) => !row.isValid).length,
      warnings: rows.filter((row) => row.cellErrors.some((issue) => issue.severity === 'warning'))
        .length,
      ready: rows.filter((row) => row.isValid).length,
    }),
    [rows]
  );
  const filteredRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      if (filter === 'errors' && row.isValid) return false;
      if (filter === 'warnings' && !row.cellErrors.some((issue) => issue.severity === 'warning')) {
        return false;
      }
      if (filter === 'ready' && !row.isValid) return false;
      if (!needle) return true;
      return [
        row.index_number,
        row.full_name,
        row.school_name,
        row.nic_number,
        ...row.cellErrors.map((issue) => issue.message),
      ].some((value) => value.toLocaleLowerCase().includes(needle));
    });
  }, [filter, query, rows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstVisibleIndex = (currentPage - 1) * pageSize;
  const visibleRows = filteredRows.slice(firstVisibleIndex, firstVisibleIndex + pageSize);

  useEffect(() => setPage(1), [filter, query, rows]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-600">
        No data rows found. Ensure the file has at least one data row below the header.
      </div>
    );
  }

  const filters: Array<{ key: RowFilter; label: string; count: number }> = [
    { key: 'all', label: 'All', count: rows.length },
    { key: 'errors', label: 'Errors', count: counts.errors },
    { key: 'warnings', label: 'Warnings', count: counts.warnings },
    { key: 'ready', label: 'Ready', count: counts.ready },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium',
                filter === item.key
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>
        <label className="relative block sm:w-64">
          <span className="sr-only">Search preview rows</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search index, name, school…"
            className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              <th className="w-14 px-4 py-3">#</th>
              <th className="w-24 px-3 py-3 text-center">Status</th>
              <th className="px-4 py-3">Index No.</th>
              <th className="px-4 py-3">Name</th>
              <th className="hidden px-4 py-3 md:table-cell">School</th>
              <th className="w-24 px-3 py-3 text-center">Grades</th>
              <th className="min-w-64 px-4 py-3">Issues</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                  No rows match the current filter.
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                const kind = rowKind(row);
                return (
                  <tr
                    key={row.rowNumber}
                    className={cn(
                      'align-top',
                      kind === 'error'
                        ? 'bg-red-50/60'
                        : kind === 'warning'
                          ? 'bg-amber-50/40'
                          : 'hover:bg-gray-50/60'
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.rowNumber}</td>
                    <td className="px-3 py-3 text-center">
                      {kind === 'error' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                          <AlertCircle aria-hidden="true" className="h-4 w-4" /> Error
                        </span>
                      ) : kind === 'warning' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                          <TriangleAlert aria-hidden="true" className="h-4 w-4" /> Warning
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                          <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> Ready
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {row.index_number || <span className="italic text-red-500">missing</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {row.full_name || <span className="italic text-red-500">missing</span>}
                    </td>
                    <td className="hidden max-w-48 px-4 py-3 text-gray-600 md:table-cell">
                      <span className="block truncate" title={row.school_name}>
                        {row.school_name || <span className="italic text-red-500">missing</span>}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-medium text-gray-700">
                      {gradeSummary(row, subjectCount)}
                    </td>
                    <td className="px-4 py-3">
                      {row.cellErrors.length === 0 ? (
                        <span className="text-gray-400">Not provided</span>
                      ) : (
                        <ul className="space-y-1">
                          {row.cellErrors.map((issue, index) => (
                            <li
                              key={`${issue.column}-${issue.message}-${index}`}
                              className={cn(
                                'flex items-start gap-1.5 text-xs leading-4',
                                issue.severity === 'error' ? 'text-red-700' : 'text-amber-800'
                              )}
                            >
                              <span aria-hidden="true" className="mt-0.5">
                                •
                              </span>
                              <span>{issue.message}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row">
        <p className="text-xs text-gray-600">
          {filteredRows.length
            ? `Showing ${firstVisibleIndex + 1} to ${Math.min(firstVisibleIndex + pageSize, filteredRows.length)} of ${filteredRows.length}`
            : 'No matching rows'}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </Button>
          <div className="hidden items-center gap-1 md:flex">
            {getPaginationRange(currentPage, totalPages).map((item, index) =>
              item === '…' ? (
                <span key={`ellipsis-${index}`} className="px-1 text-gray-400">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={cn(
                    'h-8 w-8 rounded border text-xs',
                    item === currentPage
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {item}
                </button>
              )
            )}
          </div>
          <span className="px-2 text-xs text-gray-600 md:hidden">
            {currentPage}/{totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
