'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dropdown } from '@/components/ui/dropdown';

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
      <Dropdown
        id={id}
        value={selectedExamId}
        options={[
          { value: '', label: 'Select an examination...' },
          ...(selectedExamId && !examinations.some((exam) => exam.id === selectedExamId)
            ? [{ value: selectedExamId, label: 'Unavailable examination' }]
            : []),
          ...examinations.map((exam) => ({
            value: exam.id,
            label: `${exam.name} ${exam.year}`,
          })),
        ]}
        disabled={pending}
        ariaLabel={label.replace(':', '')}
        onValueChange={(nextId) => {
          startTransition(() =>
            router.push(
              nextId ? `${basePath}?${new URLSearchParams({ examId: nextId })}` : basePath
            )
          );
        }}
        className="min-w-0 sm:min-w-[240px]"
      />
      {pending && (
        <span role="status" className="text-xs text-gray-500">
          {loadingLabel}
        </span>
      )}
    </div>
  );
}
