'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/admin';
import { parseImportFile } from '@/lib/import-parser';
import {
  IMPORT_BASE_COLUMNS,
  summariseValidation,
  validateFileHeaders,
  validateImportRows,
} from '@/lib/import-validator';
import type { ImportPreviewResult } from '@/types/import';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TemplateSubject {
  id: string;
  subject_name: string;
  subject_code: string | null;
  required: boolean;
  display_order: number;
}

function emptyPreview(parseError: string): ImportPreviewResult {
  return {
    totalRows: 0,
    validRows: 0,
    errorRows: 0,
    warningRows: 0,
    hasBlockingErrors: true,
    columns: [],
    rows: [],
    parseError,
  };
}

async function loadExistingStudents(
  examinationId: string
): Promise<{ indexNumbers: string[]; nicNumbers: string[] }> {
  const client = createAdminClient();
  const indexNumbers: string[] = [];
  const nicNumbers: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from('students')
      .select('index_number, nic_number')
      .eq('examination_id', examinationId)
      .order('id')
      .range(from, from + 999);
    if (error) {
      console.error('[Import Existing Students Error]', { code: error.code });
      throw new Error('student query failed');
    }
    for (const student of data ?? []) {
      indexNumbers.push(student.index_number);
      if (student.nic_number) nicNumbers.push(student.nic_number);
    }
    if ((data?.length ?? 0) < 1000) break;
  }
  return { indexNumbers, nicNumbers };
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
      .select('id, subject_name, subject_code, required, display_order')
      .eq('examination_id', examinationId)
      .eq('active', true)
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });
    if (error) {
      console.error('[Import Template Subjects Error]', { code: error.code });
      return { error: 'Failed to load template subjects.' };
    }
    if (!data?.length) return { error: 'Add at least one active subject before downloading a template.' };
    return { data: data ?? [] };
  } catch {
    return { error: 'Failed to generate the template. Please try again.' };
  }
}

/** Parses and validates an import file without writing any database records. */
export async function parseAndValidateImportAction(formData: FormData): Promise<ImportPreviewResult> {
  if (!(await isAdmin())) return emptyPreview('Authentication required.');
  const examinationId = formData.get('examinationId');
  const file = formData.get('file');
  if (typeof examinationId !== 'string' || !UUID_REGEX.test(examinationId)) {
    return emptyPreview('Select a valid examination.');
  }
  if (!(file instanceof File) || file.size === 0) return emptyPreview('Select a non-empty import file.');
  if (file.size > 10 * 1024 * 1024) return emptyPreview('File size must be under 10 MB.');
  const lowerName = file.name.toLocaleLowerCase();
  const fileType = lowerName.endsWith('.xlsx') ? 'xlsx' : lowerName.endsWith('.csv') ? 'csv' : null;
  if (!fileType) return emptyPreview('Only .xlsx and .csv files are accepted.');

  try {
    const client = createAdminClient();
    const { data: examination, error: examinationError } = await client
      .from('examinations')
      .select('status')
      .eq('id', examinationId)
      .maybeSingle();
    if (examinationError || !examination) return emptyPreview('Examination not found.');
    if (examination.status !== 'DRAFT' && examination.status !== 'READY') {
      return emptyPreview('Results can only be imported into Draft or Ready examinations.');
    }
    const [subjectsResult, existingStudents] = await Promise.all([
      client
        .from('subjects')
        .select('subject_name, subject_code, required')
        .eq('examination_id', examinationId)
        .eq('active', true)
        .order('display_order', { ascending: true })
        .order('id', { ascending: true }),
      loadExistingStudents(examinationId),
    ]);
    if (subjectsResult.error) {
      console.error('[Import Subjects Error]', { code: subjectsResult.error.code });
      return emptyPreview('Failed to load examination data. Please try again.');
    }
    const subjectDefinitions = subjectsResult.data ?? [];
    if (subjectDefinitions.length === 0) {
      return emptyPreview('This examination has no active subjects. Add subjects before importing results.');
    }
    const subjectNames = subjectDefinitions.map((subject) => subject.subject_name);
    let parsed;
    try {
      parsed = await parseImportFile(
        Buffer.from(await file.arrayBuffer()),
        fileType,
        subjectDefinitions
      );
    } catch (error) {
      return emptyPreview(error instanceof Error ? error.message : 'Could not read the import file.');
    }
    const headerResult = validateFileHeaders(parsed.headers, subjectNames);
    if (!headerResult.valid) {
      if (headerResult.missingColumns.length) {
        return emptyPreview(`Missing required columns: ${headerResult.missingColumns.join(', ')}`);
      }
      return emptyPreview(`Duplicate columns are not allowed: ${headerResult.duplicateColumns.join(', ')}`);
    }
    const rows = validateImportRows(
      parsed.rows,
      subjectDefinitions,
      existingStudents.indexNumbers,
      existingStudents.nicNumbers
    );
    return {
      ...summariseValidation(rows),
      columns: [...IMPORT_BASE_COLUMNS, ...subjectNames],
      rows,
      parseError: null,
    };
  } catch {
    return emptyPreview('Failed to load examination data. Please try again.');
  }
}
