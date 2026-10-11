export const GRADES = ['A', 'B', 'C', 'S', 'W', 'AB'] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_LABELS: Record<Grade, string> = {
  A: 'Distinction',
  B: 'Very Good',
  C: 'Credit',
  S: 'Pass',
  W: 'Fail',
  AB: 'Absent',
};

export const EXAM_STATUSES = ['DRAFT', 'READY', 'PUBLISHED', 'ARCHIVED'] as const;
export type ExamStatus = (typeof EXAM_STATUSES)[number];

export const EDITABLE_EXAM_STATUSES = ['DRAFT', 'READY'] as const satisfies readonly ExamStatus[];

// Keep direct uploads below Vercel's 4.5 MB Function payload ceiling. The
// remaining space is reserved for the multipart Server Action envelope.
export const MAX_IMPORT_BYTES = 4_000_000;
export const MAX_IMPORT_SIZE_LABEL = '4 MB';

export function isExamEditable(status: ExamStatus): boolean {
  return (EDITABLE_EXAM_STATUSES as readonly ExamStatus[]).includes(status);
}

export const RESULT_STATUSES = ['Passed', 'Not Passed', 'Absent', 'Incomplete'] as const;
export type ResultStatus = (typeof RESULT_STATUSES)[number];
