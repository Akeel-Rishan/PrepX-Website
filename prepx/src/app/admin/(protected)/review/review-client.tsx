'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  Search,
  X,
} from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getStudentGradesForReviewAction,
  saveReviewGradeAction,
} from '@/lib/actions/review';
import type {
  IncompleteReviewData,
  IncompleteReviewStudent,
  ReviewSubjectGrade,
} from '@/lib/data/review';
import { getExamStatusBadgeVariant, getExamStatusLabel } from '@/lib/exam-utils';
import type { Examination } from '@/types';

const PAGE_SIZE = 20;
const GRADES = ['A', 'B', 'C', 'S', 'W', 'AB'] as const;

interface ReviewClientProps {
  examinations: Array<Pick<Examination, 'id' | 'name' | 'year' | 'status'>>;
  selectedExam: Pick<Examination, 'id' | 'name' | 'year' | 'status'> | null;
  initialData: IncompleteReviewData | null;
  loadError: boolean;
}

interface GradeDrawerProps {
  student: IncompleteReviewStudent;
  examinationId: string;
  readOnly: boolean;
  grades: ReviewSubjectGrade[] | null;
  loadError: string | null;
  onClose: () => void;
  onGradeSaved: (subjectId: string, grade: string, wasMissing: boolean) => void;
}

function GradeDrawer({
  student,
  examinationId,
  readOnly,
  grades,
  loadError,
  onClose,
  onGradeSaved,
}: GradeDrawerProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedGrades, setSelectedGrades] = useState<Record<string, string>>({});
  const [pendingSubjectId, setPendingSubjectId] = useState<string | null>(null);
  const [rowMessages, setRowMessages] = useState<Record<string, { kind: 'success' | 'error'; text: string }>>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    if (!grades) return;
    setSelectedGrades(Object.fromEntries(grades.map((row) => [row.subjectId, row.currentGrade ?? ''])));
  }, [grades]);

  async function saveGrade(row: ReviewSubjectGrade) {
    const selected = selectedGrades[row.subjectId] ?? '';
    if (!selected || pendingSubjectId) return;
    setPendingSubjectId(row.subjectId);
    setRowMessages((messages) => {
      const next = { ...messages };
      delete next[row.subjectId];
      return next;
    });
    try {
      const result = await saveReviewGradeAction(examinationId, student.studentId, row.subjectId, selected);
      if (result.status === 'error') {
        setRowMessages((messages) => ({ ...messages, [row.subjectId]: { kind: 'error', text: result.error } }));
      } else if (result.status === 'no_change') {
        setRowMessages((messages) => ({ ...messages, [row.subjectId]: { kind: 'success', text: 'No change.' } }));
      } else {
        const wasMissing = row.currentGrade === null;
        onGradeSaved(row.subjectId, result.newGrade, wasMissing);
        setRowMessages((messages) => ({ ...messages, [row.subjectId]: { kind: 'success', text: 'Saved.' } }));
      }
    } catch {
      setRowMessages((messages) => ({
        ...messages,
        [row.subjectId]: { kind: 'error', text: 'Failed to save. Please try again.' },
      }));
    } finally {
      setPendingSubjectId(null);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="review-drawer-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-black/50 open:block"
    >
      <section className="review-grade-sheet fixed bottom-0 left-0 flex h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl md:bottom-auto md:left-auto md:right-0 md:top-0 md:h-[100dvh] md:w-[480px] md:rounded-none">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <h3 id="review-drawer-title" className="truncate text-lg font-semibold text-gray-900">{student.fullName}</h3>
            <p className="mt-1 text-sm text-gray-600">Index: {student.indexNumber}</p>
            <p className="truncate text-sm text-gray-500">School: {student.schoolName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close grade editor" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {readOnly && (
            <Alert variant="info" className="mb-4">
              This published examination is read-only.
            </Alert>
          )}
          {!grades && !loadError && (
            <div className="space-y-3" aria-label="Loading grades">
              {[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-gray-100" />)}
            </div>
          )}
          {loadError && <Alert variant="error">{loadError}</Alert>}
          {grades?.length === 0 && <Alert variant="info">No active subjects found for this examination.</Alert>}
          {grades && grades.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                  <tr><th className="px-3 py-2.5">Subject</th><th className="px-3 py-2.5">Grade</th><th className="px-3 py-2.5 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {grades.map((row) => {
                    const missing = row.required && row.currentGrade === null;
                    const message = rowMessages[row.subjectId];
                    return (
                      <tr key={row.subjectId} className={missing ? 'bg-amber-50' : 'bg-white'}>
                        <td className="px-3 py-3 align-top">
                          <p className="font-medium text-gray-900">{row.subjectName}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{row.subjectCode ?? (row.required ? 'Required' : 'Optional')}</p>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <select
                            aria-label={`Grade for ${row.subjectName}`}
                            value={selectedGrades[row.subjectId] ?? ''}
                            onChange={(event) => setSelectedGrades((current) => ({ ...current, [row.subjectId]: event.target.value }))}
                            disabled={readOnly || pendingSubjectId === row.subjectId}
                            className="h-8 min-w-[82px] rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="">— Select —</option>
                            {GRADES.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                          </select>
                          {row.currentGrade && !message && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-green-700"><Check aria-hidden="true" className="h-3 w-3" /> Saved: {row.currentGrade}</p>
                          )}
                          {message && <p className={`mt-1 text-xs ${message.kind === 'error' ? 'text-red-700' : 'text-green-700'}`}>{message.text}</p>}
                        </td>
                        <td className="px-3 py-3 text-right align-top">
                          {!readOnly && (
                            <Button
                              size="sm"
                              onClick={() => saveGrade(row)}
                              disabled={!selectedGrades[row.subjectId] || pendingSubjectId !== null}
                              loading={pendingSubjectId === row.subjectId}
                            >Save</Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </dialog>
  );
}

export function ReviewClient({ examinations, selectedExam, initialData, loadError }: ReviewClientProps): JSX.Element {
  const router = useRouter();
  const [isChangingExam, startExamTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState(initialData?.incompleteStudents ?? []);
  const [activeStudent, setActiveStudent] = useState<IncompleteReviewStudent | null>(null);
  const [drawerGrades, setDrawerGrades] = useState<ReviewSubjectGrade[] | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    setRecords(initialData?.incompleteStudents ?? []);
    setSearch('');
    setPage(1);
  }, [initialData, selectedExam?.id]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return records;
    return records.filter((student) =>
      student.fullName.toLocaleLowerCase().includes(term) ||
      student.indexNumber.toLocaleLowerCase().includes(term)
    );
  }, [records, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRecords = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const incompleteCount = records.length;
  const completeCount = Math.max(0, (initialData?.totalStudents ?? 0) - incompleteCount);
  const readOnly = selectedExam?.status === 'PUBLISHED';

  function changeExam(examinationId: string) {
    setActiveStudent(null);
    startExamTransition(() => router.push(`/admin/review?examId=${examinationId}`));
  }

  async function openStudent(student: IncompleteReviewStudent) {
    if (!selectedExam) return;
    const currentRequest = ++requestId.current;
    setActiveStudent(student);
    setDrawerGrades(null);
    setDrawerError(null);
    const result = await getStudentGradesForReviewAction(student.studentId, selectedExam.id);
    if (currentRequest !== requestId.current) return;
    if (result.error) setDrawerError(result.error);
    else setDrawerGrades(result.data ?? []);
  }

  function closeDrawer() {
    requestId.current += 1;
    setActiveStudent(null);
    setDrawerGrades(null);
    setDrawerError(null);
    router.refresh();
  }

  function handleGradeSaved(subjectId: string, grade: string, wasMissing: boolean) {
    setDrawerGrades((current) => current?.map((row) => row.subjectId === subjectId ? { ...row, currentGrade: grade } : row) ?? null);
    if (!activeStudent || !wasMissing) return;
    setRecords((current) => current.flatMap((student) => {
      if (student.studentId !== activeStudent.studentId) return [student];
      const missingSubjects = student.missingSubjects.filter((subject) => subject.subjectId !== subjectId);
      return missingSubjects.length ? [{ ...student, missingSubjects }] : [];
    }));
    setActiveStudent((student) => student ? { ...student, missingSubjects: student.missingSubjects.filter((subject) => subject.subjectId !== subjectId) } : null);
  }

  if (examinations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="font-medium text-gray-700">No examinations found.</p>
        <Link href="/admin/examinations" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">Create an examination first</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="review-exam" className="text-sm font-medium text-gray-700">Examination:</label>
            <select id="review-exam" value={selectedExam?.id ?? ''} onChange={(event) => changeExam(event.target.value)} disabled={isChangingExam} className="min-w-[240px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60">
              {examinations.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} {exam.year}</option>)}
            </select>
          </div>
          {selectedExam && <Badge variant={getExamStatusBadgeVariant(selectedExam.status)}>{readOnly && <Lock aria-hidden="true" className="mr-1 h-3 w-3" />}{getExamStatusLabel(selectedExam.status)}</Badge>}
        </div>
      </div>

      {isChangingExam ? (
        <div className="space-y-3" aria-label="Loading examination review">
          <div className="grid gap-3 md:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}</div>
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : loadError || !initialData ? (
        <Alert variant="error">Failed to load review data. Please refresh the page.</Alert>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-gray-600">Total Students</p><p className="mt-1 text-2xl font-bold text-gray-900">{initialData.totalStudents}</p></div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4"><p className="text-xs font-medium uppercase tracking-wide text-green-700">Complete Records</p><p className="mt-1 text-2xl font-bold text-green-700">{completeCount}</p></div>
            <div className={`rounded-xl border p-4 ${incompleteCount ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}><p className={`text-xs font-medium uppercase tracking-wide ${incompleteCount ? 'text-amber-800' : 'text-green-700'}`}>Incomplete Records</p><p className={`mt-1 text-2xl font-bold ${incompleteCount ? 'text-amber-700' : 'text-green-700'}`}>{incompleteCount}</p></div>
          </div>

          {readOnly && <Alert variant="info">This examination is published. Review data is read-only.</Alert>}
          {incompleteCount === 0 ? (
            <Alert variant="success"><span className="font-medium">All records are complete. This examination is ready for publication review.</span></Alert>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 p-4">
                <div className="relative max-w-md">
                  <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by student name or index number..." aria-label="Search incomplete records" className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"><tr><th className="px-4 py-3">Index No.</th><th className="px-4 py-3">Student Name</th><th className="px-4 py-3">School</th><th className="px-4 py-3">Missing Subjects</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleRecords.map((student) => (
                      <tr key={student.studentId} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-700">{student.indexNumber}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{student.fullName}</td>
                        <td className="px-4 py-3 text-gray-700">{student.schoolName}</td>
                        <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">{student.missingSubjects.map((subject) => <span key={subject.subjectId} className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">{subject.subjectName}</span>)}</div></td>
                        <td className="px-4 py-3 text-right"><Button variant="outline" size="sm" onClick={() => openStudent(student)}>{readOnly ? 'View Grades' : 'Fix Grades →'}</Button></td>
                      </tr>
                    ))}
                    {visibleRecords.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No incomplete students match your search.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-600">{filtered.length ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}` : 'No results'}</p>
                {totalPages > 1 && <div className="flex items-center gap-2"><Button variant="outline" size="sm" aria-label="Previous page" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}><ChevronLeft aria-hidden="true" className="h-4 w-4" /></Button><span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span><Button variant="outline" size="sm" aria-label="Next page" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}><ChevronRight aria-hidden="true" className="h-4 w-4" /></Button></div>}
              </div>
            </div>
          )}
        </>
      )}

      {activeStudent && selectedExam && (
        <GradeDrawer
          student={activeStudent}
          examinationId={selectedExam.id}
          readOnly={readOnly}
          grades={drawerGrades}
          loadError={drawerError}
          onClose={closeDrawer}
          onGradeSaved={handleGradeSaved}
        />
      )}
    </div>
  );
}
