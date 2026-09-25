'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TemplateSubject {
  id: string;
  subject_name: string;
  display_order: number;
}

async function isAdmin(): Promise<boolean> {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return false;
  const { data, error: profileError } = await client
    .from('admin_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  return Boolean(data && !profileError);
}

/** Returns active subjects for a Draft or Ready examination template. */
export async function getSubjectsForTemplateAction(
  examinationId: string
): Promise<{ data?: TemplateSubject[]; error?: string }> {
  if (!(await isAdmin())) return { error: 'Authentication required.' };
  if (!UUID_REGEX.test(examinationId)) return { error: 'Invalid examination.' };
  try {
    const client = createAdminClient();
    const { data: examination, error: examinationError } = await client
      .from('examinations')
      .select('status')
      .eq('id', examinationId)
      .maybeSingle();
    if (examinationError || !examination) return { error: 'Examination not found.' };
    if (examination.status !== 'DRAFT' && examination.status !== 'READY') {
      return { error: 'Templates are only available for Draft or Ready examinations.' };
    }
    const { data, error } = await client
      .from('subjects')
      .select('id, subject_name, display_order')
      .eq('examination_id', examinationId)
      .eq('active', true)
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });
    if (error) {
      console.error('[Import Template Subjects Error]', { code: error.code });
      return { error: 'Failed to load template subjects.' };
    }
    return { data: data ?? [] };
  } catch {
    return { error: 'Failed to generate the template. Please try again.' };
  }
}
