'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface ExamSelectorBarProps {
  examinations: Array<{ id: string; name: string; year: number }>;
  selectedExamId: string;
  basePath?: string;
  id?: string;
  label?: string;
  loadingLabel?: string;
}

export function ExamSelectorBar({
  examinations,
  selectedExamId,
  basePath = '/admin/subjects',
  id = 'subject-examination',
  label = 'Examination:',
  loadingLabel = 'Loading examination…',
}: ExamSelectorBarProps): React.JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <label htmlFor={id} className="whitespace-nowrap text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={id}
        value={selectedExamId}
        disabled={pending}
        aria-busy={pending}
        onChange={(event) => {
          const id = event.target.value;
          startTransition(() =>
            router.push(id ? `${basePath}?${new URLSearchParams({ examId: id })}` : basePath)
          );
        }}
        className="min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 sm:min-w-[220px]"
      >
        <option value="">Select an examination...</option>
        {selectedExamId && !examinations.some((exam) => exam.id === selectedExamId) && (
          <option value={selectedExamId}>Unavailable examination</option>
        )}
        {examinations.map((exam) => (
          <option key={exam.id} value={exam.id}>
            {exam.name} {exam.year}
          </option>
        ))}
      </select>
      {pending && (
        <span role="status" className="text-xs text-gray-500">
          {loadingLabel}
        </span>
      )}
    </div>
  );
}
