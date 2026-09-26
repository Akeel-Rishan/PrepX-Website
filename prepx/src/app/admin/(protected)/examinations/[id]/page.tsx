import Link from 'next/link';
import { ChevronLeft, ClipboardList } from 'lucide-react';

interface ExaminationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExaminationDetailPage({ params }: ExaminationDetailPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/examinations"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Back to Examinations
        </Link>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-6 text-center sm:p-12">
        <ClipboardList aria-hidden="true" className="mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-400">
          Examination form for:{' '}
          <code className="break-all rounded bg-gray-100 px-1">{id}</code>
        </p>
        <p className="mt-1 text-xs text-gray-400">Full create/edit form built in Step 4.2</p>
      </div>
    </div>
  );
}
