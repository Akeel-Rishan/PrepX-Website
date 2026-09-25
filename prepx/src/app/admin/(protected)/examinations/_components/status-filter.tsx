'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { EXAM_STATUS_OPTIONS } from '@/lib/exam-utils';
import { getExaminationListHref, normalizeExamSort } from '@/lib/examination-list';
import { cn } from '@/lib/utils';

interface StatusFilterProps {
  currentStatus: string | null;
}
const OPTIONS = [{ label: 'All', value: null }, ...EXAM_STATUS_OPTIONS];

export function StatusFilter({ currentStatus }: StatusFilterProps): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  function handleFilter(value: string | null): void {
    const sort = searchParams.has('sort') ? normalizeExamSort(searchParams.get('sort')) : undefined;
    const direction = searchParams.get('direction');
    router.push(
      getExaminationListHref(
        value,
        sort,
        direction === 'asc' || direction === 'desc' ? direction : undefined
      )
    );
  }
  return (
    <div role="group" aria-label="Filter examinations by status" className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => handleFilter(option.value)}
          aria-pressed={currentStatus === option.value}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            currentStatus === option.value
              ? 'bg-blue-600 text-white shadow-sm'
              : 'border border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
