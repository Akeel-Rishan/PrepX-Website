'use server';

import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminUserId } from '@/lib/auth/admin';
import { studentSchema, type StudentFormState } from '@/lib/validations/student';
import { createAuditLog } from '@/lib/audit';
import { isExamEditable } from '@/lib/constants';

type AdminClient = ReturnType<typeof createAdminClient>;

function handleDatabaseError(error: { code?: string; message?: string }): StudentFormState {
  if (error.code === '23505') {
    const message = error.message ?? '';
    if (message.includes('index_number') || message.includes('idx_students_exam_index')) {
      return {
        error: 'Validation error.',
        fieldErrors: {
          index_number: ['This index number is already registered in this examination.'],
        },
      };
    }
    if (message.includes('nic_number') || message.includes('idx_students_exam_nic')) {
      return {
        error: 'Validation error.',
        fieldErrors: { nic_number: ['This NIC number is already registered in this examination.'] },
      };
    }
    return { error: 'A student with this information already exists.' };
  }
  if (error.code === '23503')
    return {
      error: 'Please select an existing examination.',
      fieldErrors: { examination_id: ['This examination is no longer available.'] },
    };
  console.error('[Student Mutation Error]', { code: error.code });
  return { error: 'A database error occurred. Please try again.' };
}

function revalidateStudent(id: string) {
  revalidateTag('student-lookups');
  revalidateTag('students');
  revalidateTag('examinations');
  revalidateTag('dashboard');
  revalidatePath('/admin/students');
  revalidatePath(`/admin/students/${id}`);
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/examinations');
}

async function examinationMutationError(
  client: AdminClient,
  examinationId: string
): Promise<string | null> {
  const { data, error } = await client
    .from('examinations')
    .select('status')
    .eq('id', examinationId)
    .maybeSingle();
  if (error || !data) return 'Examination not found. Please select a valid examination.';
  return isExamEditable(data.status)
    ? null
    : 'Published and archived examinations are read-only.';
}

export async function saveStudentAction(
  _prevState: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  let createdId: string | undefined;
  let savedId: string | undefined;
  try {
    const adminId = await getAdminUserId();
    if (!adminId) return { error: 'Authentication required.' };
    const rawId = formData.get('id');
    if (rawId !== null && typeof rawId !== 'string') return { error: 'Invalid student ID.' };
    const id = rawId?.trim();
    if (id && !z.uuid().safeParse(id).success) return { error: 'Invalid student ID.' };
    const validation = studentSchema.safeParse({
      examination_id: formData.get('examination_id'),
      full_name: formData.get('full_name'),
      index_number: formData.get('index_number'),
      nic_number: formData.get('nic_number'),
      school_name: formData.get('school_name'),
      examination_center: formData.get('examination_center'),
    });
    if (!validation.success)
      return {
        error: 'Please fix the errors below.',
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    const admin = createAdminClient();
    const { examination_id, ...personal } = validation.data;
    if (id) {
      const { data: existing, error: fetchError } = await admin
        .from('students')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchError || !existing) return { error: 'Student not found.' };
      if (existing.examination_id !== examination_id)
        return { error: 'The student’s examination cannot be changed.' };
      const locked = await examinationMutationError(admin, existing.examination_id);
      if (locked) return { error: locked };
      const { data: updated, error } = await admin
        .from('students')
        .update(personal)
        .eq('id', id)
        .select('id')
        .single();
      if (error) return handleDatabaseError(error);
      if (!updated) return { error: 'Student not found.' };
      savedId = id;
      await createAuditLog({
        admin_id: adminId,
        action: 'STUDENT_UPDATED',
        entity_type: 'student',
        entity_id: id,
        old_value: existing,
        new_value: personal,
      });
      revalidateStudent(id);
      return { success: true, message: 'Student record updated successfully.' };
    }
    const locked = await examinationMutationError(admin, examination_id);
    if (locked) return { error: locked };
    const { data: created, error } = await admin
      .from('students')
      .insert(validation.data)
      .select('id')
      .single();
    if (error || !created) return handleDatabaseError(error ?? {});
    createdId = created.id;
    savedId = created.id;
    await createAuditLog({
      admin_id: adminId,
      action: 'STUDENT_CREATED',
      entity_type: 'student',
      entity_id: created.id,
      new_value: validation.data,
    });
    revalidateStudent(created.id);
  } catch {
    if (savedId) {
      revalidateStudent(savedId);
      return {
        error:
          'The student was saved, but the audit log could not be recorded. Check the students list before submitting again.',
      };
    }
    return { error: 'Unable to save the student. Please try again.' };
  }
  redirect(`/admin/students/${createdId}`);
}

export async function deleteStudentAction(id: string): Promise<{ error?: string }> {
  let deleted = false;
  try {
    const adminId = await getAdminUserId();
    if (!adminId) return { error: 'Authentication required.' };
    if (!z.uuid().safeParse(id).success) return { error: 'Invalid student ID.' };
    const admin = createAdminClient();
    const { data: student, error: fetchError } = await admin
      .from('students')
      .select('*, examination:examinations!examination_id(status)')
      .eq('id', id)
      .single();
    if (fetchError || !student) return { error: 'Student not found.' };
    if (!student.examination)
      return { error: 'Unable to verify examination status. Please try again.' };
    if (!isExamEditable(student.examination.status))
      return {
        error: 'Students cannot be deleted from published or archived examinations.',
      };
    const { data: removed, error } = await admin
      .from('students')
      .delete()
      .eq('id', id)
      .select('id')
      .single();
    if (error || !removed) return { error: 'Failed to delete student. Please try again.' };
    deleted = true;
    await createAuditLog({
      admin_id: adminId,
      action: 'STUDENT_DELETED',
      entity_type: 'student',
      entity_id: id,
      old_value: student,
    });
    revalidateStudent(id);
  } catch {
    if (deleted) {
      revalidateStudent(id);
      return {
        error:
          'The student was deleted, but the audit log could not be recorded. Return to the students list.',
      };
    }
    return { error: 'Failed to delete student. Please try again.' };
  }
  redirect('/admin/students');
}
