import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { RadioTower } from 'lucide-react';
import { PublicationClient } from './publication-client';
import { getAdminUserId } from '@/lib/auth/admin';
import { getExaminationsWithCounts } from '@/lib/data/examinations';

export const metadata: Metadata = { title: 'Publication | PrepX Admin' };

interface PublicationPageProps {
  searchParams: Promise<{ examId?: string }>;
}

export default async function PublicationPage({
  searchParams,
}: PublicationPageProps): Promise<React.JSX.Element> {
  if (!(await getAdminUserId())) redirect('/admin/login?redirectTo=%2Fadmin%2Fpublication');
  const [params, examinations] = await Promise.all([searchParams, getExaminationsWithCounts()]);
  const requestedId = params.examId;
  const initialExamId = examinations.some((exam) => exam.id === requestedId)
    ? requestedId!
    : (examinations[0]?.id ?? '');

  return (
    <div className="mx-auto w-full max-w-[900px] space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
          <RadioTower aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Publication</h1>
          <p className="mt-1 text-sm text-gray-500">Validate and publish examination results.</p>
        </div>
      </div>
      {examinations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <RadioTower aria-hidden="true" className="mx-auto h-10 w-10 text-gray-300" />
          <h2 className="mt-4 font-semibold text-gray-900">No examinations available</h2>
          <p className="mt-1 text-sm text-gray-500">
            Create an examination before running publication checks.
          </p>
          <Link
            href="/admin/examinations/new"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Create examination
          </Link>
        </div>
      ) : (
        <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-gray-100" />}>
          <PublicationClient
            examinations={examinations.map(({ id, name, year, status }) => ({
              id,
              name,
              year,
              status,
            }))}
            initialExamId={initialExamId}
          />
        </Suspense>
      )}
    </div>
  );
}
