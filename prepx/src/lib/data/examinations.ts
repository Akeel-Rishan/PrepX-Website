import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { normalizeExamStatus } from '@/lib/examination-list';
import type { Examination } from '@/types/index';

export type ExaminationWithCount = Examination & { studentCount: number };

export async function getExaminationsWithCounts(filters?: {
  status?: string;
}): Promise<ExaminationWithCount[]> {
  noStore();
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('examinations')
      .select('*')
      .order('year', { ascending: false })
      .order('created_at', { ascending: false });
    const status = normalizeExamStatus(filters?.status);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
      console.error('[examinations] List query failed', { code: error.code });
      return [];
    }
    const exams: Examination[] = data ?? [];
    if (exams.length === 0) return [];

    const countMap = new Map<string, number>();
    try {
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('examination_id')
        .in(
          'examination_id',
          exams.map((exam) => exam.id)
        );
      if (studentsError) {
        console.error('[examinations] Student count query failed', { code: studentsError.code });
      } else {
        const rows: { examination_id: string }[] = students ?? [];
        for (const student of rows) {
          countMap.set(student.examination_id, (countMap.get(student.examination_id) ?? 0) + 1);
        }
      }
    } catch {
      console.error('[examinations] Student count query failed unexpectedly');
    }
    return exams.map((exam) => ({ ...exam, studentCount: countMap.get(exam.id) ?? 0 }));
  } catch {
    console.error('[examinations] List query failed unexpectedly');
    return [];
  }
}

export async function getExaminationById(id: string): Promise<Examination | null> {
  noStore();
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('examinations').select('*').eq('id', id).single();
    if (error) {
      console.error('[examinations] Detail query failed', { code: error.code });
      return null;
    }
    return data;
  } catch {
    console.error('[examinations] Detail query failed unexpectedly');
    return null;
  }
}
