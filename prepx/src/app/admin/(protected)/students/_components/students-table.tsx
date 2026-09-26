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
      <div className="overflow-x-auto">
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
                    <span className="rounded bg-gray-50 px-2 py-1 font-mono text-xs text-gray-600">
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
