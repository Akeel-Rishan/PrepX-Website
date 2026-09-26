import 'server-only';

import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import type { Subject } from '@/types';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SubjectWithResultCount = Subject & { resultCount: number };

const readSubjectsByExamination = unstable_cache(
  async (examinationId: string): Promise<Subject[]> => {
    const { data, error } = await createAdminClient()
      .from('subjects')
      .select('*')
      .eq('examination_id', examinationId)
      .order('display_order')
      .order('id');
    if (error) {
      console.error('[Subjects Query Error]', { code: error.code });
      throw new Error('Unable to load subjects.');
    }
    return data ?? [];
  },
  ['subjects-by-examination-v2'],
  { revalidate: 30, tags: ['subjects'] }
);

export async function getSubjectsByExamination(examinationId: string): Promise<Subject[]> {
  if (!UUID_REGEX.test(examinationId)) return [];
  return readSubjectsByExamination(examinationId);
}

const readSubjectsWithResultCounts = unstable_cache(
  async (examinationId: string): Promise<SubjectWithResultCount[]> => {
    const { data, error } = await createAdminClient()
      .from('subjects')
      .select('*, student_results(count)')
      .eq('examination_id', examinationId)
      .order('display_order')
      .order('id');
    if (error) {
      console.error('[Subject Counts Query Error]', { code: error.code });
      throw new Error('Unable to load subjects and grade counts.');
    }
    return (data ?? []).map(({ student_results: results, ...subject }) => ({
      ...subject,
      resultCount: results[0]?.count ?? 0,
    }));
  },
  ['subjects-with-result-counts-v1'],
  { revalidate: 30, tags: ['subjects', 'results'] }
);

export async function getSubjectsWithResultCounts(
  examinationId: string
): Promise<SubjectWithResultCount[]> {
  if (!UUID_REGEX.test(examinationId)) return [];
  return readSubjectsWithResultCounts(examinationId);
}
