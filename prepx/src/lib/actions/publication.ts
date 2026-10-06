'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import '@/lib/security/zod';
import { createAuditLog } from '@/lib/audit';
import { getAdminUserId } from '@/lib/auth/admin';
import { getPublicationValidation } from '@/lib/data/publication';
import { createAdminClient } from '@/lib/supabase/server';

export interface PublicationActionResult {
  error?: string;
}

const publicationPaths = [
  '/admin/publication',
  '/admin/examinations',
  '/admin/dashboard',
  '/admin/review',
  '/admin/results',
  '/admin/students',
  '/admin/subjects',
  '/admin/import',
  '/',
  '/results',
] as const;

function refreshPublicationViews(): void {
  revalidateTag('examinations');
  revalidateTag('dashboard');
  revalidateTag('student-lookups');
  revalidateTag('students');
  for (const path of publicationPaths) revalidatePath(path);
}

export async function publishExaminationAction(
  examinationId: string
): Promise<PublicationActionResult> {
  const adminId = await getAdminUserId();
  if (!adminId) return { error: 'Authentication required.' };
  if (!z.uuid().safeParse(examinationId).success) {
    return { error: 'Invalid examination ID.' };
  }

  const admin = createAdminClient();
  const { data: examination, error: fetchError } = await admin
    .from('examinations')
    .select('status, name, year, publication_date, updated_at')
    .eq('id', examinationId)
    .maybeSingle();

  if (fetchError || !examination) return { error: 'Examination not found.' };
  if (examination.status === 'PUBLISHED') {
    return { error: 'This examination is already published.' };
  }
  if (examination.status === 'ARCHIVED') {
    return { error: 'Archived examinations cannot be published. Restore it to Draft first.' };
  }

  let validation;
  try {
    validation = await getPublicationValidation(examinationId);
  } catch {
    return { error: 'Could not validate the examination. Please try again.' };
  }
  if (!validation) return { error: 'Examination not found.' };
  if (!validation.canPublish) {
    return {
      error: `Cannot publish: ${validation.blockingErrors.join(' ') || 'Resolve the blocking validation issues first.'}`,
    };
  }

  const publishedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from('examinations')
    .update({ status: 'PUBLISHED', publication_date: publishedAt })
    .eq('id', examinationId)
    .eq('status', examination.status)
    .eq('updated_at', examination.updated_at)
    .select('updated_at')
    .maybeSingle();

  if (updateError) {
    console.error('[Publish Error]', { code: updateError.code });
    return { error: 'Failed to publish. Please try again.' };
  }
  if (!updated) {
    return {
      error: 'The examination changed while it was being validated. Refresh and try again.',
    };
  }

  try {
    await createAuditLog({
      admin_id: adminId,
      action: 'EXAMINATION_PUBLISHED',
      entity_type: 'examination',
      entity_id: examinationId,
      old_value: {
        status: examination.status,
        publication_date: examination.publication_date,
      },
      new_value: {
        status: 'PUBLISHED',
        publication_date: publishedAt,
        students: validation.stats.totalStudents,
        complete: validation.stats.completeStudents,
      },
    });
  } catch {
    const { data: rolledBack, error: rollbackError } = await admin
      .from('examinations')
      .update({
        status: examination.status,
        publication_date: examination.publication_date,
      })
      .eq('id', examinationId)
      .eq('status', 'PUBLISHED')
      .eq('updated_at', updated.updated_at)
      .select('id')
      .maybeSingle();
    if (rollbackError || !rolledBack) {
      console.error('[Publish Audit Rollback Error]', { code: rollbackError?.code ?? 'no-row' });
      refreshPublicationViews();
      return {
        error: 'Results were published, but the audit record failed. Refresh before continuing.',
      };
    }
    refreshPublicationViews();
    return { error: 'Publication could not be audited, so the change was cancelled.' };
  }

  refreshPublicationViews();
  return {};
}

export async function unpublishExaminationAction(
  examinationId: string
): Promise<PublicationActionResult> {
  const adminId = await getAdminUserId();
  if (!adminId) return { error: 'Authentication required.' };
  if (!z.uuid().safeParse(examinationId).success) {
    return { error: 'Invalid examination ID.' };
  }

  const admin = createAdminClient();
  const { data: examination, error: fetchError } = await admin
    .from('examinations')
    .select('status, publication_date, updated_at')
    .eq('id', examinationId)
    .maybeSingle();

  if (fetchError || !examination) return { error: 'Examination not found.' };
  if (examination.status !== 'PUBLISHED') {
    return { error: 'Only published examinations can be unpublished.' };
  }

  const { data: updated, error: updateError } = await admin
    .from('examinations')
    .update({ status: 'DRAFT', publication_date: null })
    .eq('id', examinationId)
    .eq('status', 'PUBLISHED')
    .eq('updated_at', examination.updated_at)
    .select('updated_at')
    .maybeSingle();

  if (updateError) {
    console.error('[Unpublish Error]', { code: updateError.code });
    return { error: 'Failed to unpublish. Please try again.' };
  }
  if (!updated) {
    return {
      error: 'The examination changed before it could be unpublished. Refresh and try again.',
    };
  }

  try {
    await createAuditLog({
      admin_id: adminId,
      action: 'EXAMINATION_UNPUBLISHED',
      entity_type: 'examination',
      entity_id: examinationId,
      old_value: {
        status: 'PUBLISHED',
        publication_date: examination.publication_date,
      },
      new_value: { status: 'DRAFT', publication_date: null },
    });
  } catch {
    const { data: rolledBack, error: rollbackError } = await admin
      .from('examinations')
      .update({ status: 'PUBLISHED', publication_date: examination.publication_date })
      .eq('id', examinationId)
      .eq('status', 'DRAFT')
      .eq('updated_at', updated.updated_at)
      .select('id')
      .maybeSingle();
    if (rollbackError || !rolledBack) {
      console.error('[Unpublish Audit Rollback Error]', { code: rollbackError?.code ?? 'no-row' });
      refreshPublicationViews();
      return {
        error: 'Results were unpublished, but the audit record failed. Refresh before continuing.',
      };
    }
    refreshPublicationViews();
    return { error: 'Unpublication could not be audited, so the change was cancelled.' };
  }

  refreshPublicationViews();
  return {};
}
