import 'server-only';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import type { Student, Examination } from '@/types';

export type StudentWithExam = Student & {
  examination: Pick<Examination, 'id' | 'name' | 'year' | 'status'> | null;
};
export type StudentDetail = StudentWithExam & { resultCount: number };
export interface StudentFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  examinationId?: string;
  school?: string;
}
export interface PaginatedStudents {
  students: StudentWithExam[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const selection = `id, examination_id, full_name, index_number, nic_number,
  school_name, examination_center, created_at, updated_at,
  examination:examinations!examination_id(id, name, year, status)`;

// Escape LIKE wildcards; quoted OR values also protect PostgREST delimiters.
function contains(value: string): string {
  return `%${value.replace(/[\\%_*]/g, '\\$&')}%`;
}

async function queryStudentsWithPagination(
  filters: StudentFilters = {}
): Promise<PaginatedStudents> {
  const pageSize =
    Number.isSafeInteger(filters.pageSize) && filters.pageSize! > 0
      ? Math.min(filters.pageSize!, 1000)
      : 25;
  const page = Number.isSafeInteger(filters.page) && filters.page! > 0 ? filters.page! : 1;
  const empty = { students: [], totalCount: 0, totalPages: 0, currentPage: page, pageSize };
  try {
    const supabase = createAdminClient();
    const makeQuery = (head = false) => {
      let query = supabase.from('students').select(selection, { count: 'exact', head });
      const search = filters.search?.trim();
      if (search) {
        const pattern = JSON.stringify(contains(search));
        query = query.or(
          `full_name.ilike.${pattern},index_number.ilike.${pattern},school_name.ilike.${pattern}`
        );
      }
      if (filters.examinationId && uuid.test(filters.examinationId)) {
        query = query.eq('examination_id', filters.examinationId);
      }
      if (filters.school?.trim())
        query = query.ilike('school_name', contains(filters.school.trim()));
      return query.order('created_at', { ascending: false }).order('id', { ascending: false });
    };
    const from = (page - 1) * pageSize;
    const { data, count, error } = await makeQuery().range(from, from + pageSize - 1);
    if (error?.code === 'PGRST103' && page > 1) {
      const { count: matchingCount, error: countError } = await makeQuery(true);
      if (!countError) {
        const lastPage = Math.max(1, Math.ceil((matchingCount ?? 0) / pageSize));
        if (lastPage < page) {
          return queryStudentsWithPagination({ ...filters, page: lastPage, pageSize });
        }
      }
    }
    if (error) {
      console.error('[Students Query Error]', { code: error.code });
      return empty;
    }
    const totalCount = count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    const currentPage = Math.min(page, Math.max(1, totalPages));
    if (currentPage !== page && totalCount > 0) {
      return queryStudentsWithPagination({ ...filters, page: currentPage, pageSize });
    }
    return {
      students: (data as unknown as StudentWithExam[]) ?? [],
      totalCount,
      totalPages,
      currentPage,
      pageSize,
    };
  } catch {
    console.error('[Students Query Error] Query failed unexpectedly');
    return empty;
  }
}

const readStudentsWithPagination = unstable_cache(
  async (
    page: number,
    pageSize: number,
    search: string,
    examinationId: string,
    school: string
  ): Promise<PaginatedStudents> =>
    queryStudentsWithPagination({ page, pageSize, search, examinationId, school }),
  ['students-with-pagination-v1'],
  { revalidate: 30, tags: ['students'] }
);

export async function getStudentsWithPagination(
  filters: StudentFilters = {}
): Promise<PaginatedStudents> {
  return readStudentsWithPagination(
    filters.page ?? 1,
    filters.pageSize ?? 25,
    filters.search?.trim() ?? '',
    filters.examinationId && uuid.test(filters.examinationId) ? filters.examinationId : '',
    filters.school?.trim() ?? ''
  );
}

const readDistinctSchools = unstable_cache(
  async (examinationId: string): Promise<string[]> => {
    const supabase = createAdminClient();
    const schools = new Set<string>();
    // Read all batches so Supabase's row limit cannot truncate the dropdown.
    for (let from = 0; ; from += 1000) {
      let query = supabase.from('students').select('school_name').not('school_name', 'is', null);
      if (examinationId && uuid.test(examinationId))
        query = query.eq('examination_id', examinationId);
      const { data, error } = await query.order('id').range(from, from + 999);
      if (error) {
        console.error('[Students Schools Error]', { code: error.code });
        throw new Error('School options query failed');
      }
      const rows: Pick<Student, 'school_name'>[] = data ?? [];
      for (const row of rows) if (row.school_name?.trim()) schools.add(row.school_name);
      if (rows.length < 1000) break;
    }
    return Array.from(schools).sort();
  },
  ['student-school-options-v1'],
  { revalidate: 60, tags: ['student-lookups'] }
);

export async function getDistinctSchools(examinationId?: string): Promise<string[]> {
  try {
    return await readDistinctSchools(
      examinationId && uuid.test(examinationId) ? examinationId : ''
    );
  } catch {
    console.error('[Students Schools Error] Query failed unexpectedly');
    return [];
  }
}

const readStudentById = unstable_cache(
  async (id: string): Promise<StudentDetail | null> => {
  try {
    const { data, error } = await createAdminClient()
      .from('students')
      .select(
        '*, examination:examinations!examination_id(id, name, year, status), student_results(count)'
      )
      .eq('id', id)
      .single();
    if (error) {
      console.error('[Student Query Error]', { code: error.code });
      return null;
    }
    const row = data as unknown as StudentWithExam & {
      student_results: Array<{ count: number }>;
    };
    const { student_results: results, ...student } = row;
    return { ...student, resultCount: results[0]?.count ?? 0 };
  } catch {
    console.error('[Student Query Error] Query failed unexpectedly');
    return null;
  }
  },
  ['student-by-id-v1'],
  { revalidate: 30, tags: ['students', 'results'] }
);

// Metadata and the page share one lookup during this server render only.
export const getStudentById = cache(async (id: string): Promise<StudentDetail | null> => {
  if (!uuid.test(id)) return null;
  return readStudentById(id);
});
