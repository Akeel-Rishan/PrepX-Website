import { GRADES, type Grade, type ResultStatus } from '@/lib/constants';
import { computeOverallStatus } from '@/lib/publication-validator';
import { maskNIC } from '@/lib/utils';
import type { PublicStudentResult } from '@/types';

interface PublicResultExamination {
  name: string;
  year: number;
}

interface PublicResultStudent {
  full_name: string;
  index_number: string;
  nic_number: string | null;
  school_name: string;
  examination_center: string | null;
}

interface PublicResultSubject {
  id: string;
  subject_name: string;
  subject_code: string | null;
  display_order: number;
  required: boolean;
}

interface PublicResultGrade {
  subject_id: string;
  grade: Grade;
}

const STATUS_LABELS: Record<ReturnType<typeof computeOverallStatus>, ResultStatus> = {
  PASSED: 'Passed',
  NOT_PASSED: 'Not Passed',
  ABSENT: 'Absent',
  INCOMPLETE: 'Incomplete',
};

/** Builds the only public result shape. Raw NICs, row IDs, and internal metadata are omitted. */
export function buildPublicStudentResult(input: {
  examination: PublicResultExamination;
  student: PublicResultStudent;
  subjects: PublicResultSubject[];
  results: PublicResultGrade[];
}): PublicStudentResult {
  const activeSubjectIds = new Set(input.subjects.map((subject) => subject.id));
  const gradesBySubject = new Map(
    input.results
      .filter((result) => activeSubjectIds.has(result.subject_id))
      .map((result) => [result.subject_id, result.grade])
  );
  const gradeRecord = Object.fromEntries(gradesBySubject);
  const requiredSubjectIds = input.subjects
    .filter((subject) => subject.required)
    .map((subject) => subject.id);

  return {
    studentName: input.student.full_name,
    indexNumber: input.student.index_number,
    maskedNic: maskNIC(input.student.nic_number),
    schoolName: input.student.school_name,
    examinationCenter: input.student.examination_center,
    examinationName: input.examination.name,
    examinationYear: input.examination.year,
    grades: input.subjects.map((subject) => ({
      subjectName: subject.subject_name,
      subjectCode: subject.subject_code,
      displayOrder: subject.display_order,
      grade: gradesBySubject.get(subject.id) ?? null,
    })),
    overallStatus: STATUS_LABELS[computeOverallStatus(gradeRecord, requiredSubjectIds)],
  };
}

const gradeSet = new Set<string>(GRADES);
const resultStatusSet = new Set<string>(['Passed', 'Not Passed', 'Absent', 'Incomplete']);

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/** Treat sessionStorage as untrusted and validate it before rendering student information. */
export function isPublicStudentResult(value: unknown): value is PublicStudentResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  if (
    typeof result.studentName !== 'string' ||
    typeof result.indexNumber !== 'string' ||
    !isNullableString(result.maskedNic) ||
    typeof result.schoolName !== 'string' ||
    !isNullableString(result.examinationCenter) ||
    typeof result.examinationName !== 'string' ||
    typeof result.examinationYear !== 'number' ||
    !Number.isInteger(result.examinationYear) ||
    !resultStatusSet.has(String(result.overallStatus)) ||
    !Array.isArray(result.grades)
  ) {
    return false;
  }

  return result.grades.every((entry) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return false;
    const grade = entry as Record<string, unknown>;
    return (
      typeof grade.subjectName === 'string' &&
      isNullableString(grade.subjectCode) &&
      typeof grade.displayOrder === 'number' &&
      Number.isInteger(grade.displayOrder) &&
      (grade.grade === null || (typeof grade.grade === 'string' && gradeSet.has(grade.grade)))
    );
  });
}
