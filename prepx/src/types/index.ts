import type { Grade, ResultStatus } from '@/lib/constants';

export interface SearchInput {
  indexNumber?: string;
  nicNumber?: string;
}

export interface GradeEntry {
  subjectId: string;
  subjectName: string;
  grade: Grade | null;
}

export interface StudentResult {
  studentName: string;
  indexNumber: string;
  nicNumber: string;
  examinationName: string;
  grades: GradeEntry[];
  status: ResultStatus;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
