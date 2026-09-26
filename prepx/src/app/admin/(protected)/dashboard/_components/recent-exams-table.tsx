import Link from 'next/link';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { RecentExamination } from '@/lib/data/dashboard';
import { getExamStatusBadgeVariant, getExamStatusLabel } from '@/lib/exam-utils';
import { formatDate } from '@/lib/utils';

interface RecentExamsTableProps {
  examinations: RecentExamination[];
  year: number;
}

export function RecentExamsTable({ examinations, year }: RecentExamsTableProps): React.JSX.Element {
  return (
    <section
      aria-labelledby="recent-exams-title"
      className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <ClipboardList aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              Latest activity
            </p>
            <h2 id="recent-exams-title" className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-100">
              {year} examinations
            </h2>
          </div>
        </div>
        <Link
          href="/admin/examinations"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
        >
          View all <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
      {examinations.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <ClipboardList aria-hidden="true" className="h-6 w-6 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">
            No examinations found for {year}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Create an examination to begin this cycle.</p>
          <Link
            href="/admin/examinations"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Create your first examination <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">
              Five most recently created examinations for {year}
            </caption>
            <thead className="bg-slate-50/70 dark:bg-slate-800/50">
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {['Examination', 'Status', 'Published', 'Action'].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400 ${heading === 'Action' ? 'text-right' : 'text-left'}`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {examinations.map((exam) => (
                <tr key={exam.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-4">
                    <div className="min-w-32 break-words font-semibold text-slate-900 dark:text-slate-100">
                      {exam.name}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{exam.organization_name}</div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={getExamStatusBadgeVariant(exam.status)}>
                      {getExamStatusLabel(exam.status)}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                    {exam.publication_date ? (
                      formatDate(exam.publication_date)
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/examinations/${exam.id}`}
                      aria-label={`Manage ${exam.name} (${exam.year})`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
                    >
                      Manage <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </Link>
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
