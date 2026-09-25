import 'server-only';

import { unstable_cache, unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { normalizeExamStatus } from '@/lib/examination-list';
import type { Examination } from '@/types/index';

export type ExaminationWithCount = Examination & { studentCount: number };

export async function getExaminationsWithCounts(filters?: {
  status?: string;
}): Promise<ExaminationWithCount[]> {
  noStore();
  try {
    let query = createAdminClient()
      .from('examinations')
      .select('*, students(count)')
      .order('year', { ascending: false })
      .order('created_at', { ascending: false });
    const status = normalizeExamStatus(filters?.status);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) {
      console.error('[examinations] List query failed', { code: error.code });
      return [];
    }
    // Count in PostgreSQL rather than downloading every student's exam ID.
    // Embedded counts also avoid the default 1,000-row response cap.
    return (data ?? []).map(({ students, ...exam }) => ({
      ...exam,
      studentCount: students[0]?.count ?? 0,
    }));
  } catch {
    console.error('[examinations] List query failed unexpectedly');
    return [];
  }
}

const readExaminationOptions = unstable_cache(
  async () => {
    const { data, error } = await createAdminClient()
      .from('examinations')
      .select('id, name, year')
      .order('year', { ascending: false })
      .order('name');
    if (error) throw new Error('Examination options query failed');
    return data ?? [];
  },
  ['examination-options-v1'],
  { revalidate: 60, tags: ['student-lookups', 'examinations'] }
);

export async function getExaminationOptions(): Promise<
  Pick<Examination, 'id' | 'name' | 'year'>[]
> {
  noStore();
  try {
    return await readExaminationOptions();
  } catch {
    console.error('[examinations] Options query failed');
    return [];
  }
}

export async function getExaminationById(id: string): Promise<Examination | null> {
  noStore();
  try {
    const { data, error } = await createAdminClient()
      .from('examinations')
      .select('*')
      .eq('id', id)
      .single();
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
