export type { ResultStatus } from '@/lib/constants';
import type { ResultStatus } from '@/lib/constants';

/** Required subjects alone determine status; missing grades take precedence. */
export function calculateResultStatus(
  gradesBySubjectId: Map<string, string>,
  requiredSubjectIds: Set<string>
): ResultStatus {
  if (requiredSubjectIds.size === 0) {
    return gradesBySubjectId.size > 0 ? 'Passed' : 'Incomplete';
  }

  const requiredGrades: string[] = [];
  for (const subjectId of requiredSubjectIds) {
    const grade = gradesBySubjectId.get(subjectId);
    if (!grade) return 'Incomplete';
    requiredGrades.push(grade);
  }
  if (requiredGrades.every((grade) => grade === 'AB')) return 'Absent';
  if (requiredGrades.some((grade) => grade === 'W')) return 'Not Passed';
  return 'Passed';
}

/** Presentation tokens shared by the future public result display. */
export function getResultStatusStyle(status: ResultStatus): {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: 'check' | 'x' | 'clock' | 'alert';
} {
  switch (status) {
    case 'Passed':
      return {
        label: 'PASSED',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        icon: 'check',
      };
    case 'Not Passed':
      return {
        label: 'NOT PASSED',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        icon: 'x',
      };
    case 'Absent':
      return {
        label: 'ABSENT',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-200',
        icon: 'clock',
      };
    case 'Incomplete':
      return {
        label: 'INCOMPLETE',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        icon: 'alert',
      };
  }
}
