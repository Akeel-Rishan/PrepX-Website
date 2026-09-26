'use server';

import { revalidatePath } from 'next/cache';
import { createAuditLog } from '@/lib/audit';
import type { GradeChange } from '@/lib/data/grades';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';
import { isExamEditable } from '@/lib/constants';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_GRADES = new Set(['A', 'B', 'C', 'S', 'W', 'AB']);

async function getAdminUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await supabase
    .from('admin_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  return profile && !profileError ? user.id : null;
}

export async function saveGradesAction(
  examinationId: string,
  changes: GradeChange[]
): Promise<{ error?: string; savedCount?: number }> {
  const adminId = await getAdminUserId();
  if (!adminId) return { error: 'Authentication required.' };
  if (!UUID_REGEX.test(examinationId)) return { error: 'Invalid examination.' };
  if (!Array.isArray(changes) || changes.length === 0) return { error: 'No changes to save.' };
  if (changes.length > 1000) return { error: 'Too many changes in a single request.' };

  for (const change of changes) {
    if (!UUID_REGEX.test(change.studentId) || !UUID_REGEX.test(change.subjectId)) {
      return { error: 'Invalid data format.' };
    }
    if (change.grade !== null && !VALID_GRADES.has(change.grade)) {
      return { error: `Invalid grade value: "${change.grade}".` };
    }
  }

  const uniqueChanges = new Map<string, GradeChange>();
  for (const change of changes) uniqueChanges.set(`${change.studentId}|${change.subjectId}`, change);
  const normalized = Array.from(uniqueChanges.values());
  const studentIds = Array.from(new Set(normalized.map((change) => change.studentId)));
  const subjectIds = Array.from(new Set(normalized.map((change) => change.subjectId)));
  const adminClient = createAdminClient();

  const [examResult, studentsResult, subjectsResult] = await Promise.all([
    adminClient.from('examinations').select('status').eq('id', examinationId).maybeSingle(),
    adminClient.from('students').select('id').eq('examination_id', examinationId).in('id', studentIds),
    adminClient
      .from('subjects')
      .select('id')
      .eq('examination_id', examinationId)
      .eq('active', true)
      .in('id', subjectIds),
  ]);
  if (examResult.error || !examResult.data) return { error: 'Examination not found.' };
  if (!isExamEditable(examResult.data.status)) {
    return { error: 'Published and archived examinations are read-only.' };
  }
  if (studentsResult.error || subjectsResult.error) {
    return { error: 'Unable to validate grade changes. Please try again.' };
  }
  if ((studentsResult.data?.length ?? 0) !== studentIds.length || (subjectsResult.data?.length ?? 0) !== subjectIds.length) {
    return { error: 'One or more students or active subjects do not belong to this examination.' };
  }

  const toUpsert = normalized
    .filter((change): change is GradeChange & { grade: string } => change.grade !== null)
    .map((change) => ({
      student_id: change.studentId,
      subject_id: change.subjectId,
      grade: change.grade as 'A' | 'B' | 'C' | 'S' | 'W' | 'AB',
    }));
  const toDelete = normalized.filter((change) => change.grade === null);

  if (toUpsert.length) {
    const { error } = await adminClient
      .from('student_results')
      .upsert(toUpsert, { onConflict: 'student_id,subject_id', ignoreDuplicates: false });
    if (error) {
      console.error('[Grade Upsert Error]', { code: error.code });
      return { error: 'Failed to save grades. Please try again.' };
    }
  }

  let deleted = 0;
  for (const item of toDelete) {
    const { error } = await adminClient
      .from('student_results')
      .delete()
      .eq('student_id', item.studentId)
      .eq('subject_id', item.subjectId);
    if (error) console.error('[Grade Delete Error]', { code: error.code });
    else deleted += 1;
  }
  if (deleted !== toDelete.length) {
    revalidatePath('/admin/results');
    return { error: 'Some grades were saved, but one or more removals failed. Refresh and try again.' };
  }

  try {
    await createAuditLog({
      admin_id: adminId,
      action: 'GRADES_UPDATED',
      entity_type: 'examination',
      entity_id: examinationId,
      new_value: {
        upserted: toUpsert.length,
        deleted: toDelete.length,
        total_changes: normalized.length,
      } as Json,
    });
  } catch {
    revalidatePath('/admin/results');
    return { error: 'Grades were saved, but the audit log failed. Refresh to confirm the changes.' };
  }

  revalidatePath('/admin/results');
  revalidatePath('/admin/review');
  return { savedCount: normalized.length };
}
