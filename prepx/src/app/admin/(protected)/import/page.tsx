import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getExaminationsWithCounts, type ExaminationWithCount } from '@/lib/data/examinations';
import { getSubjectsByExamination } from '@/lib/data/subjects';
import { ImportClient } from './import-client';

export const metadata: Metadata = { title: 'Import Results | PrepX Admin' };

function isImportable(
  examination: ExaminationWithCount
): examination is ExaminationWithCount & { status: 'DRAFT' | 'READY' } {
  return examination.status === 'DRAFT' || examination.status === 'READY';
}

function ImportSkeleton(): React.JSX.Element {
  return <div aria-label="Loading import workflow" className="space-y-4"><div className="h-28 animate-pulse rounded-xl bg-gray-100" /><div className="h-96 animate-pulse rounded-xl bg-gray-100" /></div>;
}

async function ImportPageContent({ examId }: { examId: string }): Promise<React.JSX.Element> {
  const validExamId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(examId);
  const [allExaminations, selectedSubjects] = await Promise.all([
    getExaminationsWithCounts(),
    validExamId ? getSubjectsByExamination(examId) : Promise.resolve([]),
  ]);
  const importable = allExaminations.filter(isImportable);
  const selectedExam = importable.find((examination) => examination.id === examId);
  const subjects = selectedExam ? selectedSubjects.filter((subject) => subject.active) : [];
  return (
    <ImportClient
      examinations={importable.map(({ id, name, year, status }) => ({ id, name, year, status }))}
      hiddenExaminationCount={allExaminations.length - importable.length}
      initialExamId={selectedExam?.id ?? ''}
      subjects={subjects.map(({ id, subject_name, subject_code, required }) => ({
        id,
        subject_name,
        subject_code,
        required,
      }))}
    />
  );
}

interface ImportPageProps {
  searchParams: Promise<{ examId?: string }>;
}

export default async function ImportPage({ searchParams }: ImportPageProps): Promise<React.JSX.Element> {
  const { examId = '' } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Import Results</h2>
        <p className="mt-1 text-sm text-gray-600">Bulk upload student results from Excel or CSV.</p>
      </div>
      <Suspense fallback={<ImportSkeleton />}>
        <ImportPageContent examId={examId} />
      </Suspense>
    </div>
  );
}
