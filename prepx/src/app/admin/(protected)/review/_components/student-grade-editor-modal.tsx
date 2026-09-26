'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { saveGradesAction } from '@/lib/actions/grades';
import type { GradeChange } from '@/lib/data/grades';
import type { ReviewStudentRow } from '@/lib/data/review';
import { cn } from '@/lib/utils';
import type { Subject } from '@/types';

interface StudentGradeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student: ReviewStudentRow | null;
  allSubjects: Subject[];
  examinationId: string;
}

const GRADE_TEXT: Record<string, string> = { A: 'text-green-700', B: 'text-emerald-700', C: 'text-yellow-700', S: 'text-blue-700', W: 'text-red-700', AB: 'text-gray-700', '': 'text-gray-400' };

/** Edits all active grades for one student and saves only changed cells. */
export function StudentGradeEditorModal({ isOpen, onClose, onSuccess, student, allSubjects, examinationId }: StudentGradeEditorModalProps): React.JSX.Element | null {
  const [modalGrades, setModalGrades] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialGrades = useMemo(() => Object.fromEntries((student?.grades ?? []).map((grade) => [grade.subject_id, grade.grade])), [student]);
  useEffect(() => {
    if (isOpen && student) { setModalGrades(initialGrades); setError(null); }
  }, [initialGrades, isOpen, student]);
  if (!student) return null;
  const dirtyCount = allSubjects.filter((subject) => (modalGrades[subject.id] ?? '') !== (initialGrades[subject.id] ?? '')).length;

  async function handleSave() {
    if (isSaving || dirtyCount === 0) return;
    const changes: GradeChange[] = allSubjects.flatMap((subject) => {
      const grade = modalGrades[subject.id] ?? '';
      return grade === (initialGrades[subject.id] ?? '') ? [] : [{ studentId: student!.id, subjectId: subject.id, grade: grade || null }];
    });
    setIsSaving(true); setError(null);
    try {
      const result = await saveGradesAction(examinationId, changes);
      if (result.error) setError(result.error);
      else { onSuccess(); onClose(); }
    } catch { setError('Failed to save grades. Please try again.'); }
    finally { setIsSaving(false); }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!isSaving) onClose(); }} title={`Edit Grades: ${student.full_name}`} description={`${student.index_number} · ${student.school_name}`} size="md">
      <div className="space-y-2">
        {error && <Alert variant="error">{error}</Alert>}
        {allSubjects.map((subject) => {
          const current = modalGrades[subject.id] ?? '';
          const missing = subject.required && !current;
          return <div key={subject.id} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2.5', missing ? 'border-amber-200 bg-amber-50' : 'border-transparent bg-gray-50')}>
            <div className="min-w-0 flex-1"><span className="text-sm font-medium text-gray-900">{subject.subject_name}</span><span className={cn('ml-2 text-xs', subject.required ? 'text-blue-600' : 'text-gray-500')}>{subject.required ? 'Required' : 'Optional'}</span></div>
            {missing && <span className="whitespace-nowrap text-xs font-medium text-amber-700">Missing</span>}
            <select aria-label={`Grade for ${subject.subject_name}`} value={current} disabled={isSaving} onChange={(event) => setModalGrades((grades) => ({ ...grades, [subject.id]: event.target.value }))} className={cn('h-8 w-20 cursor-pointer appearance-none rounded-md border bg-white text-center text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60', missing ? 'border-amber-300' : 'border-gray-300', GRADE_TEXT[current])}>
              <option value="">—</option>{['A', 'B', 'C', 'S', 'W', 'AB'].map((grade) => <option key={grade}>{grade}</option>)}
            </select>
          </div>;
        })}
        {allSubjects.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No active subjects for this examination.</p>}
        <div className="mt-2 flex justify-end gap-3 border-t border-gray-100 pt-4"><Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>Cancel</Button><Button size="sm" onClick={handleSave} loading={isSaving} disabled={!allSubjects.length || dirtyCount === 0}>Save {dirtyCount || ''} Grade{dirtyCount === 1 ? '' : 's'}</Button></div>
      </div>
    </Modal>
  );
}
