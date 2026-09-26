'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StudentCompletionRow } from '@/lib/publication-validator';

type IssueFilter = 'all' | 'incomplete' | 'no-grades';

interface StudentIssueTableProps {
  rows: StudentCompletionRow[];
}

const PAGE_SIZE = 20;
const STATUS_STYLE: Record<StudentCompletionRow['overallStatus'], string> = {
  PASSED: 'bg-green-100 text-green-700',
  NOT_PASSED: 'bg-red-100 text-red-700',
  ABSENT: 'bg-gray-100 text-gray-700',
  INCOMPLETE: 'bg-amber-100 text-amber-800',
};

function statusLabel(status: StudentCompletionRow['overallStatus']): string {
  return status === 'NOT_PASSED'
    ? 'Not passed'
    : status.toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

/** Searchable, filtered list of students whose records need attention. */
export function StudentIssueTable({ rows }: StudentIssueTableProps): React.JSX.Element | null {
  const [filter, setFilter] = useState<IssueFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const issueRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.overallStatus === 'INCOMPLETE' ||
          row.overallStatus === 'ABSENT' ||
          row.missingSubjects.length > 0
      ),
    [rows]
  );
  const counts = useMemo(
    () => ({
      all: issueRows.length,
      incomplete: issueRows.filter((row) => row.overallStatus === 'INCOMPLETE').length,
      'no-grades': issueRows.filter((row) => row.gradesEntered === 0).length,
    }),
    [issueRows]
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return issueRows.filter((row) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'incomplete' && row.overallStatus === 'INCOMPLETE') ||
        (filter === 'no-grades' && row.gradesEntered === 0);
      const matchesSearch =
        !query ||
        row.fullName.toLowerCase().includes(query) ||
        row.indexNumber.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filter, issueRows, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [filter, search]);
  useEffect(() => setPage((current) => Math.min(current, pageCount)), [pageCount]);

  if (issueRows.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
        <h2 className="font-semibold text-gray-900">Students requiring attention</h2>
        <p className="mt-1 text-sm text-gray-500">Review missing grades before publication.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex overflow-x-auto rounded-lg bg-gray-100 p-1">
            {(['all', 'incomplete', 'no-grades'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  'whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  filter === value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {value.replace('-', ' ')} ({counts[value]})
              </button>
            ))}
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              id="publication-student-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search name or index"
              aria-label="Search students requiring attention"
            />
          </div>
        </div>
      </div>
      {visibleRows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm font-medium text-green-700">
          ✓ All students have complete records.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3">Index no.</th>
                <th className="px-4 py-3">Student name</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3">Missing subjects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleRows.map((row) => (
                <tr key={row.studentId} className="align-top">
                  <td className="px-5 py-3 font-medium text-gray-900">{row.indexNumber || '—'}</td>
                  <td className="px-4 py-3 text-gray-900">{row.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{row.schoolName || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                        STATUS_STYLE[row.overallStatus]
                      )}
                    >
                      {statusLabel(row.overallStatus)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {row.missingSubjects.length ? (
                      <div className="flex flex-wrap gap-1">
                        {row.missingSubjects.slice(0, 3).map((subject) => (
                          <span
                            key={subject}
                            className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800"
                          >
                            {subject}
                          </span>
                        ))}
                        {row.missingSubjects.length > 3 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            +{row.missingSubjects.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 sm:px-5">
          <p className="text-xs text-gray-500">
            Page {page} of {pageCount} · {filtered.length} records
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pageCount}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
