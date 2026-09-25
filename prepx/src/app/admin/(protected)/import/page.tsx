import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getExaminationsWithCounts, type ExaminationWithCount } from '@/lib/data/examinations';
import { ImportClient } from './import-client';

export const metadata: Metadata = { title: 'Import Results | PrepX Admin' };

function isImportable(
  examination: ExaminationWithCount
): examination is ExaminationWithCount & { status: 'DRAFT' | 'READY' } {
  return examination.status === 'DRAFT' || examination.status === 'READY';
}

function ImportSkeleton(): JSX.Element {
  return <div aria-label="Loading import workflow" className="space-y-4"><div className="h-28 animate-pulse rounded-xl bg-gray-100" /><div className="h-96 animate-pulse rounded-xl bg-gray-100" /></div>;
}

async function ImportPageContent(): Promise<JSX.Element> {
  const allExaminations = await getExaminationsWithCounts();
  const importable = allExaminations.filter(isImportable);
  return (
    <ImportClient
      examinations={importable.map(({ id, name, year, status }) => ({ id, name, year, status }))}
      hiddenExaminationCount={allExaminations.length - importable.length}
    />
  );
}

export default function ImportPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Import Results</h2>
        <p className="mt-1 text-sm text-gray-600">Bulk upload student results from Excel or CSV.</p>
      </div>
      <Suspense fallback={<ImportSkeleton />}><ImportPageContent /></Suspense>
    </div>
  );
}
