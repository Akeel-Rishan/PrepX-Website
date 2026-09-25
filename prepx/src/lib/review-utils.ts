import type { Student } from '@/types';

/** Computes missing required subjects for each incomplete student without database access. */
export function computeIncompleteStudents(
  students: Student[],
  requiredSubjectIds: string[],
  existingResults: Array<{ studentId: string; subjectId: string }>
): Array<{ studentId: string; missingSubjectIds: string[] }> {
  const coveredByStudent = new Map<string, Set<string>>();
  for (const result of existingResults) {
    const covered = coveredByStudent.get(result.studentId) ?? new Set<string>();
    covered.add(result.subjectId);
    coveredByStudent.set(result.studentId, covered);
  }

  return students.flatMap((student) => {
    const covered = coveredByStudent.get(student.id);
    const missingSubjectIds = requiredSubjectIds.filter((subjectId) => !covered?.has(subjectId));
    return missingSubjectIds.length ? [{ studentId: student.id, missingSubjectIds }] : [];
  });
}
