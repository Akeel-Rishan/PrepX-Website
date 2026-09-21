import type { Grade, ResultStatus } from '@/lib/constants';
import type { Database } from './database';

// ── DB Row convenience types ────────────────────────────────────────────────
export type Examination = Database['public']['Tables']['examinations']['Row'];
export type Student = Database['public']['Tables']['students']['Row'];
export type Subject = Database['public']['Tables']['subjects']['Row'];
export type StudentResult = Database['public']['Tables']['student_results']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type AdminProfile = Database['public']['Tables']['admin_profiles']['Row'];

// ── Insert types ────────────────────────────────────────────────────────────
export type ExaminationInsert = Database['public']['Tables']['examinations']['Insert'];
export type StudentInsert = Database['public']['Tables']['students']['Insert'];
export type SubjectInsert = Database['public']['Tables']['subjects']['Insert'];
export type StudentResultInsert = Database['public']['Tables']['student_results']['Insert'];
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];

// ── Update types ────────────────────────────────────────────────────────────
export type ExaminationUpdate = Database['public']['Tables']['examinations']['Update'];
export type StudentUpdate = Database['public']['Tables']['students']['Update'];
export type SubjectUpdate = Database['public']['Tables']['subjects']['Update'];
export type StudentResultUpdate = Database['public']['Tables']['student_results']['Update'];

// ── Public search types ─────────────────────────────────────────────────────

/** Input submitted by a student on the public search form */
export interface SearchInput {
  indexNumber?: string;
  nicNumber?: string;
}

/** One subject's grade entry within a student's result */
export interface GradeEntry {
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  displayOrder: number;
  grade: Grade | null;
}

/**
 * The full result returned to the public after a successful search.
 * NIC is always masked here. Raw marks, totals, and rank are never included.
 */
export interface PublicStudentResult {
  studentName: string;
  indexNumber: string;
  maskedNic: string | null;
  schoolName: string;
  examinationCenter: string | null;
  examinationName: string;
  examinationYear: number;
  grades: GradeEntry[];
  overallStatus: ResultStatus;
}

// ── Generic API response ────────────────────────────────────────────────────

export interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ── Admin list / pagination ─────────────────────────────────────────────────

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationInfo;
}

// ── Import types ────────────────────────────────────────────────────────────

/** One parsed row from an uploaded Excel/CSV file */
export interface ImportRow {
  index_number: string;
  nic_number?: string;
  full_name: string;
  school_name: string;
  examination_center?: string;
  [subjectCode: string]: string | undefined;
}

/** Validation result for a single import row */
export interface ImportRowValidation {
  rowIndex: number;
  data: ImportRow;
  errors: string[];
  isValid: boolean;
}

/** Result of the full import parse + validate step */
export interface ImportValidationResult {
  rows: ImportRowValidation[];
  validCount: number;
  errorCount: number;
  detectedSubjects: string[];
}
