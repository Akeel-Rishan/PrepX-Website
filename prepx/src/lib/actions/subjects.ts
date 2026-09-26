'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminUserId } from '@/lib/auth/admin';
import { subjectSchema, type SubjectFormState } from '@/lib/validations/subject';
import { createAuditLog } from '@/lib/audit';
import { isExamEditable } from '@/lib/constants';

type AdminClient = ReturnType<typeof createAdminClient>;
type ActionResult = { error?: string };

async function examinationError(client: AdminClient, id: string): Promise<string | null> {
  const { data, error } = await client.from('examinations').select('status').eq('id', id).single();
  if (error || !data) return 'Examination not found. Please select a valid examination.';
  return isExamEditable(data.status)
    ? null
    : 'Published and archived examinations are read-only.';
}

function refreshSubjects() {
  revalidateTag('subjects');
  revalidatePath('/admin/subjects');
  revalidatePath('/admin/results');
  revalidatePath('/admin/review');
  revalidatePath('/admin/students/[id]', 'page');
}

async function duplicateSubjectError(
  client: AdminClient,
  examinationId: string,
  subjectName: string,
  subjectCode: string | null,
  excludeId?: string
): Promise<SubjectFormState | null> {
  const { data, error } = await client
    .from('subjects')
    .select('id, subject_name, subject_code')
    .eq('examination_id', examinationId);
  if (error) return { error: 'Unable to validate subject uniqueness. Please try again.' };
  const normalizedName = subjectName.trim().toLocaleLowerCase();
  const normalizedCode = subjectCode?.trim().toLocaleLowerCase() ?? null;
  const rows = (data ?? []).filter((subject) => subject.id !== excludeId);
  if (rows.some((subject) => subject.subject_name.trim().toLocaleLowerCase() === normalizedName)) {
    return {
      error: 'Please fix errors below.',
      fieldErrors: { subject_name: ['This subject name already exists in the examination.'] },
    };
  }
  if (
    normalizedCode &&
    rows.some((subject) => subject.subject_code?.trim().toLocaleLowerCase() === normalizedCode)
  ) {
    return {
      error: 'Please fix errors below.',
      fieldErrors: { subject_code: ['This subject code already exists in the examination.'] },
    };
  }
  return null;
}

export async function saveSubjectAction(
  _previous: SubjectFormState,
  formData: FormData
): Promise<SubjectFormState> {
  let saved = false;
  try {
    const adminId = await getAdminUserId();
    if (!adminId) return { error: 'Authentication required.' };
    const rawId = formData.get('id');
    if (rawId !== null && typeof rawId !== 'string') return { error: 'Invalid subject ID.' };
    const id = rawId?.trim();
    if (id && !z.uuid().safeParse(id).success) return { error: 'Invalid subject ID.' };
    const validation = subjectSchema.safeParse({
      examination_id: formData.get('examination_id'),
      subject_name: formData.get('subject_name'),
      subject_code: formData.get('subject_code'),
      required: formData.get('required') ?? undefined,
    });
    if (!validation.success)
      return {
        error: 'Please fix errors below.',
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    const { examination_id, ...fields } = validation.data;
    const client = createAdminClient();
    if (id) {
      const { data: existing, error } = await client
        .from('subjects')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !existing) return { error: 'Subject not found.' };
      if (existing.examination_id !== examination_id)
        return { error: 'The subject’s examination cannot be changed.' };
      const locked = await examinationError(client, existing.examination_id);
      if (locked) return { error: locked };
      const duplicate = await duplicateSubjectError(
        client,
        existing.examination_id,
        fields.subject_name,
        fields.subject_code,
        id
      );
      if (duplicate) return duplicate;
      const { data: updated, error: updateError } = await client
        .from('subjects')
        .update(fields)
        .eq('id', id)
        .eq('updated_at', existing.updated_at)
        .select('id')
        .maybeSingle();
      if (updateError?.code === '23505') {
        return { error: 'A subject with this name or code already exists.' };
      }
      if (updateError) return { error: 'Failed to update subject. Please try again.' };
      if (!updated)
        return { error: 'This subject changed or was deleted. Refresh before trying again.' };
      saved = true;
      await createAuditLog({
        admin_id: adminId,
        action: 'SUBJECT_UPDATED',
        entity_type: 'subject',
        entity_id: id,
        old_value: existing,
        new_value: fields,
      });
    } else {
      const locked = await examinationError(client, examination_id);
      if (locked) return { error: locked };
      const duplicate = await duplicateSubjectError(
        client,
        examination_id,
        fields.subject_name,
        fields.subject_code
      );
      if (duplicate) return duplicate;
      const { data: maxData, error: maxError } = await client
        .from('subjects')
        .select('display_order')
        .eq('examination_id', examination_id)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxError) return { error: 'Unable to determine subject order. Please try again.' };
      const nextOrder = (maxData?.display_order ?? -1) + 1;
      const values = { ...validation.data, display_order: nextOrder, active: true };
      const { data: created, error } = await client
        .from('subjects')
        .insert(values)
        .select('id')
        .single();
      if (error?.code === '23505') {
        return { error: 'A subject with this name or code already exists.' };
      }
      if (error || !created) return { error: 'Failed to create subject. Please try again.' };
      saved = true;
      await createAuditLog({
        admin_id: adminId,
        action: 'SUBJECT_CREATED',
        entity_type: 'subject',
        entity_id: created.id,
        new_value: values,
      });
    }
    refreshSubjects();
    return { success: true };
  } catch {
    if (saved) refreshSubjects();
    return {
      error: saved
        ? 'The subject was saved, but its audit log failed. Close this form and refresh before submitting again.'
        : 'Unable to save the subject. Please try again.',
    };
  }
}

export async function toggleSubjectActiveAction(subjectId: string): Promise<ActionResult> {
  let changed = false;
  try {
    const adminId = await getAdminUserId();
    if (!adminId) return { error: 'Authentication required.' };
    if (!z.uuid().safeParse(subjectId).success) return { error: 'Invalid subject ID.' };
    const client = createAdminClient();
    const { data: subject, error } = await client
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .single();
    if (error || !subject) return { error: 'Subject not found.' };
    const locked = await examinationError(client, subject.examination_id);
    if (locked) return { error: locked };
    const { data: updated, error: updateError } = await client
      .from('subjects')
      .update({ active: !subject.active })
      .eq('id', subjectId)
      .eq('updated_at', subject.updated_at)
      .select('id')
      .maybeSingle();
    if (updateError) return { error: 'Failed to toggle subject status.' };
    if (!updated) return { error: 'This subject changed. Refresh before trying again.' };
    changed = true;
    await createAuditLog({
      admin_id: adminId,
      action: 'SUBJECT_UPDATED',
      entity_type: 'subject',
      entity_id: subjectId,
      old_value: { active: subject.active },
      new_value: { active: !subject.active },
    });
    refreshSubjects();
    return {};
  } catch {
    if (changed) refreshSubjects();
    return {
      error: changed
        ? 'The status changed, but its audit log failed. Refresh to see the current status.'
        : 'Failed to toggle subject status. Please try again.',
    };
  }
}

export async function moveSubjectAction(
  subjectId: string,
  direction: 'up' | 'down'
): Promise<ActionResult> {
  try {
    const adminId = await getAdminUserId();
    if (!adminId) return { error: 'Authentication required.' };
    if (!z.uuid().safeParse(subjectId).success) return { error: 'Invalid subject ID.' };
    if (direction !== 'up' && direction !== 'down') return { error: 'Invalid move direction.' };
    const client = createAdminClient();
    const { data: subject, error } = await client
      .from('subjects')
      .select('examination_id')
      .eq('id', subjectId)
      .single();
    if (error || !subject) return { error: 'Subject not found.' };
    const locked = await examinationError(client, subject.examination_id);
    if (locked) return { error: locked };
    const { data: allSubjects, error: listError } = await client
      .from('subjects')
      .select('id, display_order, updated_at')
      .eq('examination_id', subject.examination_id)
      .order('display_order')
      .order('id');
    if (listError || !allSubjects) return { error: 'Unable to load subject order.' };
    const current = allSubjects.findIndex((row) => row.id === subjectId);
    if (current < 0) return { error: 'Subject not found.' };
    const adjacent = direction === 'up' ? current - 1 : current + 1;
    if (adjacent < 0 || adjacent >= allSubjects.length) return {};
    const reordered = [...allSubjects];
    [reordered[current], reordered[adjacent]] = [reordered[adjacent], reordered[current]];
    // Skip unchanged rows and check every write. Optimistic guards avoid
    // overwriting a concurrent edit; failed batches are never reported as saved.
    const writes = reordered
      .map((row, index) => ({ row, index }))
      .filter(({ row, index }) => row.display_order !== index);
    const outcomes = await Promise.all(
      writes.map(async ({ row, index }) => {
        const result = await client
          .from('subjects')
          .update({ display_order: index })
          .eq('id', row.id)
          .eq('updated_at', row.updated_at)
          .select('id, updated_at')
          .maybeSingle();
        return { row, result };
      })
    );
    if (outcomes.some(({ result }) => result.error || !result.data)) {
      // Restore only rows still carrying the version written by this action.
      const rollbacks = await Promise.all(
        outcomes
          .filter(({ result }) => !result.error && result.data)
          .map(({ row, result }) =>
            client
              .from('subjects')
              .update({ display_order: row.display_order })
              .eq('id', row.id)
              .eq('updated_at', result.data!.updated_at)
              .select('id')
              .maybeSingle()
          )
      );
      refreshSubjects();
      return {
        error: rollbacks.some((result) => result.error || !result.data)
          ? 'The order changed concurrently and could not be fully restored. Review the refreshed list before retrying.'
          : 'Unable to save the new order. The list may have changed; please try again.',
      };
    }
    refreshSubjects();
    await createAuditLog({
      admin_id: adminId,
      action: 'SUBJECT_REORDERED',
      entity_type: 'subject',
      entity_id: subjectId,
      old_value: allSubjects.map((row) => ({ id: row.id, display_order: row.display_order })),
      new_value: reordered.map((row, index) => ({ id: row.id, display_order: index })),
    });
    return {};
  } catch {
    refreshSubjects();
    return { error: 'Unable to finish reordering. Review the refreshed list before trying again.' };
  }
}

export async function deleteSubjectAction(subjectId: string): Promise<ActionResult> {
  let deleted = false;
  try {
    const adminId = await getAdminUserId();
    if (!adminId) return { error: 'Authentication required.' };
    if (!z.uuid().safeParse(subjectId).success) return { error: 'Invalid subject ID.' };
    const client = createAdminClient();
    const { data: subject, error } = await client
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .single();
    if (error || !subject) return { error: 'Subject not found.' };
    const locked = await examinationError(client, subject.examination_id);
    if (locked) return { error: locked };
    const { count, error: countError } = await client
      .from('student_results')
      .select('id', { count: 'exact', head: true })
      .eq('subject_id', subjectId);
    if (countError) return { error: 'Unable to verify grade count. Please try again.' };
    const { data: removed, error: deleteError } = await client
      .from('subjects')
      .delete()
      .eq('id', subjectId)
      .eq('updated_at', subject.updated_at)
      .select('id')
      .maybeSingle();
    if (deleteError) return { error: 'Failed to delete subject.' };
    if (!removed)
      return { error: 'This subject changed or was deleted. Refresh before trying again.' };
    deleted = true;
    await createAuditLog({
      admin_id: adminId,
      action: 'SUBJECT_DELETED',
      entity_type: 'subject',
      entity_id: subjectId,
      old_value: { ...subject, result_count: count ?? 0 },
    });
    refreshSubjects();
    return {};
  } catch {
    if (deleted) refreshSubjects();
    return {
      error: deleted
        ? 'The subject was deleted, but its audit log failed. Refresh the list.'
        : 'Failed to delete subject. Please try again.',
    };
  }
}
