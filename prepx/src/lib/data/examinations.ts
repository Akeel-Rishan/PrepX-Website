import 'server-only';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { normalizeExamStatus } from '@/lib/examination-list';
import type { Examination } from '@/types/index';
import { EDITABLE_EXAM_STATUSES, type ExamStatus } from '@/lib/constants';

export type ExaminationWithCount = Examination & { studentCount: number };
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const readExaminationsWithCounts = unstable_cache(
  async (status: ExamStatus | null): Promise<ExaminationWithCount[]> => {
    try {
      const client = createAdminClient();
      const rows: Array<Examination & { students: Array<{ count: number }> }> = [];
      for (let from = 0; ; from += 1000) {
        let query = client
          .from('examinations')
          .select('*, students(count)')
          .order('year', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, from + 999);
        if (status) query = query.eq('status', status);
        const { data, error } = await query;
        if (error) {
          console.error('[examinations] List query failed', { code: error.code });
          return [];
        }
        rows.push(...(data ?? []));
        if ((data?.length ?? 0) < 1000) break;
      }
      // Count in PostgreSQL rather than downloading every student's exam ID.
      // Embedded counts also avoid the default 1,000-row response cap.
      return rows.map(({ students, ...exam }) => ({
        ...exam,
        studentCount: students[0]?.count ?? 0,
      }));
    } catch {
      console.error('[examinations] List query failed unexpectedly');
      return [];
    }
  },
  ['examinations-with-counts-v2'],
  { revalidate: 30, tags: ['examinations'] }
);

export async function getExaminationsWithCounts(filters?: {
  status?: string;
}): Promise<ExaminationWithCount[]> {
  return readExaminationsWithCounts(normalizeExamStatus(filters?.status));
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
  try {
    return await readExaminationOptions();
  } catch {
    console.error('[examinations] Options query failed');
    return [];
  }
}

const readEditableExaminationOptions = unstable_cache(
  async () => {
    const { data, error } = await createAdminClient()
      .from('examinations')
      .select('id, name, year')
      .in('status', [...EDITABLE_EXAM_STATUSES])
      .order('year', { ascending: false })
      .order('name');
    if (error) throw new Error('Editable examination options query failed');
    return data ?? [];
  },
  ['editable-examination-options-v1'],
  { revalidate: 60, tags: ['student-lookups', 'examinations'] }
);

export async function getEditableExaminationOptions(): Promise<
  Pick<Examination, 'id' | 'name' | 'year'>[]
> {
  try {
    return await readEditableExaminationOptions();
  } catch {
    console.error('[examinations] Editable options query failed');
    return [];
  }
}

const readExaminationById = unstable_cache(
  async (id: string): Promise<Examination | null> => {
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
  },
  ['examination-by-id-v2'],
  { revalidate: 30, tags: ['examinations'] }
);

// Metadata and pages can request the same record during one render.
export const getExaminationById = cache(async (id: string): Promise<Examination | null> => {
  if (!UUID_REGEX.test(id)) return null;
  return readExaminationById(id);
});
