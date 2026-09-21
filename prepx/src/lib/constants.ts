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

export const RESULT_STATUSES = ['Passed', 'Not Passed', 'Absent', 'Incomplete'] as const;
export type ResultStatus = (typeof RESULT_STATUSES)[number];
