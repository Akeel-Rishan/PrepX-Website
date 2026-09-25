import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import type { Student, Examination } from '@/types';

export type StudentWithExam = Student & {
  examination: Pick<Examination, 'id' | 'name' | 'year'> | null;
};
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
  examination:examinations!examination_id(id, name, year)`;

// Escape LIKE wildcards; quoted OR values also protect PostgREST delimiters.
function contains(value: string): string {
  return `%${value.replace(/[\\%_*]/g, '\\$&')}%`;
}

export async function getStudentsWithPagination(
  filters: StudentFilters = {}
): Promise<PaginatedStudents> {
  noStore();
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
          return getStudentsWithPagination({ ...filters, page: lastPage, pageSize });
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
      return getStudentsWithPagination({ ...filters, page: currentPage, pageSize });
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

export async function getDistinctSchools(examinationId?: string): Promise<string[]> {
  noStore();
  try {
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
        return [];
      }
      const rows: Pick<Student, 'school_name'>[] = data ?? [];
      for (const row of rows) if (row.school_name?.trim()) schools.add(row.school_name);
      if (rows.length < 1000) break;
    }
    return Array.from(schools).sort();
  } catch {
    console.error('[Students Schools Error] Query failed unexpectedly');
    return [];
  }
}

export async function getStudentById(id: string): Promise<StudentWithExam | null> {
  noStore();
  if (!uuid.test(id)) return null;
  try {
    const { data, error } = await createAdminClient()
      .from('students')
      .select('*, examination:examinations!examination_id(id, name, year)')
      .eq('id', id)
      .single();
    if (error) {
      console.error('[Student Query Error]', { code: error.code });
      return null;
    }
    return data as unknown as StudentWithExam;
  } catch {
    console.error('[Student Query Error] Query failed unexpectedly');
    return null;
  }
}
