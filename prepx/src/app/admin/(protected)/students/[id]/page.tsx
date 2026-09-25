import Link from 'next/link';
import { ChevronLeft, Users } from 'lucide-react';

interface StudentDetailPageProps {
  params: { id: string };
}

export default async function StudentDetailPage({
  params,
}: StudentDetailPageProps): Promise<JSX.Element> {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/admin/students"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Back to Students
        </Link>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-12 text-center">
        <Users aria-hidden="true" className="mb-3 h-10 w-10 text-gray-300" />
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          {id === 'new' ? 'Add Student' : 'Manage Student'}
        </h2>
        <p className="text-sm text-gray-400">
          Student form for: <code className="break-all rounded bg-gray-100 px-1">{id}</code>
        </p>
        <p className="mt-1 text-xs text-gray-400">Full add/edit form built in Step 5.2</p>
      </div>
    </div>
  );
}
