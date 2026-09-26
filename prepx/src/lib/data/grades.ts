import 'server-only';

import { unstable_cache } from 'next/cache';
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
  completeSummary: { complete: number; incomplete: number; empty: number };
}

export interface GradeChange {
  studentId: string;
  subjectId: string;
  grade: string | null;
}

type AdminClient = ReturnType<typeof createAdminClient>;
type GradeRecord = { student_id: string; subject_id: string; grade: string };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function emptyGrid(page: number, pageSize: number): GradeGridData {
  return {
    students: [], subjects: [], totalCount: 0, totalPages: 0, currentPage: page, pageSize,
    completeSummary: { complete: 0, incomplete: 0, empty: 0 },
  };
}

function contains(value: string): string {
  return `%${value.replace(/[\\%_*]/g, '\\$&')}%`;
}

async function loadAllStudentIds(client: AdminClient, examinationId: string): Promise<string[]> {
  const ids: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from('students').select('id')
      .eq('examination_id', examinationId).order('id').range(from, from + 999);
    if (error) throw new Error(`student-summary:${error.code}`);
    ids.push(...(data ?? []).map((student) => student.id));
    if ((data?.length ?? 0) < 1000) break;
  }
  return ids;
}

async function loadActiveGrades(
  client: AdminClient,
  studentIds: string[],
  subjectIds: string[]
): Promise<GradeRecord[]> {
  if (!studentIds.length || !subjectIds.length) return [];
  const grades: GradeRecord[] = [];
  // Small IN batches prevent oversized URLs. Explicit ranges avoid silently
  // truncating whole-examination summaries at the API's default row limit.
  for (let start = 0; start < studentIds.length; start += 100) {
    const batch = studentIds.slice(start, start + 100);
    for (let from = 0; ; from += 1000) {
      const { data, error } = await client.from('student_results')
        .select('student_id, subject_id, grade').in('student_id', batch)
        .in('subject_id', subjectIds).order('id').range(from, from + 999);
      if (error) throw new Error(`grade-summary:${error.code}`);
      grades.push(...(data ?? []));
      if ((data?.length ?? 0) < 1000) break;
    }
  }
  return grades;
}

/** Loads a paginated grade grid plus an exact whole-examination completion summary. */
async function queryGradeGridData(filters: {
  examinationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<GradeGridData> {
  const pageSize = Math.max(1, Math.min(filters.pageSize ?? 25, 100));
  const requestedPage = Math.max(1, filters.page ?? 1);
  if (!UUID_REGEX.test(filters.examinationId)) return emptyGrid(1, pageSize);

  const client = createAdminClient();
  const search = filters.search?.trim();
  const makeFilteredStudentQuery = (head = false) => {
    let query = client.from('students')
      .select('id, full_name, index_number, school_name', { count: 'exact', head })
      .eq('examination_id', filters.examinationId);
    if (search) {
      const pattern = JSON.stringify(contains(search));
      query = query.or(`full_name.ilike.${pattern},index_number.ilike.${pattern}`);
    }
    return query;
  };

  try {
    const [countResult, subjectsResult, allStudentIds] = await Promise.all([
      makeFilteredStudentQuery(true),
      client.from('subjects').select('*').eq('examination_id', filters.examinationId)
        .eq('active', true).order('display_order', { ascending: true }).order('id'),
      loadAllStudentIds(client, filters.examinationId),
    ]);
    if (countResult.error || subjectsResult.error) {
      console.error('[grades] Grid query failed', {
        students: countResult.error?.code, subjects: subjectsResult.error?.code,
      });
      return emptyGrid(requestedPage, pageSize);
    }

    const totalCount = countResult.count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    const currentPage = totalPages ? Math.min(requestedPage, totalPages) : 1;
    const from = (currentPage - 1) * pageSize;
    const subjects = subjectsResult.data ?? [];
    const activeSubjectIds = subjects.map((subject) => subject.id);
    const [pageStudentsResult, allGrades] = await Promise.all([
      makeFilteredStudentQuery().order('index_number', { ascending: true }).order('id')
        .range(from, from + pageSize - 1),
      loadActiveGrades(client, allStudentIds, activeSubjectIds),
    ]);
    if (pageStudentsResult.error) {
      console.error('[grades] Student page query failed', { code: pageStudentsResult.error.code });
      return emptyGrid(currentPage, pageSize);
    }

    const gradesByStudent = new Map<string, Array<{ subject_id: string; grade: string }>>();
    for (const row of allGrades) {
      const grades = gradesByStudent.get(row.student_id) ?? [];
      grades.push({ subject_id: row.subject_id, grade: row.grade });
      gradesByStudent.set(row.student_id, grades);
    }
    const students: StudentGradeRow[] = (pageStudentsResult.data ?? []).map((student) => ({
      ...student,
      grades: gradesByStudent.get(student.id) ?? [],
    }));

    const requiredSubjectIds = subjects.filter((subject) => subject.required)
      .map((subject) => subject.id);
    let complete = 0;
    let incomplete = 0;
    let empty = 0;
    for (const studentId of allStudentIds) {
      const gradeIds = new Set(
        (gradesByStudent.get(studentId) ?? []).map((grade) => grade.subject_id)
      );
      if (gradeIds.size === 0) empty += 1;
      else if (requiredSubjectIds.every((subjectId) => gradeIds.has(subjectId))) complete += 1;
      else incomplete += 1;
    }

    return {
      students, subjects, totalCount, totalPages, currentPage, pageSize,
      completeSummary: { complete, incomplete, empty },
    };
  } catch (error) {
    console.error('[grades] Grid query failed unexpectedly', {
      reason: error instanceof Error ? error.message.split(':', 1)[0] : 'unknown',
    });
    return emptyGrid(requestedPage, pageSize);
  }
}

const readGradeGridData = unstable_cache(
  async (
    examinationId: string,
    page: number,
    pageSize: number,
    search: string
  ): Promise<GradeGridData> =>
    queryGradeGridData({ examinationId, page, pageSize, search }),
  ['grade-grid-data-v1'],
  { revalidate: 30, tags: ['results', 'students', 'subjects'] }
);

export async function getGradeGridData(filters: {
  examinationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<GradeGridData> {
  return readGradeGridData(
    filters.examinationId,
    filters.page ?? 1,
    filters.pageSize ?? 25,
    filters.search?.trim() ?? ''
  );
}
