import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import type { Subject } from '@/types';

export async function getSubjectsByExamination(examinationId: string): Promise<Subject[]> {
  noStore();
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
}

export async function getSubjectResultCounts(subjectIds: string[]): Promise<Map<string, number>> {
  noStore();
  if (subjectIds.length === 0) return new Map();
  // Count in PostgreSQL so a 1,000-row API limit cannot understate grade loss.
  const { data, error } = await createAdminClient()
    .from('subjects')
    .select('id, student_results(count)')
    .in('id', subjectIds);
  if (error) {
    console.error('[Subject Grade Counts Error]', { code: error.code });
    throw new Error('Unable to load subject grade counts.');
  }
  return new Map((data ?? []).map((row) => [row.id, row.student_results[0]?.count ?? 0]));
}
