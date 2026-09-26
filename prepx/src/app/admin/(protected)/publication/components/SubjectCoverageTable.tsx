'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { SubjectCoverageRow } from '@/lib/publication-validator';

interface SubjectCoverageTableProps {
  rows: SubjectCoverageRow[];
}

function coverageStyle(coverage: number): string {
  if (coverage === 100) return 'bg-green-50 text-green-700';
  if (coverage >= 50) return 'bg-gray-100 text-gray-700';
  if (coverage > 0) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-700';
}

/** Coverage totals for each active subject, ordered by publication importance. */
export function SubjectCoverageTable({ rows }: SubjectCoverageTableProps): React.JSX.Element {
  const sortedRows = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          Number(b.required) - Number(a.required) ||
          b.coveragePct - a.coveragePct ||
          a.subjectName.localeCompare(b.subjectName)
      ),
    [rows]
  );

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
        <h2 className="font-semibold text-gray-900">Subject coverage</h2>
        <p className="mt-1 text-sm text-gray-500">Entered grades across every active subject.</p>
      </div>
      {sortedRows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-500">
          No active subjects configured.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3">Subject</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Grades entered</th>
                <th className="px-5 py-3">Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedRows.map((row) => (
                <tr key={row.subjectId}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{row.subjectName}</p>
                    {row.subjectCode && <p className="text-xs text-gray-500">{row.subjectCode}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.required ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                        Required
                      </span>
                    ) : (
                      'Optional'
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row.gradeCount} / {row.totalStudents}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        'inline-flex min-w-14 justify-center rounded-full px-2.5 py-1 text-xs font-semibold',
                        coverageStyle(row.coveragePct)
                      )}
                    >
                      {row.coveragePct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
