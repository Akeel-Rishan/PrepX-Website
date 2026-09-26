import type { Metadata } from 'next';
import Link from 'next/link';
import { RadioTower, Send } from 'lucide-react';
import { PublicationChecklist } from './_components/publication-checklist';
import { ExamSelectorBar } from '@/app/admin/(protected)/subjects/_components/exam-selector-bar';
import { Alert } from '@/components/ui/alert';
import { getExaminationsWithCounts } from '@/lib/data/examinations';
import { getPublicationValidation, type PublicationValidationResult } from '@/lib/data/publication';

export const metadata: Metadata = { title: 'Publication | PrepX Admin' };

interface PublicationPageProps {
  searchParams: Promise<{ examId?: string }>;
}

export default async function PublicationPage({
  searchParams,
}: PublicationPageProps): Promise<React.JSX.Element> {
  const [params, examinations] = await Promise.all([searchParams, getExaminationsWithCounts()]);
  const examId = params.examId?.trim() ?? '';
  let validationResult: PublicationValidationResult | null = null;
  let validationError: string | null = null;

  if (examId) {
    try {
      validationResult = await getPublicationValidation(examId);
    } catch {
      validationError = 'Publication validation could not be completed. Please try again.';
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
          <RadioTower aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Publication
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Validate results before making them visible to students.
          </p>
        </div>
      </header>

      {examinations.length === 0 ? (
        <section className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
          <Send
            aria-hidden="true"
            className="mx-auto h-10 w-10 text-gray-300 dark:text-slate-600"
          />
          <h2 className="mt-4 font-semibold text-gray-900 dark:text-white">
            No examinations available
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Create an examination before running publication checks.
          </p>
          <Link
            href="/admin/examinations/new"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Create examination
          </Link>
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
            <ExamSelectorBar
              id="publication-examination"
              examinations={examinations.map(({ id, name, year }) => ({ id, name, year }))}
              selectedExamId={examId}
              basePath="/admin/publication"
              label="Examination:"
              loadingLabel="Loading publication details…"
            />
          </section>

          {!examId && (
            <section className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900 sm:p-16">
              <Send className="mb-3 h-10 w-10 text-gray-300 dark:text-slate-600" />
              <p className="max-w-md text-sm text-gray-500 dark:text-slate-400">
                Select an examination above to view its publication status and run validation
                checks.
              </p>
            </section>
          )}

          {validationError && (
            <Alert variant="error" title="Validation failed">
              {validationError}
            </Alert>
          )}

          {examId && !validationError && !validationResult && (
            <Alert variant="error">The selected examination was not found.</Alert>
          )}

          {validationResult && (
            <PublicationChecklist result={validationResult} examinationId={examId} />
          )}
        </>
      )}
    </div>
  );
}
