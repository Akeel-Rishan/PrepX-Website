import Link from 'next/link';
import { PlusCircle, Users } from 'lucide-react';
import type { StudentWithExam } from '@/lib/data/students';
import { maskNIC } from '@/lib/utils';

export function StudentsTable({ students }: { students: StudentWithExam[] }): React.JSX.Element {
  if (students.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white">
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            <Users aria-hidden="true" className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-1 text-base font-semibold text-gray-900">No students found</h3>
          <p className="mb-6 max-w-sm text-sm text-gray-500">
            Try adjusting your search or filters, or add a new student.
          </p>
          <Link
            href="/admin/students/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <PlusCircle aria-hidden="true" className="h-4 w-4" />
            Add Student
          </Link>
        </div>
      </div>
    );
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="divide-y divide-gray-100 md:hidden">
        {students.map((student) => (
          <article key={student.id} className="space-y-4 p-4 min-[380px]:p-5">
            <div className="min-w-0">
              <h3 className="wrap-break-word font-semibold text-gray-900">{student.full_name}</h3>
              <p className="mt-1 font-mono text-xs text-gray-500">{student.index_number}</p>
            </div>
            <dl className="grid gap-3 rounded-lg bg-gray-50 p-3 min-[380px]:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  School
                </dt>
                <dd className="mt-1 wrap-break-word text-sm text-gray-700">
                  {student.school_name}
                </dd>
                {student.examination_center && (
                  <dd className="mt-0.5 wrap-break-word text-xs text-gray-500">
                    {student.examination_center}
                  </dd>
                )}
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Examination
                </dt>
                <dd className="mt-1 wrap-break-word text-sm text-gray-700">
                  {student.examination
                    ? `${student.examination.name} ${student.examination.year}`
                    : 'Not provided'}
                </dd>
              </div>
              <div className="min-w-0 min-[380px]:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  NIC number
                </dt>
                <dd className="mt-1 font-mono text-xs text-gray-600">
                  {student.nic_number ? maskNIC(student.nic_number) : 'Not provided'}
                </dd>
              </div>
            </dl>
            <Link
              href={'/admin/students/' + student.id}
              aria-label={'Manage ' + student.full_name}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Manage student
            </Link>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Students and their examination details</caption>
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {['Student', 'NIC Number', 'School', 'Examination', 'Actions'].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className={
                    'px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ' +
                    (heading === 'Actions' ? 'text-right' : 'text-left')
                  }
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((student) => (
              <tr key={student.id} className="transition-colors hover:bg-blue-50/30">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{student.full_name}</div>
                  <div className="mt-0.5 font-mono text-xs text-gray-400">
                    {student.index_number}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {student.nic_number ? (
                    <span className="rounded-sm bg-gray-50 px-2 py-1 font-mono text-xs text-gray-600">
                      {maskNIC(student.nic_number)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Not provided</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-[180px] truncate text-gray-700" title={student.school_name}>
                    {student.school_name}
                  </div>
                  {student.examination_center && (
                    <div
                      className="mt-0.5 max-w-[180px] truncate text-xs text-gray-400"
                      title={student.examination_center}
                    >
                      {student.examination_center}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {student.examination ? (
                    <div>
                      <div className="text-xs font-medium text-gray-700">
                        {student.examination.name}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-400">{student.examination.year}</div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Not provided</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={'/admin/students/' + student.id}
                    aria-label={'Manage ' + student.full_name}
                    className="inline-flex h-8 items-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
