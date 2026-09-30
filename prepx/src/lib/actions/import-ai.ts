'use server';

import { z } from 'zod';
import { getAdminUserId } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/server';
import { requestImportAssistantSuggestions } from '@/lib/ai/import-assistant';
import { IMPORT_BASE_COLUMNS } from '@/lib/import-validator';
import type { ImportAiActionResult } from '@/types/import';

const requestSchema = z.object({
  examinationId: z.uuid(),
  sourceColumns: z.array(z.string().trim().min(1).max(200)).max(250),
  detectedBaseColumns: z.array(z.string().trim().min(1).max(200)).max(5),
  detectedSubjects: z.array(z.string().trim().min(1).max(200)).max(250),
  missingRequiredColumns: z.array(z.string().trim().min(1).max(200)).max(5),
  issueSummaries: z.array(z.string().trim().min(1).max(300)).max(20),
});

export type ImportAiRequest = z.infer<typeof requestSchema>;

export async function getImportAiSuggestionsAction(
  request: ImportAiRequest
): Promise<ImportAiActionResult> {
  const adminId = await getAdminUserId();
  if (!adminId) return { success: false, error: 'Authentication required.' };
  const parsed = requestSchema.safeParse(request);
  if (!parsed.success) return { success: false, error: 'Invalid assistant request.' };
  if (!process.env.GEMINI_API_KEY?.trim() && !process.env.GOOGLE_API_KEY?.trim()) {
    return { success: false, error: 'The AI import assistant is not configured.' };
  }

  const client = createAdminClient();
  const [examinationResult, subjectsResult] = await Promise.all([
    client
      .from('examinations')
      .select('status')
      .eq('id', parsed.data.examinationId)
      .maybeSingle(),
    client
      .from('subjects')
      .select('subject_name, subject_code')
      .eq('examination_id', parsed.data.examinationId)
      .eq('active', true)
      .order('display_order')
      .order('id'),
  ]);
  if (examinationResult.error || !examinationResult.data) {
    return { success: false, error: 'Examination not found.' };
  }
  if (!['DRAFT', 'READY'].includes(examinationResult.data.status)) {
    return { success: false, error: 'Published and archived examinations are read-only.' };
  }
  if (subjectsResult.error) {
    return { success: false, error: 'Unable to load examination subjects.' };
  }

  const expectedSubjects = subjectsResult.data ?? [];
  const allowedDetectedSubjects = new Set(expectedSubjects.map((subject) => subject.subject_name));
  const detectedColumns = [
    ...parsed.data.detectedBaseColumns.filter((column) =>
      IMPORT_BASE_COLUMNS.includes(column as (typeof IMPORT_BASE_COLUMNS)[number])
    ),
    ...parsed.data.detectedSubjects.filter((subject) => allowedDetectedSubjects.has(subject)),
  ];

  try {
    const suggestion = await requestImportAssistantSuggestions({
      sourceColumns: parsed.data.sourceColumns,
      detectedColumns,
      missingRequiredColumns: parsed.data.missingRequiredColumns.filter((column) =>
        IMPORT_BASE_COLUMNS.includes(column as (typeof IMPORT_BASE_COLUMNS)[number])
      ),
      expectedSubjects: expectedSubjects.map(({ subject_name, subject_code }) => ({
        name: subject_name,
        code: subject_code,
      })),
      issueSummaries: parsed.data.issueSummaries,
    });
    return { success: true, suggestion };
  } catch {
    // Provider errors can contain request data and credentials.
    console.error('[Gemini Import Assistant Error]', { reason: 'provider-request-failed' });
    return {
      success: false,
      error: 'The AI assistant is temporarily unavailable. The normal validator is still active.',
    };
  }
}
