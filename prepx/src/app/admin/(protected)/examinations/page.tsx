import type { Metadata } from 'next';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { getExaminationsWithCounts } from '@/lib/data/examinations';
import { normalizeExamStatus, normalizeExamSort, sortExaminations } from '@/lib/examination-list';
import { StatusFilter } from './_components/status-filter';
import { ExaminationsTable } from './_components/examinations-table';

export const metadata: Metadata = { title: 'Examinations | PrepX Admin' };
export const dynamic = 'force-dynamic';

interface ExaminationsPageProps {
  searchParams: Promise<{
    status?: string | string[];
    sort?: string | string[];
    direction?: string | string[];
  }>;
}

export default async function ExaminationsPage({
  searchParams,
}: ExaminationsPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const activeStatus = normalizeExamStatus(params.status);
  const sort = normalizeExamSort(params.sort);
  const direction = params.direction === 'asc' ? 'asc' : 'desc';
  const examinations = sortExaminations(
    await getExaminationsWithCounts(activeStatus ? { status: activeStatus } : undefined),
    sort,
    direction
  );
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Examinations</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your O/L model examinations.</p>
        </div>
        <Link
          href="/admin/examinations/new"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <PlusCircle aria-hidden="true" className="h-4 w-4" />
          New Examination
        </Link>
      </div>
      <StatusFilter currentStatus={activeStatus} />
      <ExaminationsTable
        examinations={examinations}
        currentStatus={activeStatus}
        sort={sort}
        direction={direction}
      />
    </div>
  );
}
