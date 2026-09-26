import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { getDistinctSchools, getStudentsWithPagination } from '@/lib/data/students';
import { getExaminationOptions } from '@/lib/data/examinations';
import { Pagination } from '@/components/admin/pagination';
import { StudentsFilterBar } from './_components/students-filter-bar';
import { StudentsTable } from './_components/students-table';

export const metadata: Metadata = { title: 'Students | PrepX Admin' };
export const dynamic = 'force-dynamic';

interface StudentsPageProps {
  searchParams: Promise<{
    page?: string | string[];
    search?: string | string[];
    examId?: string | string[];
    school?: string | string[];
  }>;
}

export default async function StudentsPage({
  searchParams,
}: StudentsPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const text = (value: string | string[] | undefined) =>
    typeof value === 'string' ? value.trim() : '';
  const requestedPage = Number(text(params.page));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 2147483647
      ? requestedPage
      : 1;
  const search = text(params.search);
  const rawExamId = text(params.examId);
  const examId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawExamId)
    ? rawExamId
    : '';
  const school = text(params.school);
  const [result, examinations, schools] = await Promise.all([
    getStudentsWithPagination({ page, search, examinationId: examId, school }),
    getExaminationOptions(),
    getDistinctSchools(examId || undefined),
  ]);
  const currentParams: Record<string, string> = {};
  if (search) currentParams.search = search;
  if (examId) currentParams.examId = examId;
  if (school) currentParams.school = school;
  if (result.currentPage !== page) {
    const normalized = new URLSearchParams(currentParams);
    normalized.set('page', String(result.currentPage));
    redirect('/admin/students?' + normalized);
  }
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Students</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage student records across all examinations.
          </p>
        </div>
        <Link
          href="/admin/students/new"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <PlusCircle aria-hidden="true" className="h-4 w-4" />
          Add Student
        </Link>
      </div>
      <StudentsFilterBar
        key={JSON.stringify([search, examId, school, page])}
        examinations={examinations.map(({ id, name, year }) => ({ id, name, year }))}
        schools={schools}
        initialSearch={search}
        initialExamId={examId}
        initialSchool={school}
      />
      <div>
        <StudentsTable students={result.students} />
        <Pagination
          currentPage={result.currentPage}
          totalPages={result.totalPages}
          totalCount={result.totalCount}
          pageSize={result.pageSize}
          basePath="/admin/students"
          currentParams={currentParams}
        />
      </div>
    </div>
  );
}
