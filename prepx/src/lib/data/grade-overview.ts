import 'server-only';

import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import type { Student, Subject } from '@/types';

type OverviewStudent = Pick<Student, 'id' | 'full_name' | 'index_number' | 'school_name'>;
export interface GradeOverview {
  students: OverviewStudent[];
  subjects: Subject[];
  grades: Array<{ student_id: string; subject_id: string; grade: string }>;
}

/** Share successful snapshots across grade/review searches and pages. */
export const getGradeOverview = unstable_cache(
  async (examinationId: string): Promise<GradeOverview> => {
    const client = createAdminClient();
    const students = async () => {
      const rows: OverviewStudent[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await client.from('students')
          .select('id, full_name, index_number, school_name')
          .eq('examination_id', examinationId).order('index_number').order('id')
          .range(from, from + 999);
        if (error) throw new Error('Unable to load examination students.');
        rows.push(...(data ?? []));
        if ((data?.length ?? 0) < 1000) return rows;
      }
    };
    const subjects = async () => {
      const rows: Subject[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await client.from('subjects').select('*')
          .eq('examination_id', examinationId).eq('active', true)
          .order('display_order').order('id').range(from, from + 999);
        if (error) throw new Error('Unable to load examination subjects.');
        rows.push(...(data ?? []));
        if ((data?.length ?? 0) < 1000) return rows;
      }
    };
    const grades = async () => {
      const rows: GradeOverview['grades'] = [];
      for (let from = 0; ; from += 1000) {
        // Join by examination rather than serial requests for each 100 students.
        const { data, error } = await client.from('student_results')
          .select('student_id, subject_id, grade, student:students!inner(examination_id)')
          .eq('student.examination_id', examinationId).order('id').range(from, from + 999);
        if (error) throw new Error('Unable to load examination grades.');
        rows.push(...(data ?? []).map(({ student_id, subject_id, grade }) => ({ student_id, subject_id, grade })));
        if ((data?.length ?? 0) < 1000) return rows;
      }
    };
    const [studentRows, subjectRows, gradeRows] = await Promise.all([students(), subjects(), grades()]);
    const activeIds = new Set(subjectRows.map(subject => subject.id));
    return { students: studentRows, subjects: subjectRows, grades: gradeRows.filter(grade => activeIds.has(grade.subject_id)) };
  },
  ['grade-overview-v1'],
  { revalidate: 30, tags: ['results', 'students', 'subjects'] }
);
