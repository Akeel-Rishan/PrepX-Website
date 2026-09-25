'use client';

import { cn } from '@/lib/utils';

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
}: GradeCellProps): JSX.Element {
  return (
    <div className="relative inline-block">
      {isDirty && (
        <span
          aria-label="Unsaved change"
          className="absolute -right-1 -top-1 z-10 h-2 w-2 rounded-full border border-white bg-orange-400"
        />
      )}
      <select
        aria-label={`Grade for student ${studentId}`}
        value={value}
        onChange={(event) => onChange(studentId, subjectId, event.target.value)}
        disabled={disabled}
        className={cn(
          'h-8 w-16 cursor-pointer appearance-none rounded-md border text-center text-xs font-semibold transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-60',
          isDirty && 'ring-2 ring-orange-300 ring-offset-0',
          GRADE_STYLES[value] ?? GRADE_STYLES['']
        )}
      >
        <option value="">—</option>
        <option value="A">A</option>
        <option value="B">B</option>
        <option value="C">C</option>
        <option value="S">S</option>
        <option value="W">W</option>
        <option value="AB">AB</option>
      </select>
    </div>
  );
}
