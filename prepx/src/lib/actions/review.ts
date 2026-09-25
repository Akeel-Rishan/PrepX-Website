'use server';

import { revalidatePath } from 'next/cache';
import { createAuditLog } from '@/lib/audit';
import { getStudentGradesForReviewData, type ReviewSubjectGrade } from '@/lib/data/review';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Grade } from '@/lib/constants';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_GRADES = new Set<string>(['A', 'B', 'C', 'S', 'W', 'AB']);

type SaveReviewGradeResult =
  | { status: 'no_change'; resultId: string; oldGrade: Grade; newGrade: Grade }
  | { status: 'saved'; resultId: string; oldGrade: Grade | null; newGrade: Grade }
  | { status: 'error'; error: string };

async function getAdminUserId(): Promise<string | null> {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await client
    .from('admin_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  return profile && !profileError ? user.id : null;
}

/** Returns all active subject grades for an authenticated review request. */
export async function getStudentGradesForReviewAction(
  studentId: string,
  examinationId: string
): Promise<{ data?: ReviewSubjectGrade[]; error?: string }> {
  const adminId = await getAdminUserId();
  if (!adminId) return { error: 'Authentication required.' };
  if (!UUID_REGEX.test(studentId) || !UUID_REGEX.test(examinationId)) {
    return { error: 'Invalid student or examination.' };
  }
  try {
    return { data: await getStudentGradesForReviewData(studentId, examinationId) };
  } catch {
    return { error: 'Failed to load this student’s grades. Please try again.' };
  }
}

/** Creates or updates one grade and records a matching audit event. */
export async function saveReviewGradeAction(
  examinationId: string,
  studentId: string,
  subjectId: string,
  grade: string
): Promise<SaveReviewGradeResult> {
  const adminId = await getAdminUserId();
  if (!adminId) return { status: 'error', error: 'Authentication required.' };
  if (
    !UUID_REGEX.test(examinationId) ||
    !UUID_REGEX.test(studentId) ||
    !UUID_REGEX.test(subjectId)
  ) {
    return { status: 'error', error: 'Invalid grade data.' };
  }
  if (!VALID_GRADES.has(grade)) return { status: 'error', error: 'Select a valid grade.' };

  const newGrade = grade as Grade;
  const client = createAdminClient();
  try {
    const [examResult, studentResult, subjectResult] = await Promise.all([
      client.from('examinations').select('status').eq('id', examinationId).maybeSingle(),
      client
        .from('students')
        .select('id')
        .eq('id', studentId)
        .eq('examination_id', examinationId)
        .maybeSingle(),
      client
        .from('subjects')
        .select('id, active')
        .eq('id', subjectId)
        .eq('examination_id', examinationId)
        .maybeSingle(),
    ]);
    if (examResult.error || !examResult.data || studentResult.error || !studentResult.data) {
      return { status: 'error', error: 'Student or examination not found.' };
    }
    if (subjectResult.error || !subjectResult.data || !subjectResult.data.active) {
      return { status: 'error', error: 'This subject is not active for the examination.' };
    }
    if (examResult.data.status === 'PUBLISHED') {
      return { status: 'error', error: 'Published examinations are read-only.' };
    }

    const { data: existing, error: existingError } = await client
      .from('student_results')
      .select('id, grade, updated_at')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .maybeSingle();
    if (existingError) return { status: 'error', error: 'Unable to verify the current grade.' };
    if (existing?.grade === newGrade) {
      return {
        status: 'no_change',
        resultId: existing.id,
        oldGrade: existing.grade,
        newGrade,
      };
    }

    let resultId: string;
    let savedVersion: string;
    const oldGrade = existing?.grade ?? null;
    if (existing) {
      const { data: updated, error } = await client
        .from('student_results')
        .update({ grade: newGrade })
        .eq('id', existing.id)
        .eq('updated_at', existing.updated_at)
        .select('id, updated_at')
        .maybeSingle();
      if (error || !updated) {
        return { status: 'error', error: 'The grade changed elsewhere. Refresh and try again.' };
      }
      resultId = updated.id;
      savedVersion = updated.updated_at;
    } else {
      const { data: created, error } = await client
        .from('student_results')
        .insert({ student_id: studentId, subject_id: subjectId, grade: newGrade })
        .select('id, updated_at')
        .single();
      if (error || !created) return { status: 'error', error: 'Failed to save the grade.' };
      resultId = created.id;
      savedVersion = created.updated_at;
    }

    try {
      await createAuditLog({
        admin_id: adminId,
        action: existing ? 'RESULT_UPDATED' : 'RESULT_CREATED',
        entity_type: 'student_result',
        entity_id: resultId,
        old_value: oldGrade === null ? null : { grade: oldGrade },
        new_value: { grade: newGrade },
      });
    } catch {
      // Do not leave an unaudited mutation behind. The version guard avoids
      // undoing a newer concurrent edit while attempting compensation.
      const rollback = existing
        ? await client
            .from('student_results')
            .update({ grade: existing.grade })
            .eq('id', resultId)
            .eq('updated_at', savedVersion)
        : await client
            .from('student_results')
            .delete()
            .eq('id', resultId)
            .eq('updated_at', savedVersion);
      if (rollback.error) console.error('[Review Grade Rollback Error]', { code: rollback.error.code });
      return { status: 'error', error: 'The grade could not be audited, so the save was cancelled.' };
    }

    revalidatePath('/admin/review');
    revalidatePath('/admin/results');
    return { status: 'saved', resultId, oldGrade, newGrade };
  } catch {
    return { status: 'error', error: 'Failed to save the grade. Please try again.' };
  }
}
