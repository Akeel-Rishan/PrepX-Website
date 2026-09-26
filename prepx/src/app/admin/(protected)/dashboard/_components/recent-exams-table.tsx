import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { RecentExamination } from '@/lib/data/dashboard';
import { getExamStatusBadgeVariant, getExamStatusLabel } from '@/lib/exam-utils';
import { formatDate } from '@/lib/utils';

interface RecentExamsTableProps {
  examinations: RecentExamination[];
}

export function RecentExamsTable({ examinations }: RecentExamsTableProps): React.JSX.Element {
  return (
    <section
      aria-labelledby="recent-exams-title"
      className="min-w-0 rounded-xl border border-gray-200 bg-white p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 id="recent-exams-title" className="text-base font-semibold text-gray-900">
          Recent Examinations
        </h3>
        <Link href="/admin/examinations" className="text-sm text-blue-600 hover:text-blue-700">
          View all →
        </Link>
      </div>
      {examinations.length === 0 ? (
        <div className="py-10 text-center">
          <ClipboardList aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-400">No examinations yet.</p>
          <Link
            href="/admin/examinations"
            className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700"
          >
            Create your first examination →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Five most recently created examinations</caption>
            <thead>
              <tr className="border-b border-gray-100">
                {['Examination', 'Year', 'Status', 'Published', 'Action'].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className={`pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${heading === 'Action' ? 'text-right' : 'pr-4 text-left'}`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {examinations.map((exam) => (
                <tr key={exam.id} className="transition-colors hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <div className="min-w-32 break-words font-medium text-gray-900">
                      {exam.name}
                    </div>
                    <div className="text-xs text-gray-400">{exam.organization_name}</div>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{exam.year}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={getExamStatusBadgeVariant(exam.status)}>
                      {getExamStatusLabel(exam.status)}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 text-xs text-gray-500">
                    {exam.publication_date ? (
                      formatDate(exam.publication_date)
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/admin/examinations/${exam.id}`}
                      aria-label={`Manage ${exam.name} (${exam.year})`}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Manage
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
