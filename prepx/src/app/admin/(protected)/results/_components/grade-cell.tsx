'use client';

import { cn } from '@/lib/utils';
import { Dropdown } from '@/components/ui/dropdown';

interface GradeCellProps {
  studentId: string;
  subjectId: string;
  value: string;
  isDirty: boolean;
  disabled: boolean;
  onChange: (studentId: string, subjectId: string, value: string) => void;
}

const GRADE_STYLES: Record<string, string> = {
  A: 'border-green-300 bg-green-50 text-green-800',
  B: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  C: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  S: 'border-blue-300 bg-blue-50 text-blue-800',
  W: 'border-red-300 bg-red-50 text-red-800',
  AB: 'border-gray-300 bg-gray-100 text-gray-600',
  '': 'border-gray-200 bg-white text-gray-300',
};

export function GradeCell({
  studentId,
  subjectId,
  value,
  isDirty,
  disabled,
  onChange,
}: GradeCellProps): React.JSX.Element {
  return (
    <div className="relative inline-block">
      {isDirty && (
        <span
          aria-label="Unsaved change"
          className="absolute -right-1 -top-1 z-10 h-2 w-2 rounded-full border border-white bg-orange-400"
        />
      )}
      <Dropdown
        ariaLabel={`Grade for student ${studentId}`}
        value={value}
        options={[
          { value: '', label: 'Not entered' },
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
          { value: 'C', label: 'C' },
          { value: 'S', label: 'S' },
          { value: 'W', label: 'W' },
          { value: 'AB', label: 'AB' },
        ]}
        onValueChange={(grade) => onChange(studentId, subjectId, grade)}
        disabled={disabled}
        compact
        align="right"
        className={cn(
          'w-20 text-center',
          isDirty && 'ring-2 ring-orange-300 ring-offset-0',
          GRADE_STYLES[value] ?? GRADE_STYLES['']
        )}
      />
    </div>
  );
}
