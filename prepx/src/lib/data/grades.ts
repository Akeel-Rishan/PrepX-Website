import 'server-only';

import { getGradeOverview } from '@/lib/data/grade-overview';
import { normalizePage, normalizePageSize } from '@/lib/pagination';
import type { Subject } from '@/types';

export interface StudentGradeRow {
  id: string;
  full_name: string;
  index_number: string;
  school_name: string;
  grades: Array<{ subject_id: string; grade: string }>;
}

export interface GradeGridData {
  students: StudentGradeRow[];
  subjects: Subject[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  completeSummary: { complete: number; incomplete: number; empty: number };
  error?: string;
}

export interface GradeChange {
  studentId: string;
  subjectId: string;
  grade: string | null;
}

export async function getGradeGridData(filters: {
  examinationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<GradeGridData> {
  const pageSize = normalizePageSize(filters.pageSize);
  const requestedPage = normalizePage(filters.page);
  const empty: GradeGridData = {
    students: [], subjects: [], totalCount: 0, totalPages: 0, currentPage: 1, pageSize,
    completeSummary: { complete: 0, incomplete: 0, empty: 0 },
  };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.examinationId)) return empty;
  try {
    const overview = await getGradeOverview(filters.examinationId);
    const byStudent = new Map<string, StudentGradeRow['grades']>();
    for (const { student_id, subject_id, grade } of overview.grades) {
      const grades = byStudent.get(student_id) ?? [];
      grades.push({ subject_id, grade });
      byStudent.set(student_id, grades);
    }
    const required = overview.subjects.filter(subject => subject.required).map(subject => subject.id);
    const completeSummary = { complete: 0, incomplete: 0, empty: 0 };
    for (const student of overview.students) {
      const grades = new Set((byStudent.get(student.id) ?? []).map(grade => grade.subject_id));
      if (!grades.size) completeSummary.empty++;
      else if (required.every(id => grades.has(id))) completeSummary.complete++;
      else completeSummary.incomplete++;
    }
    const search = filters.search?.trim().toLowerCase();
    const matching = search ? overview.students.filter(student =>
      student.full_name.toLowerCase().includes(search) || student.index_number.toLowerCase().includes(search)
    ) : overview.students;
    const totalCount = matching.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const currentPage = Math.min(requestedPage, Math.max(1, totalPages));
    const from = (currentPage - 1) * pageSize;
    return {
      students: matching.slice(from, from + pageSize).map(student => ({ ...student, grades: byStudent.get(student.id) ?? [] })),
      subjects: overview.subjects, totalCount, totalPages, currentPage, pageSize, completeSummary,
    };
  } catch {
    return { ...empty, currentPage: requestedPage, error: 'Grades could not be loaded. Please try again.' };
  }
}
