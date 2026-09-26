'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, TriangleAlert } from 'lucide-react';
import { getPaginationRange } from '@/components/admin/pagination';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CellError, ValidatedRow } from '@/types/import';

type RowFilter = 'all' | 'errors' | 'warnings' | 'valid';
const BASE_COLUMNS = ['index_number', 'full_name', 'nic_number', 'school_name'];
const GRADE_STYLES: Record<string, string> = {
  A: 'bg-green-100 text-green-800', B: 'bg-blue-100 text-blue-800',
  C: 'bg-indigo-100 text-indigo-800', S: 'bg-yellow-100 text-yellow-800',
  W: 'bg-red-100 text-red-800', AB: 'bg-gray-200 text-gray-700',
};

interface PreviewTableProps {
  rows: ValidatedRow[];
  columns: string[];
  pageSize?: number;
}

function rowKind(row: ValidatedRow): 'error' | 'warning' | 'valid' {
  if (!row.isValid) return 'error';
  return row.cellErrors.some((issue) => issue.severity === 'warning') ? 'warning' : 'valid';
}

function valueFor(row: ValidatedRow, column: string): string {
  if (column === 'index_number') return row.index_number;
  if (column === 'full_name') return row.full_name;
  if (column === 'nic_number') return row.nic_number;
  if (column === 'school_name') return row.school_name;
  return row.grades[column] ?? '';
}

function issuesFor(row: ValidatedRow, column: string): CellError[] {
  return row.cellErrors.filter((issue) => issue.column === column);
}

function DataCell({ row, column, isGrade }: { row: ValidatedRow; column: string; isGrade: boolean }): JSX.Element {
  const value = valueFor(row, column);
  const issues = issuesFor(row, column);
  const severity = issues.some((issue) => issue.severity === 'error') ? 'error' : issues.length ? 'warning' : null;
  return (
    <td className={cn('min-w-[120px] px-3 py-2.5 align-top', severity === 'error' && 'bg-red-100/80 ring-1 ring-inset ring-red-300', severity === 'warning' && 'bg-amber-100/80 ring-1 ring-inset ring-amber-300')}>
      <div className="flex flex-wrap items-center gap-1.5">
        {isGrade && value && GRADE_STYLES[value] && !issues.some((issue) => issue.severity === 'error') ? (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${GRADE_STYLES[value]}`}>{value}</span>
        ) : value ? (
          <span className={cn('text-sm text-gray-900', severity === 'error' && 'font-medium text-red-800')}>{value}</span>
        ) : (
          <span className="text-sm italic text-gray-400">—</span>
        )}
        {column === 'index_number' && row.isDuplicate && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">DUPLICATE</span>}
      </div>
      {issues.map((issue, index) => <p key={`${issue.message}-${index}`} className={`mt-1 max-w-[220px] text-[11px] leading-4 ${issue.severity === 'error' ? 'text-red-700' : 'text-amber-800'}`}>{issue.message}</p>)}
    </td>
  );
}

/** Renders filterable, paginated import rows with cell-level validation details. */
export function PreviewTable({ rows, columns, pageSize = 20 }: PreviewTableProps): JSX.Element {
  const [filter, setFilter] = useState<RowFilter>('all');
  const [page, setPage] = useState(1);
  const orderedColumns = useMemo(() => [...BASE_COLUMNS, ...columns.filter((column) => !BASE_COLUMNS.includes(column))], [columns]);
  const counts = useMemo(() => ({
    errors: rows.filter((row) => rowKind(row) === 'error').length,
    warnings: rows.filter((row) => rowKind(row) === 'warning').length,
    valid: rows.filter((row) => rowKind(row) === 'valid').length,
  }), [rows]);
  const filteredRows = useMemo(() => rows.filter((row) => {
    if (filter === 'all') return true;
    const expected = filter === 'errors' ? 'error' : filter === 'warnings' ? 'warning' : 'valid';
    return rowKind(row) === expected;
  }), [filter, rows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => setPage(1), [filter, rows]);

  if (rows.length === 0) return <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-600">No data rows found. Ensure the file has at least one data row below the header.</div>;
  const filters: Array<{ key: RowFilter; label: string; count: number }> = [
    { key: 'all', label: 'All', count: rows.length }, { key: 'errors', label: 'Errors only', count: counts.errors },
    { key: 'warnings', label: 'Warnings only', count: counts.warnings }, { key: 'valid', label: 'Valid only', count: counts.valid },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="overflow-x-auto border-b border-gray-200 p-3"><div className="flex w-max gap-2">{filters.map((item) => <button key={item.key} type="button" onClick={() => setFilter(item.key)} className={cn('whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium', filter === item.key ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50')}>{item.label} ({item.count})</button>)}</div></div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead><tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"><th className="px-3 py-3">Row #</th>{orderedColumns.map((column) => <th key={column} className="min-w-[120px] px-3 py-3">{column.replaceAll('_', ' ')}</th>)}<th className="px-3 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-gray-200">{visibleRows.map((row) => {
            const kind = rowKind(row);
            const rowIssues = row.cellErrors.filter((issue) => issue.column === '_row');
            return <tr key={row.rowNumber} className={kind === 'error' ? 'bg-red-50/40' : kind === 'warning' ? 'bg-amber-50/40' : 'bg-white'}><td className="px-3 py-2.5 align-top font-mono text-xs text-gray-600">{row.rowNumber}</td>{orderedColumns.map((column) => <DataCell key={column} row={row} column={column} isGrade={!BASE_COLUMNS.includes(column)} />)}<td className="min-w-[130px] px-3 py-2.5 align-top">{kind === 'error' ? <span className="flex items-center gap-1 text-xs font-medium text-red-700"><AlertCircle className="h-3.5 w-3.5" /> Error</span> : kind === 'warning' ? <span className="flex items-center gap-1 text-xs font-medium text-amber-700"><TriangleAlert className="h-3.5 w-3.5" /> Warning</span> : <span className="flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> Valid</span>}{rowIssues.map((issue, index) => <p key={`${issue.message}-${index}`} className="mt-1 text-[11px] leading-4 text-amber-800">{issue.message}</p>)}</td></tr>;
          })}</tbody>
        </table>
      </div>
      <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-3 py-3 sm:flex-row"><p className="text-xs text-gray-600">{filteredRows.length ? `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredRows.length)} of ${filteredRows.length}` : 'No matching rows'}</p><div className="flex items-center gap-1"><Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><div className="hidden items-center gap-1 md:flex">{getPaginationRange(currentPage, totalPages).map((item, index) => item === '…' ? <span key={`e-${index}`} className="px-1 text-gray-400">…</span> : <button key={item} type="button" onClick={() => setPage(item)} className={cn('h-8 w-8 rounded border text-xs', item === currentPage ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-700')}>{item}</button>)}</div><span className="px-2 text-xs text-gray-600 md:hidden">{currentPage}/{totalPages}</span><Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</Button>{totalPages > 5 && <label className="ml-2 hidden items-center gap-1 text-xs text-gray-600 md:flex">Go to <input type="number" min={1} max={totalPages} value={currentPage} onChange={(event) => setPage(Math.max(1, Math.min(totalPages, Number(event.target.value) || 1)))} className="h-8 w-14 rounded border border-gray-300 px-2" /></label>}</div></div>
    </div>
  );
}
