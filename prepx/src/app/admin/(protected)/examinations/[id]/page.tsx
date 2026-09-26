import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getExaminationById } from '@/lib/data/examinations';
import { getExamStatusBadgeVariant, getExamStatusLabel } from '@/lib/exam-utils';
import type { Examination } from '@/types';
import { ExaminationForm } from './_components/examination-form';

interface ExaminationDetailPageProps {
  params: Promise<{ id: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: ExaminationDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  if (id === 'new') return { title: 'Create Examination | PrepX Admin' };
  const examination = UUID_REGEX.test(id) ? await getExaminationById(id) : null;
  return {
    title: examination ? `${examination.name} | PrepX Admin` : 'Examination | PrepX Admin',
  };
}

export default async function ExaminationDetailPage({
  params,
}: ExaminationDetailPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const isNew = id === 'new';
  if (!isNew && !UUID_REGEX.test(id)) notFound();

  let examination: Examination | null = null;
  if (!isNew) {
    examination = await getExaminationById(id);
    if (!examination) notFound();
  }

  const pageTitle = isNew ? 'Create Examination' : examination!.name;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/admin/examinations"
          className="flex items-center gap-1 rounded hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Examinations
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate font-medium text-gray-900">{pageTitle}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-bold text-gray-900">{pageTitle}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {isNew
              ? 'Fill in the details to create a new examination.'
              : 'Edit the examination details below.'}
          </p>
        </div>
        {examination && (
          <div className="shrink-0 pt-1">
            <Badge variant={getExamStatusBadgeVariant(examination.status)}>
              {getExamStatusLabel(examination.status)}
            </Badge>
          </div>
        )}
      </div>

      <ExaminationForm mode={isNew ? 'create' : 'edit'} examination={examination} />
    </div>
  );
}
