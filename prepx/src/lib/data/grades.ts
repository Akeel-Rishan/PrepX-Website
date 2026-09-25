import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
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
  completeSummary: {
    complete: number;
    incomplete: number;
    empty: number;
  };
}

export interface GradeChange {
  studentId: string;
  subjectId: string;
  grade: string | null;
}

function emptyGrid(page: number, pageSize: number): GradeGridData {
  return {
    students: [],
    subjects: [],
    totalCount: 0,
    totalPages: 0,
    currentPage: page,
    pageSize,
    completeSummary: { complete: 0, incomplete: 0, empty: 0 },
  };
}

export async function getGradeGridData(filters: {
  examinationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<GradeGridData> {
  noStore();
  const pageSize = Math.max(1, Math.min(filters.pageSize ?? 25, 100));
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = createAdminClient();

  let studentQuery = supabase
    .from('students')
    .select('id, full_name, index_number, school_name', { count: 'exact' })
    .eq('examination_id', filters.examinationId)
    .order('index_number', { ascending: true })
    .range(from, to);

  const search = filters.search?.trim();
  if (search) {
    // PostgREST uses commas to separate OR clauses, so strip filter syntax.
    const safeSearch = search.replace(/[,%_()]/g, ' ').trim();
    if (safeSearch) {
      studentQuery = studentQuery.or(
        `full_name.ilike.%${safeSearch}%,index_number.ilike.%${safeSearch}%`
      );
    }
  }

  try {
    const [studentsResult, subjectsResult, allStudentsResult] = await Promise.all([
      studentQuery,
      supabase
        .from('subjects')
        .select('*')
        .eq('examination_id', filters.examinationId)
        .eq('active', true)
        .order('display_order', { ascending: true }),
      supabase.from('students').select('id').eq('examination_id', filters.examinationId),
    ]);

    if (studentsResult.error || subjectsResult.error || allStudentsResult.error) {
      console.error('[grades] Grid query failed', {
        students: studentsResult.error?.code,
        subjects: subjectsResult.error?.code,
        summary: allStudentsResult.error?.code,
      });
      return emptyGrid(page, pageSize);
    }

    const studentRows = studentsResult.data ?? [];
    const subjects = subjectsResult.data ?? [];
    const studentIds = studentRows.map((student) => student.id);
    const allStudentIds = (allStudentsResult.data ?? []).map((student) => student.id);
    const requiredSubjectIds = subjects.filter((subject) => subject.required).map((subject) => subject.id);

    const [pageGradesResult, allGradesResult] = await Promise.all([
      studentIds.length
        ? supabase
            .from('student_results')
            .select('student_id, subject_id, grade')
            .in('student_id', studentIds)
        : Promise.resolve({ data: [], error: null }),
      allStudentIds.length && requiredSubjectIds.length
        ? supabase
            .from('student_results')
            .select('student_id, subject_id')
            .in('student_id', allStudentIds)
            .in('subject_id', requiredSubjectIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (pageGradesResult.error || allGradesResult.error) {
      console.error('[grades] Results query failed', {
        page: pageGradesResult.error?.code,
        summary: allGradesResult.error?.code,
      });
      return emptyGrid(page, pageSize);
    }

    const gradesMap = new Map<string, Array<{ subject_id: string; grade: string }>>();
    for (const row of pageGradesResult.data ?? []) {
      const grades = gradesMap.get(row.student_id) ?? [];
      grades.push({ subject_id: row.subject_id, grade: row.grade });
      gradesMap.set(row.student_id, grades);
    }

    const students: StudentGradeRow[] = studentRows.map((student) => ({
      ...student,
      grades: gradesMap.get(student.id) ?? [],
    }));

    let complete = 0;
    let incomplete = 0;
    let empty = 0;
    if (requiredSubjectIds.length === 0) {
      empty = allStudentIds.length;
    } else {
      const coverage = new Map<string, Set<string>>();
      for (const row of allGradesResult.data ?? []) {
        const subjectIds = coverage.get(row.student_id) ?? new Set<string>();
        subjectIds.add(row.subject_id);
        coverage.set(row.student_id, subjectIds);
      }
      for (const studentId of allStudentIds) {
        const covered = coverage.get(studentId);
        if (!covered?.size) empty += 1;
        else if (requiredSubjectIds.every((subjectId) => covered.has(subjectId))) complete += 1;
        else incomplete += 1;
      }
    }

    const totalCount = studentsResult.count ?? 0;
    return {
      students,
      subjects,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      currentPage: page,
      pageSize,
      completeSummary: { complete, incomplete, empty },
    };
  } catch {
    console.error('[grades] Grid query failed unexpectedly');
    return emptyGrid(page, pageSize);
  }
}
