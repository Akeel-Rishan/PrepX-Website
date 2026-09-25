import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, ClipboardList, PlusCircle, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getExamStatusBadgeVariant, getExamStatusLabel } from '@/lib/exam-utils';
import { formatDate } from '@/lib/utils';
import {
  getExaminationListHref,
  type ExamSortColumn,
  type SortDirection,
} from '@/lib/examination-list';
import type { ExaminationWithCount } from '@/lib/data/examinations';

interface ExaminationsTableProps {
  examinations: ExaminationWithCount[];
  currentStatus?: string | null;
  sort?: ExamSortColumn;
  direction?: SortDirection;
}

const columns: { label: string; value: ExamSortColumn }[] = [
  { label: 'Examination', value: 'name' },
  { label: 'Year', value: 'year' },
  { label: 'Status', value: 'status' },
  { label: 'Students', value: 'students' },
  { label: 'Created', value: 'created' },
];

export function ExaminationsTable({
  examinations,
  currentStatus = null,
  sort = 'year',
  direction = 'desc',
}: ExaminationsTableProps): JSX.Element {
  if (examinations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white">
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            <ClipboardList aria-hidden="true" className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-1 text-base font-semibold text-gray-900">No examinations found</h3>
          <p className="mb-6 max-w-sm text-sm text-gray-500">
            {currentStatus
              ? 'No examinations match this status. Choose another filter or create a new examination.'
              : 'Get started by creating your first examination. You can then add students, subjects, and grades.'}
          </p>
          <Link
            href="/admin/examinations/new"
            className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <PlusCircle aria-hidden="true" className="h-4 w-4" />
            Create Examination
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Examinations and student counts. Select a column heading to sort.
          </caption>
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {columns.map((column) => {
                const active = sort === column.value;
                const nextDirection = active && direction === 'asc' ? 'desc' : 'asc';
                const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th
                    key={column.value}
                    scope="col"
                    aria-sort={
                      active ? (direction === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    <Link
                      href={getExaminationListHref(currentStatus, column.value, nextDirection)}
                      aria-label={`Sort by ${column.label.toLowerCase()}, ${nextDirection === 'asc' ? 'ascending' : 'descending'}`}
                      className="inline-flex items-center gap-1.5 rounded hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {column.label}
                      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    </Link>
                  </th>
                );
              })}
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {examinations.map((exam) => (
              <tr key={exam.id} className="group transition-colors hover:bg-blue-50/30">
                <td className="px-6 py-4">
                  <div className="min-w-40 font-medium text-gray-900">{exam.name}</div>
                  <div className="mt-0.5 text-xs text-gray-400">{exam.organization_name}</div>
                </td>
                <td className="px-6 py-4 font-medium text-gray-700">{exam.year}</td>
                <td className="px-6 py-4">
                  <Badge variant={getExamStatusBadgeVariant(exam.status)}>
                    {getExamStatusLabel(exam.status)}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <Users aria-hidden="true" className="h-3.5 w-3.5 text-gray-400" />
                    <span className="font-medium text-gray-700">{exam.studentCount}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500">
                  {formatDate(exam.created_at)}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/admin/examinations/${exam.id}`}
                    aria-label={`Manage ${exam.name} (${exam.year})`}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 text-xs text-gray-400">
        {examinations.length} examination{examinations.length !== 1 ? 's' : ''} shown
      </div>
    </div>
  );
}
