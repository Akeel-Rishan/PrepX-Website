import type { Metadata } from 'next';
import { BookOpen } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { getExaminationOptions, getExaminationById } from '@/lib/data/examinations';
import { getSubjectsWithResultCounts } from '@/lib/data/subjects';
import { getExamStatusBadgeVariant, getExamStatusLabel } from '@/lib/exam-utils';
import { isExamEditable } from '@/lib/constants';
import { ExamSelectorBar } from './_components/exam-selector-bar';
import { SubjectsManager } from './_components/subjects-manager';

export const metadata: Metadata = { title: 'Subjects | PrepX Admin' };
export const dynamic = 'force-dynamic';

interface SubjectsPageProps {
  searchParams: Promise<{ examId?: string | string[] }>;
}

export default async function SubjectsPage({
  searchParams,
}: SubjectsPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const examId = typeof params.examId === 'string' ? params.examId.trim() : '';
  const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(examId);
  const subjectsPromise = validId
    ? getSubjectsWithResultCounts(examId).then(
        (data) => ({ data, error: false }),
        () => ({ data: [], error: true })
      )
    : Promise.resolve({ data: [], error: false });
  const [examinations, selectedExam, subjectsResult] = await Promise.all([
    getExaminationOptions(),
    validId ? getExaminationById(examId) : Promise.resolve(null),
    subjectsPromise,
  ]);
  const subjects = selectedExam ? subjectsResult.data : [];
  const resultCounts = new Map(subjects.map((subject) => [subject.id, subject.resultCount]));
  const loadError = Boolean(selectedExam && subjectsResult.error);
  // A newly created examination may not yet be in the short-lived option cache.
  const options =
    selectedExam && !examinations.some((exam) => exam.id === selectedExam.id)
      ? [...examinations, { id: selectedExam.id, name: selectedExam.name, year: selectedExam.year }]
      : examinations;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subjects</h2>
          <p className="mt-1 text-sm text-gray-500">
            {selectedExam
              ? 'Managing subjects for ' + selectedExam.name + ' ' + selectedExam.year
              : 'Select an examination to manage its subjects.'}
          </p>
        </div>
        {selectedExam && (
          <div className="shrink-0 pt-1">
            <Badge variant={getExamStatusBadgeVariant(selectedExam.status)}>
              {getExamStatusLabel(selectedExam.status)}
            </Badge>
          </div>
        )}
      </div>
      <ExamSelectorBar examinations={options} selectedExamId={examId} basePath="/admin/subjects" />
      {!examId && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-16 text-center">
          <BookOpen aria-hidden="true" className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-400">
            Select an examination above to manage its subjects.
          </p>
        </div>
      )}
      {examId && !selectedExam && (
        <Alert variant="error">Examination not found. Please select a valid examination.</Alert>
      )}
      {loadError && (
        <Alert variant="error">
          Unable to load subjects and grade counts. Please refresh the page to try again.
        </Alert>
      )}
      {selectedExam && !loadError && (
        <SubjectsManager
          key={selectedExam.id}
          subjects={subjects}
          examinationId={selectedExam.id}
          resultCounts={resultCounts}
          isReadOnly={!isExamEditable(selectedExam.status)}
        />
      )}
    </div>
  );
}
