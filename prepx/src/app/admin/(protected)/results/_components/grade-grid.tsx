'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  Lock,
  Users,
} from 'lucide-react';
import { Pagination } from '@/components/admin/pagination';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { saveGradesAction } from '@/lib/actions/grades';
import type { GradeChange, GradeGridData } from '@/lib/data/grades';
import { GradeCell } from './grade-cell';

interface GradeGridProps {
  data: GradeGridData;
  examinationId: string;
  isPublished: boolean;
  currentParams: Record<string, string>;
}

type StudentStatus = 'complete' | 'incomplete' | 'empty';

function StatusBadge({ status }: { status: StudentStatus }): JSX.Element {
  if (status === 'complete') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-700">
        <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> Complete
      </span>
    );
  }
  if (status === 'incomplete') {
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600">
        <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" /> Incomplete
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-gray-400">
      <CircleDashed aria-hidden="true" className="h-3.5 w-3.5" /> No grades
    </span>
  );
}

export function GradeGrid({
  data,
  examinationId,
  isPublished,
  currentParams,
}: GradeGridProps): JSX.Element {
  const router = useRouter();
  const [dirtyGrades, setDirtyGrades] = useState<Map<string, string | null>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout>>();

  const initialGradesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const student of data.students) {
      for (const grade of student.grades) {
        map.set(`${student.id}|${grade.subject_id}`, grade.grade);
      }
    }
    return map;
  }, [data.students]);

  const requiredSubjectIds = useMemo(
    () => data.subjects.filter((subject) => subject.required).map((subject) => subject.id),
    [data.subjects]
  );

  useEffect(() => {
    setDirtyGrades(new Map());
  }, [data]);

  useEffect(() => () => clearTimeout(successTimer.current), []);

  function getCurrentGrade(studentId: string, subjectId: string): string {
    const key = `${studentId}|${subjectId}`;
    if (dirtyGrades.has(key)) return dirtyGrades.get(key) ?? '';
    return initialGradesMap.get(key) ?? '';
  }

  function getStudentStatus(studentId: string): StudentStatus {
    const hasAny = data.subjects.some((subject) => getCurrentGrade(studentId, subject.id) !== '');
    if (!hasAny) return 'empty';
    return requiredSubjectIds.every((subjectId) => getCurrentGrade(studentId, subjectId) !== '')
      ? 'complete'
      : 'incomplete';
  }

  function handleGradeChange(studentId: string, subjectId: string, newValue: string) {
    if (isPublished) return;
    const key = `${studentId}|${subjectId}`;
    const original = initialGradesMap.get(key) ?? '';
    setSaveError(null);
    setSaveSuccess(false);
    setDirtyGrades((previous) => {
      const next = new Map(previous);
      if (newValue === original) next.delete(key);
      else next.set(key, newValue || null);
      return next;
    });
  }

  async function handleSave() {
    if (dirtyGrades.size === 0 || isSaving || isPublished) return;
    const changes: GradeChange[] = [];
    dirtyGrades.forEach((grade, key) => {
      const [studentId, subjectId] = key.split('|');
      changes.push({ studentId, subjectId, grade });
    });
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const result = await saveGradesAction(examinationId, changes);
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      setDirtyGrades(new Map());
      setSaveSuccess(true);
      router.refresh();
      clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Failed to save grades. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {!isPublished && dirtyGrades.size > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            <p className="text-sm font-medium text-orange-800">
              {dirtyGrades.size} unsaved change{dirtyGrades.size === 1 ? '' : 's'}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleSave} loading={isSaving}>
            Save {dirtyGrades.size} Change{dirtyGrades.size === 1 ? '' : 's'}
          </Button>
        </div>
      )}

      {saveError && (
        <Alert variant="error" onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}
      {saveSuccess && <Alert variant="success">Grades saved successfully.</Alert>}
      {isPublished && (
        <Alert variant="info">
          <span className="flex items-center gap-2">
            <Lock aria-hidden="true" className="h-4 w-4" />
            This examination is published. Grades are read-only.
          </span>
        </Alert>
      )}

      {data.subjects.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <BookOpen aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-400">No active subjects found for this examination.</p>
          <Link href={`/admin/subjects?examId=${examinationId}`} className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
            Add subjects in the Subjects page
          </Link>
        </div>
      )}

      {data.subjects.length > 0 && data.students.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <Users aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-400">No students found. Try adjusting your search.</p>
        </div>
      )}

      {data.subjects.length > 0 && data.students.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="sticky left-0 z-20 min-w-[200px] border-r border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Student
                  </th>
                  {data.subjects.map((subject) => (
                    <th key={subject.id} className="min-w-[80px] px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="max-w-[70px] truncate" title={subject.subject_name}>
                          {subject.subject_code ?? subject.subject_name.slice(0, 4)}
                        </span>
                        {subject.required && <span className="text-[10px] font-normal normal-case text-blue-400">req</span>}
                      </div>
                    </th>
                  ))}
                  <th className="min-w-[110px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.students.map((student) => (
                  <tr key={student.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 border-r border-gray-100 bg-white px-4 py-3">
                      <div className="text-sm font-medium leading-tight text-gray-900">{student.full_name}</div>
                      <div className="mt-0.5 font-mono text-xs text-gray-400">{student.index_number}</div>
                    </td>
                    {data.subjects.map((subject) => (
                      <td key={subject.id} className="px-2 py-2.5 text-center">
                        <GradeCell
                          studentId={student.id}
                          subjectId={subject.id}
                          value={getCurrentGrade(student.id, subject.id)}
                          isDirty={dirtyGrades.has(`${student.id}|${subject.id}`)}
                          disabled={isPublished || isSaving}
                          onChange={handleGradeChange}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2.5"><StatusBadge status={getStudentStatus(student.id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={data.currentPage}
            totalPages={data.totalPages}
            totalCount={data.totalCount}
            pageSize={data.pageSize}
            basePath="/admin/results"
            currentParams={currentParams}
          />
        </div>
      )}
    </div>
  );
}
