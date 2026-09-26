'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import {
  examinationSchema,
  type ExaminationFormState,
} from '@/lib/validations/examination';
import type { Json } from '@/types/database';

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

function refreshExamination(id: string): void {
  revalidateTag('examinations');
  revalidateTag('student-lookups');
  revalidatePath('/admin/examinations');
  revalidatePath(`/admin/examinations/${id}`);
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/students');
  revalidatePath('/admin/subjects');
  revalidatePath('/admin/results');
  revalidatePath('/admin/review');
  revalidatePath('/admin/import');
}

export async function saveExaminationAction(
  _previous: ExaminationFormState,
  formData: FormData
): Promise<ExaminationFormState> {
  const adminId = await getAdminUserId();
  if (!adminId) return { error: 'Authentication required.' };
  const rawId = formData.get('id');
  if (rawId !== null && typeof rawId !== 'string') return { error: 'Invalid examination ID.' };
  const id = rawId?.trim();
  if (id && !z.uuid().safeParse(id).success) return { error: 'Invalid examination ID.' };

  const validation = examinationSchema.safeParse({
    name: formData.get('name'),
    year: formData.get('year'),
    organization_name: formData.get('organization_name'),
    result_notice: formData.get('result_notice'),
  });
  if (!validation.success) {
    return {
      error: 'Please fix the errors below.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const admin = createAdminClient();
  const values = validation.data;
  if (id) {
    const { data: existing, error: fetchError } = await admin
      .from('examinations')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchError || !existing) return { error: 'Examination not found.' };

    const { data: updated, error } = await admin
      .from('examinations')
      .update(values)
      .eq('id', id)
      .eq('updated_at', existing.updated_at)
      .select('id, updated_at')
      .maybeSingle();
    if (error) return { error: 'Failed to update examination. Please try again.' };
    if (!updated) return { error: 'This examination changed elsewhere. Refresh and try again.' };

    try {
      await createAuditLog({
        admin_id: adminId,
        action: 'EXAMINATION_UPDATED',
        entity_type: 'examination',
        entity_id: id,
        old_value: existing as unknown as Json,
        new_value: values as unknown as Json,
      });
    } catch {
      const { error: rollbackError } = await admin
        .from('examinations')
        .update({
          name: existing.name,
          year: existing.year,
          organization_name: existing.organization_name,
          result_notice: existing.result_notice,
        })
        .eq('id', id)
        .eq('updated_at', updated.updated_at);
      if (rollbackError) console.error('[Examination Update Rollback Error]', { code: rollbackError.code });
      return { error: 'The update could not be audited, so it was cancelled.' };
    }

    refreshExamination(id);
    return { success: true, message: 'Examination updated successfully.' };
  }

  const { data: created, error } = await admin
    .from('examinations')
    .insert(values)
    .select('id')
    .single();
  if (error || !created) return { error: 'Failed to create examination. Please try again.' };
  try {
    await createAuditLog({
      admin_id: adminId,
      action: 'EXAMINATION_CREATED',
      entity_type: 'examination',
      entity_id: created.id,
      new_value: values as unknown as Json,
    });
  } catch {
    const { error: rollbackError } = await admin.from('examinations').delete().eq('id', created.id);
    if (rollbackError) console.error('[Examination Create Rollback Error]', { code: rollbackError.code });
    return { error: 'The examination could not be audited, so creation was cancelled.' };
  }
  refreshExamination(created.id);
  redirect(`/admin/examinations/${created.id}`);
}

export async function archiveExaminationAction(id: string): Promise<{ error?: string }> {
  const adminId = await getAdminUserId();
  if (!adminId) return { error: 'Authentication required.' };
  if (!z.uuid().safeParse(id).success) return { error: 'Invalid examination ID.' };
  const admin = createAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from('examinations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fetchError || !existing) return { error: 'Examination not found.' };
  if (existing.status === 'PUBLISHED') {
    return { error: 'Published examinations cannot be archived. Unpublish it first.' };
  }
  if (existing.status === 'ARCHIVED') return { error: 'This examination is already archived.' };

  const { data: updated, error } = await admin
    .from('examinations')
    .update({ status: 'ARCHIVED' })
    .eq('id', id)
    .eq('status', existing.status)
    .eq('updated_at', existing.updated_at)
    .select('updated_at')
    .maybeSingle();
  if (error) return { error: 'Failed to archive examination.' };
  if (!updated) return { error: 'The examination changed elsewhere. Refresh and try again.' };

  try {
    await createAuditLog({
      admin_id: adminId,
      action: 'EXAMINATION_ARCHIVED',
      entity_type: 'examination',
      entity_id: id,
      old_value: { status: existing.status },
      new_value: { status: 'ARCHIVED' },
    });
  } catch {
    const { error: rollbackError } = await admin
      .from('examinations')
      .update({ status: existing.status })
      .eq('id', id)
      .eq('updated_at', updated.updated_at);
    if (rollbackError) console.error('[Examination Archive Rollback Error]', { code: rollbackError.code });
    return { error: 'The archive action could not be audited, so it was cancelled.' };
  }
  refreshExamination(id);
  redirect('/admin/examinations');
}

export async function unarchiveExaminationAction(id: string): Promise<{ error?: string }> {
  const adminId = await getAdminUserId();
  if (!adminId) return { error: 'Authentication required.' };
  if (!z.uuid().safeParse(id).success) return { error: 'Invalid examination ID.' };
  const admin = createAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from('examinations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fetchError || !existing) return { error: 'Examination not found.' };
  if (existing.status !== 'ARCHIVED') return { error: 'Only archived examinations can be restored.' };

  const { data: updated, error } = await admin
    .from('examinations')
    .update({ status: 'DRAFT' })
    .eq('id', id)
    .eq('status', 'ARCHIVED')
    .eq('updated_at', existing.updated_at)
    .select('updated_at')
    .maybeSingle();
  if (error) return { error: 'Failed to restore examination.' };
  if (!updated) return { error: 'The examination changed elsewhere. Refresh and try again.' };

  try {
    await createAuditLog({
      admin_id: adminId,
      action: 'EXAMINATION_UNARCHIVED',
      entity_type: 'examination',
      entity_id: id,
      old_value: { status: 'ARCHIVED' },
      new_value: { status: 'DRAFT' },
    });
  } catch {
    const { error: rollbackError } = await admin
      .from('examinations')
      .update({ status: 'ARCHIVED' })
      .eq('id', id)
      .eq('updated_at', updated.updated_at);
    if (rollbackError) console.error('[Examination Restore Rollback Error]', { code: rollbackError.code });
    return { error: 'The restore action could not be audited, so it was cancelled.' };
  }
  refreshExamination(id);
  return {};
}
