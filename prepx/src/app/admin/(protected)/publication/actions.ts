'use server';

import { getAdminUserId } from '@/lib/auth/admin';
import {
  buildPublicationValidation,
  type PublicationGradeInput,
  type PublicationStudentInput,
  type PublicationSubjectInput,
  type PublicationValidationResult,
} from '@/lib/publication-validator';
import { createAdminClient } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type AdminClient = ReturnType<typeof createAdminClient>;

async function loadSubjects(
  client: AdminClient,
  examinationId: string
): Promise<PublicationSubjectInput[]> {
  const rows: PublicationSubjectInput[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from('subjects')
      .select('id, subject_name, subject_code, required, display_order')
      .eq('examination_id', examinationId)
      .eq('active', true)
      .order('display_order', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error('subjects');
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return rows;
}

async function loadStudents(
  client: AdminClient,
  examinationId: string
): Promise<PublicationStudentInput[]> {
  const rows: PublicationStudentInput[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from('students')
      .select('id, full_name, index_number, nic_number, school_name')
      .eq('examination_id', examinationId)
      .order('index_number', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error('students');
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return rows;
}

async function loadResults(
  client: AdminClient,
  examinationId: string
): Promise<PublicationGradeInput[]> {
  const rows: PublicationGradeInput[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from('student_results')
      .select('student_id, subject_id, grade, student:students!inner(examination_id)')
      .eq('student.examination_id', examinationId)
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error('results');
    rows.push(
      ...(data ?? []).map(({ student_id, subject_id, grade }) => ({
        student_id,
        subject_id,
        grade,
      }))
    );
    if ((data?.length ?? 0) < 1000) break;
  }
  return rows;
}

/** Loads all examination data and returns a fresh pre-publication report. */
export async function runPublicationValidation(
  examinationId: string
): Promise<PublicationValidationResult> {
  try {
    const adminId = await getAdminUserId();
    if (!adminId) throw new Error('unauthorized');
    if (!UUID_REGEX.test(examinationId)) throw new Error('invalid-id');
    const client = createAdminClient();
    const [examinationResult, subjects, students, results] = await Promise.all([
      client
        .from('examinations')
        .select('id, name, year, status')
        .eq('id', examinationId)
        .maybeSingle(),
      loadSubjects(client, examinationId),
      loadStudents(client, examinationId),
      loadResults(client, examinationId),
    ]);
    if (examinationResult.error) throw new Error('examination-query');
    if (!examinationResult.data) throw new Error('not-found');
    return buildPublicationValidation({
      examination: examinationResult.data,
      subjects,
      students,
      results,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown';
    if (reason === 'unauthorized') {
      throw new Error('Authentication required. Please sign in again.');
    }
    if (reason === 'invalid-id') throw new Error('Select a valid examination.');
    if (reason === 'not-found') throw new Error('The selected examination was not found.');
    console.error('[Publication Validation Error]', { reason });
    throw new Error('Publication validation could not be completed. Please try again.');
  }
}

async function validatePublicationStub(examinationId: string): Promise<void> {
  try {
    if (!(await getAdminUserId())) throw new Error('unauthorized');
    if (!UUID_REGEX.test(examinationId)) throw new Error('invalid-id');
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown';
    if (reason === 'unauthorized') throw new Error('Authentication required.');
    if (reason === 'invalid-id') throw new Error('Invalid examination.');
    console.error('[Publication Auth Error]', { reason });
    throw new Error('Unable to verify the administrator session.');
  }
}

/** Authenticated placeholder for Step 9.2 publication. */
export async function publishExamination(examinationId: string): Promise<void> {
  await validatePublicationStub(examinationId);
}

/** Authenticated placeholder for Step 9.2 unpublication. */
export async function unpublishExamination(examinationId: string): Promise<void> {
  await validatePublicationStub(examinationId);
}
