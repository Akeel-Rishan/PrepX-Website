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
