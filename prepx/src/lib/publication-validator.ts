import { maskNIC } from '@/lib/utils';
import type { ExamStatus } from '@/lib/constants';

/** Status assigned to one publication validation check. */
export type CheckStatus = 'pass' | 'warn' | 'fail' | 'info';

/** One record referenced by a validation check. */
export interface AffectedItem {
  label: string;
  detail: string;
}

/** One validation rule and its result. */
export interface ValidationCheck {
  id: string;
  category: string;
  title: string;
  status: CheckStatus;
  message: string;
  detail?: string;
  affectedItems?: AffectedItem[];
  isBlocking: boolean;
}

/** Publication preview for one student. */
export interface StudentCompletionRow {
  studentId: string;
  fullName: string;
  indexNumber: string;
  schoolName: string;
  totalRequired: number;
  gradesEntered: number;
  missingSubjects: string[];
  overallStatus: 'PASSED' | 'NOT_PASSED' | 'ABSENT' | 'INCOMPLETE';
}

/** Grade-entry coverage for one active subject. */
export interface SubjectCoverageRow {
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  required: boolean;
  gradeCount: number;
  totalStudents: number;
  coveragePct: number;
}

/** Full result returned by the pre-publication validator. */
export interface PublicationValidationResult {
  examinationId: string;
  examinationName: string;
  examinationYear: number;
  examinationStatus: ExamStatus;
  validatedAt: string;
  checks: ValidationCheck[];
  blockingFailures: number;
  warnings: number;
  canPublish: boolean;
  totalStudents: number;
  completeStudents: number;
  incompleteStudents: number;
  totalActiveSubjects: number;
  totalRequiredSubjects: number;
  studentRows: StudentCompletionRow[];
  subjectCoverage: SubjectCoverageRow[];
  statusDistribution: {
    passed: number;
    notPassed: number;
    absent: number;
    incomplete: number;
  };
}

/** Minimal examination data required by the pure validator. */
export interface PublicationExaminationInput {
  id: string;
  name: string;
  year: number;
  status: ExamStatus;
}

/** Minimal active-subject data required by the pure validator. */
export interface PublicationSubjectInput {
  id: string;
  subject_name: string;
  subject_code: string | null;
  required: boolean;
  display_order: number;
}

/** Minimal student data required by the pure validator. */
export interface PublicationStudentInput {
  id: string;
  full_name: string;
  index_number: string;
  nic_number: string | null;
  school_name: string;
}

/** Minimal result data required by the pure validator. */
export interface PublicationGradeInput {
  student_id: string;
  subject_id: string;
  grade: string;
}

/** Computes the public-facing status for a student's active-subject grades. */
export function computeOverallStatus(
  grades: Record<string, string>,
  requiredSubjectIds: string[]
): StudentCompletionRow['overallStatus'] {
  const requiredGrades = requiredSubjectIds.map((id) => grades[id] ?? '');
  const enteredGrades = Object.values(grades);
  if (enteredGrades.length > 0 && enteredGrades.every((grade) => grade === 'AB')) {
    return 'ABSENT';
  }
  if (requiredGrades.some((grade) => grade === '')) return 'INCOMPLETE';
  if (requiredGrades.some((grade) => grade === 'W')) return 'NOT_PASSED';
  return 'PASSED';
}

function duplicateGroups<T>(items: T[], keyFor: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFor(item);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return new Map(Array.from(groups).filter(([, rows]) => rows.length > 1));
}

function check(
  id: string,
  category: string,
  title: string,
  status: CheckStatus,
  message: string,
  affectedItems?: AffectedItem[],
  detail?: string
): ValidationCheck {
  return {
    id,
    category,
    title,
    status,
    message,
    affectedItems,
    detail,
    isBlocking: status === 'fail',
  };
}

/** Builds the complete publication report without performing database access. */
export function buildPublicationValidation(input: {
  examination: PublicationExaminationInput;
  subjects: PublicationSubjectInput[];
  students: PublicationStudentInput[];
  results: PublicationGradeInput[];
  validatedAt?: string;
}): PublicationValidationResult {
  const { examination, subjects, students, results } = input;
  const requiredSubjects = subjects.filter((subject) => subject.required);
  const requiredSubjectIds = requiredSubjects.map((subject) => subject.id);
  const activeSubjectIds = new Set(subjects.map((subject) => subject.id));
  const validGrades = new Set(['A', 'B', 'C', 'S', 'W', 'AB']);
  const activeResults = results.filter((result) => activeSubjectIds.has(result.subject_id));
  const gradesByStudent = new Map<string, Record<string, string>>();
  for (const result of activeResults) {
    const grades = gradesByStudent.get(result.student_id) ?? {};
    grades[result.subject_id] = result.grade.trim().toUpperCase();
    gradesByStudent.set(result.student_id, grades);
  }

  const studentRows: StudentCompletionRow[] = students.map((student) => {
    const grades = gradesByStudent.get(student.id) ?? {};
    const missingSubjects = requiredSubjects
      .filter((subject) => !grades[subject.id])
      .map((subject) => subject.subject_name);
    return {
      studentId: student.id,
      fullName: student.full_name,
      indexNumber: student.index_number,
      schoolName: student.school_name,
      totalRequired: requiredSubjects.length,
      gradesEntered: Object.values(grades).filter(Boolean).length,
      missingSubjects,
      overallStatus: computeOverallStatus(grades, requiredSubjectIds),
    };
  });
  const incompleteRows = studentRows.filter((row) => row.missingSubjects.length > 0);
  const noGradeRows = studentRows.filter((row) => row.gradesEntered === 0);
  const subjectCoverage: SubjectCoverageRow[] = subjects.map((subject) => {
    const gradeCount = activeResults.filter(
      (result) => result.subject_id === subject.id && Boolean(result.grade.trim())
    ).length;
    return {
      subjectId: subject.id,
      subjectName: subject.subject_name,
      subjectCode: subject.subject_code,
      required: subject.required,
      gradeCount,
      totalStudents: students.length,
      coveragePct: students.length ? Math.round((gradeCount / students.length) * 100) : 0,
    };
  });

  const indexDuplicates = duplicateGroups(students, (student) =>
    student.index_number.trim().toUpperCase()
  );
  const nicDuplicates = duplicateGroups(
    students,
    (student) => student.nic_number?.trim().toUpperCase() ?? ''
  );
  const missingIndexes = students.filter((student) => !student.index_number.trim());
  const invalidResults = results.filter(
    (result) => !validGrades.has(result.grade.trim().toUpperCase())
  );
  const zeroCoverage = subjectCoverage.filter((subject) => subject.gradeCount === 0);
  const lowRequiredCoverage = subjectCoverage.filter(
    (subject) => subject.required && subject.totalStudents > 0 && subject.coveragePct < 50
  );
  const incompletePct = students.length
    ? Math.round((incompleteRows.length / students.length) * 100)
    : 0;
  const warningThreshold = Math.ceil(students.length * 0.1);
  const completenessStatus: CheckStatus =
    incompleteRows.length === 0
      ? 'pass'
      : incompleteRows.length <= warningThreshold
        ? 'warn'
        : 'fail';

  const checks: ValidationCheck[] = [
    check(
      'check_1_1',
      'Examination Setup',
      'Examination is available',
      examination.status === 'ARCHIVED' ? 'fail' : 'pass',
      examination.status === 'ARCHIVED'
        ? 'This examination is archived and cannot be published.'
        : 'The examination is available for publication validation.'
    ),
    check(
      'check_1_2',
      'Examination Setup',
      'Publication state',
      examination.status === 'PUBLISHED' ? 'info' : 'pass',
      examination.status === 'PUBLISHED'
        ? 'This examination is currently published. You may unpublish it.'
        : 'This examination is not currently published.'
    ),
    check(
      'check_1_3',
      'Examination Setup',
      'Active subjects configured',
      subjects.length ? 'pass' : 'fail',
      subjects.length
        ? `${subjects.length} active subject${subjects.length === 1 ? ' is' : 's are'} configured.`
        : 'No active subjects found. Add at least one subject before publishing.'
    ),
    check(
      'check_1_4',
      'Examination Setup',
      'Required subjects configured',
      requiredSubjects.length ? 'pass' : 'warn',
      requiredSubjects.length
        ? `${requiredSubjects.length} required subject${requiredSubjects.length === 1 ? ' is' : 's are'} configured.`
        : 'No required subjects are defined. Overall pass/fail status may not be meaningful.'
    ),
    check(
      'check_2_1',
      'Student Records',
      'Students available',
      students.length ? 'pass' : 'fail',
      students.length
        ? `${students.length} student record${students.length === 1 ? ' is' : 's are'} available.`
        : 'No students found. Import or add students before publishing.'
    ),
    check(
      'check_2_2',
      'Student Records',
      'Unique index numbers',
      indexDuplicates.size ? 'fail' : 'pass',
      indexDuplicates.size
        ? 'Duplicate index numbers detected. Each student must have a unique index number.'
        : 'All student index numbers are unique.',
      Array.from(indexDuplicates, ([indexNumber, rows]) => ({
        label: indexNumber,
        detail: rows.map((row) => `${row.full_name} (${row.id})`).join(', '),
      }))
    ),
    check(
      'check_2_3',
      'Student Records',
      'Unique NIC numbers',
      nicDuplicates.size ? 'fail' : 'pass',
      nicDuplicates.size
        ? 'Duplicate NIC numbers detected. Each NIC must belong to one student only.'
        : 'All supplied NIC numbers are unique.',
      Array.from(nicDuplicates, ([nic, rows]) => ({
        label: maskNIC(nic) ?? 'Masked NIC',
        detail: rows.map((row) => `${row.full_name} (${row.index_number})`).join(', '),
      }))
    ),
    check(
      'check_2_4',
      'Student Records',
      'Index numbers present',
      missingIndexes.length ? 'fail' : 'pass',
      missingIndexes.length
        ? 'Some students are missing index numbers.'
        : 'Every student has an index number.',
      missingIndexes.map((student) => ({ label: student.full_name, detail: student.id }))
    ),
    check(
      'check_3_1',
      'Grade Completeness',
      'Required-grade completeness',
      completenessStatus,
      incompleteRows.length === 0
        ? `All ${students.length} students have complete results for required subjects.`
        : completenessStatus === 'warn'
          ? `${incompleteRows.length} students are missing required grades. You may still publish, but their results will show as Incomplete.`
          : `${incompleteRows.length} students (${incompletePct}%) have incomplete required-subject grades. Review and fix them before publishing.`,
      incompleteRows.map((row) => ({
        label: `${row.fullName} (${row.indexNumber || 'no index'})`,
        detail: `Missing: ${row.missingSubjects.join(', ')}`,
      }))
    ),
    check(
      'check_3_2',
      'Grade Completeness',
      'Students have entered grades',
      noGradeRows.length ? 'warn' : 'pass',
      noGradeRows.length
        ? `${noGradeRows.length} students have no grades entered at all.`
        : 'Every student has at least one active-subject grade.',
      noGradeRows.map((row) => ({
        label: row.fullName,
        detail: row.indexNumber || 'No index number',
      }))
    ),
    check(
      'check_3_3',
      'Grade Completeness',
      'Grade values are valid',
      invalidResults.length ? 'fail' : 'pass',
      invalidResults.length
        ? 'Invalid grade values detected in the database. This indicates corrupted data—contact support.'
        : 'All stored grade values are valid.',
      invalidResults.map((result) => ({
        label: result.student_id,
        detail: `Subject ${result.subject_id}: ${result.grade}`,
      }))
    ),
    check(
      'check_4_1',
      'Subject Coverage',
      'Active subject summary',
      'info',
      `${subjects.length} active: ${requiredSubjects.length} required and ${subjects.length - requiredSubjects.length} optional.`
    ),
    check(
      'check_4_2',
      'Subject Coverage',
      'Subjects have grade coverage',
      zeroCoverage.length ? 'warn' : 'pass',
      zeroCoverage.length
        ? `${zeroCoverage.length} active subject${zeroCoverage.length === 1 ? ' has' : 's have'} no grades entered.`
        : 'Every active subject has at least one grade.',
      zeroCoverage.map((subject) => ({
        label: subject.subjectName,
        detail: 'No grades entered for any student.',
      }))
    ),
    check(
      'check_4_3',
      'Subject Coverage',
      'Required-subject coverage',
      lowRequiredCoverage.length ? 'warn' : 'pass',
      lowRequiredCoverage.length
        ? `${lowRequiredCoverage.length} required subject${lowRequiredCoverage.length === 1 ? ' has' : 's have'} less than 50% coverage.`
        : 'Required subjects meet the minimum coverage threshold.',
      lowRequiredCoverage.map((subject) => ({
        label: subject.subjectName,
        detail: `${subject.gradeCount}/${subject.totalStudents} students (${subject.coveragePct}%).`,
      }))
    ),
  ];

  const statusDistribution = {
    passed: studentRows.filter((row) => row.overallStatus === 'PASSED').length,
    notPassed: studentRows.filter((row) => row.overallStatus === 'NOT_PASSED').length,
    absent: studentRows.filter((row) => row.overallStatus === 'ABSENT').length,
    incomplete: studentRows.filter((row) => row.overallStatus === 'INCOMPLETE').length,
  };
  const blockingFailures = checks.filter(
    (item) => item.status === 'fail' && item.isBlocking
  ).length;
  return {
    examinationId: examination.id,
    examinationName: examination.name,
    examinationYear: examination.year,
    examinationStatus: examination.status,
    validatedAt: input.validatedAt ?? new Date().toISOString(),
    checks,
    blockingFailures,
    warnings: checks.filter((item) => item.status === 'warn').length,
    canPublish: blockingFailures === 0,
    totalStudents: students.length,
    completeStudents: students.length - incompleteRows.length,
    incompleteStudents: incompleteRows.length,
    totalActiveSubjects: subjects.length,
    totalRequiredSubjects: requiredSubjects.length,
    studentRows,
    subjectCoverage,
    statusDistribution,
  };
}
