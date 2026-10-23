import { GRADE_LABELS, type Grade } from '@/lib/constants';
import { PUBLIC_SUPPORT_CONTACT } from '@/lib/public-support';
import { cn } from '@/lib/utils';
import type { GradeEntry } from '@/types';

const GRADE_BADGE_STYLES: Record<Grade, string> = {
  A: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-200',
  B: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200',
  S: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200',
  W: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-200',
  AB: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-slate-800 dark:text-slate-200',
};

export function GradeBadge({ grade }: { grade: Grade | null }) {
  if (!grade)
    return (
      <span aria-label="Grade not available" className="text-slate-500 dark:text-slate-400">
        —
      </span>
    );
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold',
        GRADE_BADGE_STYLES[grade],
        `print-grade-${grade}`
      )}
    >
      {grade}
    </span>
  );
}

export function GradesTable({ grades }: { grades: GradeEntry[] }) {
  return (
    <section aria-labelledby="subject-results-heading" className="print-grades-section mt-6">
      <h2
        id="subject-results-heading"
        className="mb-4 text-base font-bold text-slate-950 dark:text-white"
      >
        Subject results
      </h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 print:overflow-visible">
        <table className="print-grades-table w-full table-fixed text-sm">
          <caption className="sr-only">Published subject grades and their meanings</caption>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              <th
                scope="col"
                className="w-[42%] px-2 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 sm:px-4"
              >
                Subject
              </th>
              <th
                scope="col"
                className="w-[22%] px-1 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Grade
              </th>
              <th
                scope="col"
                className="px-2 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 sm:px-4"
              >
                Meaning
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {grades.map((entry) => (
              <tr
                key={entry.subjectName}
                className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
              >
                <th
                  scope="row"
                  className="wrap-break-word px-2 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100 sm:px-4"
                >
                  {entry.subjectName}
                </th>
                <td className="print-grade-cell px-1 py-3 text-center">
                  <GradeBadge grade={entry.grade} />
                </td>
                <td className="wrap-break-word px-2 py-3 text-xs text-slate-600 dark:text-slate-300 sm:px-4 sm:text-sm">
                  {entry.grade ? GRADE_LABELS[entry.grade] : 'Not available'}
                </td>
              </tr>
            ))}
            {grades.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-slate-600 dark:text-slate-300"
                >
                  Subject grades are not available. Please contact the {PUBLIC_SUPPORT_CONTACT}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
