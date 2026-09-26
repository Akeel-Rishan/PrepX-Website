import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import type { Examination } from '@/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 1000;

export interface PublicationCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  blocking: boolean;
}

export interface PublicationStats {
  totalStudents: number;
  completeStudents: number;
  incompleteStudents: number;
  emptyStudents: number;
  totalSubjects: number;
  activeSubjects: number;
  requiredSubjects: number;
}

export interface PublicationValidationResult {
  examination: Examination;
  stats: PublicationStats;
  checks: PublicationCheck[];
  blockingErrors: string[];
  warnings: string[];
  canPublish: boolean;
}

interface SubjectCoverageRow {
  id: string;
  required: boolean;
  active: boolean;
}

interface StudentIdRow {
  id: string;
}

interface GradeCoverageRow {
  student_id: string;
  subject_id: string;
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function loadSubjects(
  client: AdminClient,
  examinationId: string
): Promise<SubjectCoverageRow[]> {
  const rows: SubjectCoverageRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('subjects')
      .select('id, required, active')
      .eq('examination_id', examinationId)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error('subjects-query');
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) return rows;
  }
}

async function loadStudents(client: AdminClient, examinationId: string): Promise<StudentIdRow[]> {
  const rows: StudentIdRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('students')
      .select('id')
      .eq('examination_id', examinationId)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error('students-query');
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) return rows;
  }
}

async function loadGrades(client: AdminClient, examinationId: string): Promise<GradeCoverageRow[]> {
  const rows: GradeCoverageRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('student_results')
      .select('student_id, subject_id, student:students!inner(examination_id)')
      .eq('student.examination_id', examinationId)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error('grades-query');
    rows.push(...(data ?? []).map(({ student_id, subject_id }) => ({ student_id, subject_id })));
    if ((data?.length ?? 0) < PAGE_SIZE) return rows;
  }
}

/**
 * Loads a fresh, server-only publication readiness report for one examination.
 * Missing grades are warnings; setup failures and archived exams block publication.
 */
export async function getPublicationValidation(
  examinationId: string
): Promise<PublicationValidationResult | null> {
  if (!UUID_REGEX.test(examinationId)) return null;

  const client = createAdminClient();
  const { data: examination, error: examinationError } = await client
    .from('examinations')
    .select('*')
    .eq('id', examinationId)
    .maybeSingle();

  if (examinationError) {
    console.error('[publication] Examination query failed', { code: examinationError.code });
    throw new Error('Publication validation could not be completed.');
  }
  if (!examination) return null;

  try {
    const [subjects, students, grades] = await Promise.all([
      loadSubjects(client, examinationId),
      loadStudents(client, examinationId),
      loadGrades(client, examinationId),
    ]);
    const activeSubjects = subjects.filter((subject) => subject.active);
    const activeSubjectIds = new Set(activeSubjects.map((subject) => subject.id));
    const requiredSubjectIds = new Set(
      activeSubjects.filter((subject) => subject.required).map((subject) => subject.id)
    );
    const gradeCoverage = new Map<string, Set<string>>();

    for (const grade of grades) {
      if (!activeSubjectIds.has(grade.subject_id)) continue;
      const coveredSubjects = gradeCoverage.get(grade.student_id) ?? new Set<string>();
      coveredSubjects.add(grade.subject_id);
      gradeCoverage.set(grade.student_id, coveredSubjects);
    }

    let completeStudents = 0;
    let incompleteStudents = 0;
    let emptyStudents = 0;

    if (requiredSubjectIds.size === 0) {
      completeStudents = students.length;
    } else {
      for (const student of students) {
        const coveredSubjects = gradeCoverage.get(student.id);
        if (!coveredSubjects?.size) {
          emptyStudents += 1;
        } else if ([...requiredSubjectIds].every((id) => coveredSubjects.has(id))) {
          completeStudents += 1;
        } else {
          incompleteStudents += 1;
        }
      }
    }

    const stats: PublicationStats = {
      totalStudents: students.length,
      completeStudents,
      incompleteStudents,
      emptyStudents,
      totalSubjects: subjects.length,
      activeSubjects: activeSubjects.length,
      requiredSubjects: requiredSubjectIds.size,
    };
    const incompleteTotal = stats.incompleteStudents + stats.emptyStudents;
    const checks: PublicationCheck[] = [
      {
        id: 'students',
        label: 'Students registered',
        passed: stats.totalStudents > 0,
        detail:
          stats.totalStudents > 0
            ? `${stats.totalStudents} student${stats.totalStudents === 1 ? '' : 's'} registered`
            : 'No students found in this examination.',
        blocking: true,
      },
      {
        id: 'subjects',
        label: 'Active subjects configured',
        passed: stats.activeSubjects > 0,
        detail:
          stats.activeSubjects > 0
            ? `${stats.activeSubjects} active subject${stats.activeSubjects === 1 ? '' : 's'}`
            : 'No active subjects. Add subjects in the Subjects page.',
        blocking: true,
      },
      {
        id: 'required',
        label: 'Required subjects defined',
        passed: stats.requiredSubjects > 0,
        detail:
          stats.requiredSubjects > 0
            ? `${stats.requiredSubjects} required subject${stats.requiredSubjects === 1 ? '' : 's'}`
            : 'No subjects are marked as required. Mark at least one active subject as required.',
        blocking: true,
      },
      {
        id: 'completeness',
        label: 'Grade completeness',
        passed: incompleteTotal === 0,
        detail:
          incompleteTotal === 0
            ? 'All students have complete required grades.'
            : [
                stats.incompleteStudents > 0 ? `${stats.incompleteStudents} incomplete` : null,
                stats.emptyStudents > 0 ? `${stats.emptyStudents} with no grades` : null,
              ]
                .filter(Boolean)
                .join(', '),
        blocking: false,
      },
    ];
    const blockingErrors = checks
      .filter((item) => item.blocking && !item.passed)
      .map((item) => item.detail);
    const warnings =
      incompleteTotal > 0
        ? [
            `${incompleteTotal} student${incompleteTotal === 1 ? '' : 's'} will show an “Incomplete” or “No Grades” status when viewing results.`,
          ]
        : [];

    return {
      examination,
      stats,
      checks,
      blockingErrors,
      warnings,
      canPublish: examination.status !== 'ARCHIVED' && blockingErrors.length === 0,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown';
    console.error('[publication] Validation query failed', { reason });
    throw new Error('Publication validation could not be completed.');
  }
}
