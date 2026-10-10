import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getExaminationsWithCounts, type ExaminationWithCount } from '@/lib/data/examinations';
import { getSubjectsByExamination } from '@/lib/data/subjects';
import { Skeleton, LoadingProgress } from '@/components/ui/loading-primitives';
import { ImportClient } from './import-client';

export const metadata: Metadata = { title: 'Import Results | PrepX Admin' };

function isImportable(
  examination: ExaminationWithCount
): examination is ExaminationWithCount & { status: 'DRAFT' | 'READY' } {
  return examination.status === 'DRAFT' || examination.status === 'READY';
}

function ImportSkeleton(): React.JSX.Element {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="app-loading-enter space-y-4">
      <span className="sr-only">Loading import workflow...</span>
      <LoadingProgress />
      <Skeleton className="h-28" rounded="xl" />
      <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-52 w-full" rounded="xl" />
        <Skeleton className="ml-auto h-10 w-40" />
      </div>
    </div>
  );
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
      aiAssistantConfigured={Boolean(
        process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim()
      )}
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
