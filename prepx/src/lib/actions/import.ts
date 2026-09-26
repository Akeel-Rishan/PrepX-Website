'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminUserId, isAdmin } from '@/lib/auth/admin';
import { GRADES, isExamEditable } from '@/lib/constants';
import { parseImportFile } from '@/lib/import-parser';
import {
  IMPORT_BASE_COLUMNS,
  summariseValidation,
  validateFileHeaders,
  validateImportRows,
} from '@/lib/import-validator';
import type { ImportPreviewResult } from '@/types/import';
import type { Json } from '@/types/database';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INDEX_NUMBER_REGEX = /^[A-Z0-9]+$/;
const NIC_REGEX = /^([0-9]{9}[VX]|[0-9]{12})$/;
const VALID_GRADES = new Set<string>(GRADES);
const MAX_IMPORT_ROWS = 1000;

export interface ImportRow {
  index_number: string;
  nic_number: string | null;
  full_name: string;
  school_name: string;
  examination_center: string | null;
  grades: Record<string, string>;
}

export interface ImportStats {
  rowsProcessed: number;
  gradesWritten: number;
}

export interface ImportActionResult {
  success: boolean;
  error?: string;
  stats?: ImportStats;
}

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
    sourceColumns: [],
    detectedBaseColumns: [],
    detectedSubjects: [],
    missingRequiredColumns: [],
    subjectsNotFound: [],
    canImport: false,
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
    if (!parsed.headers.some(Boolean)) return emptyPreview('The file contains no column headers.');
    if (parsed.rows.length === 0) return emptyPreview('The file has headers but no data rows.');
    if (headerResult.duplicateColumns.length) {
      return emptyPreview(`Duplicate columns are not allowed: ${headerResult.duplicateColumns.join(', ')}`);
    }
    const sourceColumnSet = new Set(parsed.headers);
    const detectedBaseColumns = IMPORT_BASE_COLUMNS.filter((column) =>
      sourceColumnSet.has(column)
    );
    const detectedSubjects = subjectNames.filter((subjectName) =>
      sourceColumnSet.has(subjectName)
    );
    const subjectsNotFound = subjectNames.filter((subjectName) =>
      !sourceColumnSet.has(subjectName)
    );
    const rows = validateImportRows(
      parsed.rows,
      subjectDefinitions,
      existingStudents.indexNumbers,
      existingStudents.nicNumbers,
      headerResult.missingColumns,
      detectedSubjects
    );
    const summary = summariseValidation(rows);
    const canImport = headerResult.missingColumns.length === 0 && summary.validRows > 0;
    return {
      ...summary,
      hasBlockingErrors: !canImport,
      columns: [...detectedBaseColumns, ...detectedSubjects],
      sourceColumns: parsed.headers,
      detectedBaseColumns: [...detectedBaseColumns],
      detectedSubjects,
      missingRequiredColumns: headerResult.missingColumns,
      subjectsNotFound,
      canImport,
      rows,
      parseError: null,
    };
  } catch {
    return emptyPreview('Failed to load examination data. Please try again.');
  }
}

function refreshImportViews(): void {
  revalidateTag('students');
  revalidateTag('student-lookups');
  revalidateTag('results');
  revalidateTag('dashboard');
  revalidateTag('examinations');
  revalidatePath('/admin/import');
  revalidatePath('/admin/students');
  revalidatePath('/admin/results');
  revalidatePath('/admin/review');
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/examinations');
}

/** Atomically imports validated students and grades into an editable examination. */
export async function runImportAction(params: {
  examinationId: string;
  rows: ImportRow[];
}): Promise<ImportActionResult> {
  const adminId = await getAdminUserId();
  if (!adminId) return { success: false, error: 'Authentication required.' };
  if (!params || !UUID_REGEX.test(params.examinationId)) {
    return { success: false, error: 'Invalid examination.' };
  }
  if (!Array.isArray(params.rows) || params.rows.length === 0) {
    return { success: false, error: 'No valid rows to import.' };
  }
  if (params.rows.length > MAX_IMPORT_ROWS) {
    return {
      success: false,
      error: `Too many rows. Maximum is ${MAX_IMPORT_ROWS} per import.`,
    };
  }

  const cleanRows: ImportRow[] = [];
  const seenIndexes = new Set<string>();
  const seenNics = new Set<string>();
  const subjectIds = new Set<string>();

  for (const [rowIndex, candidate] of params.rows.entries()) {
    const rowNumber = rowIndex + 1;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return { success: false, error: `Row ${rowNumber} has an invalid data format.` };
    }
    if (typeof candidate.index_number !== 'string') {
      return { success: false, error: `Row ${rowNumber} is missing an index number.` };
    }
    if (typeof candidate.full_name !== 'string') {
      return { success: false, error: `Row ${rowNumber} is missing a student name.` };
    }
    if (typeof candidate.school_name !== 'string') {
      return { success: false, error: `Row ${rowNumber} is missing a school name.` };
    }
    if (
      candidate.nic_number !== null &&
      candidate.nic_number !== undefined &&
      typeof candidate.nic_number !== 'string'
    ) {
      return { success: false, error: `Row ${rowNumber} has an invalid NIC value.` };
    }
    if (
      candidate.examination_center !== null &&
      candidate.examination_center !== undefined &&
      typeof candidate.examination_center !== 'string'
    ) {
      return {
        success: false,
        error: `Row ${rowNumber} has an invalid examination center.`,
      };
    }
    if (
      !candidate.grades ||
      typeof candidate.grades !== 'object' ||
      Array.isArray(candidate.grades)
    ) {
      return { success: false, error: `Row ${rowNumber} has an invalid grades object.` };
    }

    const indexNumber = candidate.index_number.trim().toUpperCase();
    const nicNumber = candidate.nic_number?.trim().toUpperCase() || null;
    const fullName = candidate.full_name.trim();
    const schoolName = candidate.school_name.trim();
    const examinationCenter = candidate.examination_center?.trim() || null;

    if (!indexNumber || indexNumber.length > 50 || !INDEX_NUMBER_REGEX.test(indexNumber)) {
      return { success: false, error: `Row ${rowNumber} has an invalid index number.` };
    }
    if (seenIndexes.has(indexNumber)) {
      return { success: false, error: `Duplicate index number in import: ${indexNumber}.` };
    }
    seenIndexes.add(indexNumber);

    if (!fullName || fullName.length > 200) {
      return { success: false, error: `Row ${rowNumber} has an invalid student name.` };
    }
    if (!schoolName || schoolName.length > 200) {
      return { success: false, error: `Row ${rowNumber} has an invalid school name.` };
    }
    if (examinationCenter && examinationCenter.length > 200) {
      return { success: false, error: `Row ${rowNumber} has an invalid examination center.` };
    }
    if (nicNumber) {
      if (!NIC_REGEX.test(nicNumber)) {
        return { success: false, error: `Row ${rowNumber} has an invalid NIC number.` };
      }
      if (seenNics.has(nicNumber)) {
        return { success: false, error: `Duplicate NIC in import: ${nicNumber}.` };
      }
      seenNics.add(nicNumber);
    }

    const cleanGrades: Record<string, string> = {};
    const gradeEntries = Object.entries(candidate.grades);
    if (gradeEntries.length > 100) {
      return { success: false, error: `Row ${rowNumber} contains too many subjects.` };
    }
    for (const [subjectId, gradeValue] of gradeEntries) {
      if (!UUID_REGEX.test(subjectId)) {
        return { success: false, error: `Row ${rowNumber} contains an invalid subject.` };
      }
      if (typeof gradeValue !== 'string') {
        return { success: false, error: `Row ${rowNumber} contains an invalid grade.` };
      }
      const grade = gradeValue.trim().toUpperCase();
      if (grade && !VALID_GRADES.has(grade)) {
        return {
          success: false,
          error: `Row ${rowNumber} contains invalid grade “${gradeValue}”.`,
        };
      }
      subjectIds.add(subjectId);
      cleanGrades[subjectId] = grade;
    }

    cleanRows.push({
      index_number: indexNumber,
      nic_number: nicNumber,
      full_name: fullName,
      school_name: schoolName,
      examination_center: examinationCenter,
      grades: cleanGrades,
    });
  }

  const adminClient = createAdminClient();
  const examinationPromise = adminClient
    .from('examinations')
    .select('status')
    .eq('id', params.examinationId)
    .maybeSingle();
  const subjectIdList = Array.from(subjectIds);
  const subjectsPromise = subjectIdList.length
    ? adminClient
        .from('subjects')
        .select('id')
        .eq('examination_id', params.examinationId)
        .eq('active', true)
        .in('id', subjectIdList)
    : Promise.resolve({ data: [] as Array<{ id: string }>, error: null });
  const [examinationResult, subjectsResult] = await Promise.all([
    examinationPromise,
    subjectsPromise,
  ]);

  if (examinationResult.error || !examinationResult.data) {
    return { success: false, error: 'Examination not found.' };
  }
  if (!isExamEditable(examinationResult.data.status)) {
    return {
      success: false,
      error: 'Published and archived examinations are read-only.',
    };
  }
  if (subjectsResult.error || (subjectsResult.data?.length ?? 0) !== subjectIdList.length) {
    return {
      success: false,
      error: 'One or more subjects are inactive or do not belong to this examination.',
    };
  }

  const { data: rpcResult, error: rpcError } = await adminClient.rpc(
    'import_exam_results',
    {
      p_admin_id: adminId,
      p_examination_id: params.examinationId,
      p_rows: cleanRows as unknown as Json,
    }
  );

  if (rpcError) {
    console.error('[Import RPC Error]', { code: rpcError.code });
    const message = rpcError.message.toLocaleLowerCase();
    if (rpcError.code === '23505' && (message.includes('nic') || message.includes('idx_students_exam_nic'))) {
      return {
        success: false,
        error:
          'A NIC number in the import file already belongs to a different student in this examination. Check the conflict and try again.',
      };
    }
    if (rpcError.code === '55000' || message.includes('read-only')) {
      return { success: false, error: 'Published and archived examinations are read-only.' };
    }
    if (rpcError.code === 'PGRST202') {
      return {
        success: false,
        error: 'The database import function is not installed. Apply the latest Supabase migrations.',
      };
    }
    return {
      success: false,
      error: 'The database rejected the import. No data was changed.',
    };
  }

  const result = rpcResult as { rows_processed?: unknown; grades_written?: unknown } | null;
  const reportedRows = Number(result?.rows_processed);
  const reportedGrades = Number(result?.grades_written);
  const rowsProcessed = Number.isInteger(reportedRows) ? reportedRows : cleanRows.length;
  const gradesWritten = Number.isInteger(reportedGrades)
    ? reportedGrades
    : cleanRows.reduce(
        (total, row) => total + Object.values(row.grades).filter(Boolean).length,
        0
      );
  if (!Number.isInteger(reportedRows) || !Number.isInteger(reportedGrades)) {
    console.error('[Import RPC Result Error]', { hasResult: Boolean(rpcResult) });
  }

  refreshImportViews();
  return {
    success: true,
    stats: { rowsProcessed, gradesWritten },
  };
}
