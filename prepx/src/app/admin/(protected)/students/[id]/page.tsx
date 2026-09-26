import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getStudentById, type StudentDetail } from '@/lib/data/students';
import { getEditableExaminationOptions } from '@/lib/data/examinations';
import { isExamEditable } from '@/lib/constants';
import { StudentForm } from './_components/student-form';

interface StudentDetailPageProps {
  params: Promise<{ id: string }>;
}
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: StudentDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  if (id === 'new') return { title: 'Add Student | PrepX Admin' };
  const student = UUID_REGEX.test(id) ? await getStudentById(id) : null;
  return { title: student ? student.full_name + ' | PrepX Admin' : 'Student | PrepX Admin' };
}

export default async function StudentDetailPage({
  params,
}: StudentDetailPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const isNew = id === 'new';
  if (!isNew && !UUID_REGEX.test(id)) notFound();
  let student: StudentDetail | null = null;
  let resultCount = 0;
  if (!isNew) {
    student = await getStudentById(id);
    if (!student) notFound();
    resultCount = student.resultCount;
  }
  const examinations = isNew ? await getEditableExaminationOptions() : [];
  const pageTitle = isNew ? 'Create Student' : student!.full_name;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/students" className="flex items-center gap-1 hover:text-gray-700">
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Students
        </Link>
        <span>/</span>
        <span className="max-w-[200px] truncate font-medium text-gray-900">{pageTitle}</span>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{pageTitle}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {isNew
              ? 'Enter the student details below.'
              : 'Index: ' + student!.index_number + ', School: ' + student!.school_name}
          </p>
        </div>
        {!isNew && resultCount > 0 && (
          <div className="flex-shrink-0 pt-1">
            <Badge variant="info">
              {resultCount} grade {resultCount === 1 ? 'entry' : 'entries'}
            </Badge>
          </div>
        )}
      </div>
      <StudentForm
        mode={isNew ? 'create' : 'edit'}
        student={student}
        examinations={examinations.map(({ id: examId, name, year }) => ({
          id: examId,
          name,
          year,
        }))}
        resultCount={resultCount}
        isReadOnly={Boolean(student?.examination && !isExamEditable(student.examination.status))}
      />
    </div>
  );
}
