import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { computeIncompleteStudents } from '@/lib/review-utils';
import type { Student } from '@/types';

export interface MissingReviewSubject {
  subjectId: string;
  subjectName: string;
}

export interface IncompleteReviewStudent {
  studentId: string;
  fullName: string;
  indexNumber: string;
  schoolName: string;
  missingSubjects: MissingReviewSubject[];
}

export interface IncompleteReviewData {
  totalStudents: number;
  completeCount: number;
  incompleteCount: number;
  incompleteStudents: IncompleteReviewStudent[];
}

export interface ReviewSubjectGrade {
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  required: boolean;
  displayOrder: number;
  currentGrade: string | null;
  resultId: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Loads all rows in bounded batches so review counts are not truncated by the API row limit. */
async function loadStudents(examinationId: string): Promise<Student[]> {
  const client = createAdminClient();
  const students: Student[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from('students')
      .select('*')
      .eq('examination_id', examinationId)
      .order('index_number', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error('students');
    students.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return students;
}

/** Returns the complete/incomplete summary and all students missing active required grades. */
export async function getIncompleteReviewData(examinationId: string): Promise<IncompleteReviewData> {
  noStore();
  if (!UUID_REGEX.test(examinationId)) throw new Error('Invalid examination');
  const client = createAdminClient();
  const [students, subjectsResult] = await Promise.all([
    loadStudents(examinationId),
    client
      .from('subjects')
      .select('id, subject_name')
      .eq('examination_id', examinationId)
      .eq('active', true)
      .eq('required', true)
      .order('display_order', { ascending: true }),
  ]);
  if (subjectsResult.error) throw new Error('subjects');

  const requiredSubjects = subjectsResult.data ?? [];
  const requiredSubjectIds = requiredSubjects.map((subject) => subject.id);
  const existingResults: Array<{ studentId: string; subjectId: string }> = [];
  if (students.length && requiredSubjectIds.length) {
    // Keep IN filters well below URL limits and combine the results in memory.
    for (let start = 0; start < students.length; start += 100) {
      const studentIds = students.slice(start, start + 100).map((student) => student.id);
      for (let from = 0; ; from += 1000) {
        const { data, error } = await client
          .from('student_results')
          .select('student_id, subject_id')
          .in('student_id', studentIds)
          .in('subject_id', requiredSubjectIds)
          .order('id')
          .range(from, from + 999);
        if (error) throw new Error('results');
        existingResults.push(
          ...(data ?? []).map((result) => ({
            studentId: result.student_id,
            subjectId: result.subject_id,
          }))
        );
        if ((data?.length ?? 0) < 1000) break;
      }
    }
  }

  const incomplete = computeIncompleteStudents(students, requiredSubjectIds, existingResults);
  const studentsById = new Map(students.map((student) => [student.id, student]));
  const subjectsById = new Map(requiredSubjects.map((subject) => [subject.id, subject]));
  const incompleteStudents: IncompleteReviewStudent[] = incomplete.flatMap((record) => {
    const student = studentsById.get(record.studentId);
    if (!student) return [];
    return [{
      studentId: student.id,
      fullName: student.full_name,
      indexNumber: student.index_number,
      schoolName: student.school_name,
      missingSubjects: record.missingSubjectIds.flatMap((subjectId) => {
        const subject = subjectsById.get(subjectId);
        return subject ? [{ subjectId, subjectName: subject.subject_name }] : [];
      }),
    }];
  });

  return {
    totalStudents: students.length,
    completeCount: students.length - incompleteStudents.length,
    incompleteCount: incompleteStudents.length,
    incompleteStudents,
  };
}

/** Loads all active subjects and saved grades for one student in the selected examination. */
export async function getStudentGradesForReviewData(
  studentId: string,
  examinationId: string
): Promise<ReviewSubjectGrade[]> {
  noStore();
  if (!UUID_REGEX.test(studentId) || !UUID_REGEX.test(examinationId)) {
    throw new Error('Invalid identifiers');
  }
  const client = createAdminClient();
  const [studentResult, subjectsResult, gradesResult] = await Promise.all([
    client
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('examination_id', examinationId)
      .maybeSingle(),
    client
      .from('subjects')
      .select('id, subject_name, subject_code, required, display_order')
      .eq('examination_id', examinationId)
      .eq('active', true)
      .order('display_order', { ascending: true }),
    client.from('student_results').select('id, subject_id, grade').eq('student_id', studentId),
  ]);
  if (studentResult.error || !studentResult.data || subjectsResult.error || gradesResult.error) {
    throw new Error('Review grades could not be loaded');
  }
  const gradesBySubject = new Map((gradesResult.data ?? []).map((row) => [row.subject_id, row]));
  return (subjectsResult.data ?? []).map((subject) => {
    const result = gradesBySubject.get(subject.id);
    return {
      subjectId: subject.id,
      subjectName: subject.subject_name,
      subjectCode: subject.subject_code,
      required: subject.required,
      displayOrder: subject.display_order,
      currentGrade: result?.grade ?? null,
      resultId: result?.id ?? null,
    };
  });
}
