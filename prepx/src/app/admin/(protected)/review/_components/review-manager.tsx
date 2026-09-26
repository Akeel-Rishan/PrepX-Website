'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, CircleDashed, Search } from 'lucide-react';
import { Pagination } from '@/components/admin/pagination';
import { Button } from '@/components/ui/button';
import type { ReviewData, ReviewStudentRow, StatusFilter } from '@/lib/data/review';
import { cn } from '@/lib/utils';
import { StudentGradeEditorModal } from './student-grade-editor-modal';

interface ReviewManagerProps {
  data: ReviewData;
  examinationId: string;
  initialStatusFilter: StatusFilter;
  initialSearch: string;
  isPublished: boolean;
  currentParams: Record<string, string>;
}

function MissingList({ student }: { student: ReviewStudentRow }): JSX.Element {
  if (student.missingCount === 0) return <span className="text-xs text-green-700">None — complete</span>;
  if (student.status === 'empty') return <span className="text-xs text-gray-600">{student.missingCount} required subject{student.missingCount === 1 ? '' : 's'} missing</span>;
  const shown = student.missingSubjectNames.slice(0, 2).join(', ');
  const extra = student.missingCount - 2;
  return <span className="text-xs text-amber-800">{shown}{extra > 0 && <span className="text-gray-500"> +{extra} more</span>}</span>;
}

function Status({ status }: { status: ReviewStudentRow['status'] }): JSX.Element {
  if (status === 'complete') return <span className="flex items-center gap-1.5 text-xs font-medium text-green-700"><CheckCircle2 className="h-4 w-4" /> Complete</span>;
  if (status === 'incomplete') return <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700"><AlertTriangle className="h-4 w-4" /> Incomplete</span>;
  return <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600"><CircleDashed className="h-4 w-4" /> No Grades</span>;
}

/** Manages review filters, search, pagination, and the batch grade editor. */
export function ReviewManager({ data, examinationId, initialStatusFilter, initialSearch, isPublished, currentParams }: ReviewManagerProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [editingStudent, setEditingStudent] = useState<ReviewStudentRow | null>(null);
  const [searchValue, setSearchValue] = useState(initialSearch);
  useEffect(() => setSearchValue(initialSearch), [initialSearch]);
  useEffect(() => {
    if (searchValue === initialSearch) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      params.set('examId', examinationId);
      if (initialStatusFilter !== 'needs_attention') params.set('status', initialStatusFilter);
      if (searchValue.trim()) params.set('search', searchValue.trim());
      router.push(`${pathname}?${params}`);
    }, 350);
    return () => clearTimeout(timer);
  }, [examinationId, initialSearch, initialStatusFilter, pathname, router, searchValue]);

  function changeStatus(status: StatusFilter) {
    setSearchValue('');
    const params = new URLSearchParams({ examId: examinationId });
    if (status !== 'needs_attention') params.set('status', status);
    router.push(`${pathname}?${params}`);
  }
  const pills: Array<{ value: StatusFilter; label: string; count: number }> = [
    { value: 'needs_attention', label: 'Needs Attention', count: data.summary.incomplete + data.summary.empty },
    { value: 'incomplete', label: 'Incomplete', count: data.summary.incomplete },
    { value: 'empty', label: 'No Grades', count: data.summary.empty },
    { value: 'complete', label: 'Complete', count: data.summary.complete },
    { value: 'all', label: 'All', count: data.summary.total },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">{pills.map((pill) => <button key={pill.value} type="button" onClick={() => changeStatus(pill.value)} className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors', initialStatusFilter === pill.value ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400')}><span>{pill.label}</span><span className={cn('rounded-full px-1.5 py-0.5 text-xs', initialStatusFilter === pill.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700')}>{pill.count}</span></button>)}</div>
      <div className="relative max-w-md"><Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="search" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} aria-label="Search students" placeholder="Search by name or index number..." className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>

      {data.students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center"><CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-500" /><p className="font-semibold text-gray-800">{initialStatusFilter === 'needs_attention' && !initialSearch ? 'All students have complete grades!' : 'No students match this filter.'}</p><p className="mt-1 text-sm text-gray-500">{initialStatusFilter === 'needs_attention' && !initialSearch ? 'The examination is ready for publication review.' : 'Try changing the filter or search.'}</p></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"><th className="px-5 py-3">Student</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Missing Required Subjects</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{data.students.map((student) => <tr key={student.id} className={cn('hover:bg-gray-50/60', student.status === 'empty' && 'bg-orange-50/30', student.status === 'incomplete' && 'bg-amber-50/20')}><td className="px-5 py-4"><p className="font-medium text-gray-900">{student.full_name}</p><p className="mt-0.5 font-mono text-xs text-gray-500">{student.index_number}</p><p className="mt-0.5 text-xs text-gray-500">{student.school_name}</p></td><td className="whitespace-nowrap px-5 py-4"><Status status={student.status} /></td><td className="px-5 py-4"><MissingList student={student} /></td><td className="px-5 py-4 text-right">{isPublished ? <Button variant="secondary" size="sm" disabled>Locked</Button> : <Button variant="outline" size="sm" onClick={() => setEditingStudent(student)} className="border-blue-300 text-blue-700 hover:bg-blue-50">Edit Grades</Button>}</td></tr>)}</tbody></table></div><Pagination currentPage={data.currentPage} totalPages={data.totalPages} totalCount={data.totalFiltered} pageSize={data.pageSize} basePath="/admin/review" currentParams={currentParams} /></div>
      )}
      <StudentGradeEditorModal isOpen={Boolean(editingStudent)} onClose={() => setEditingStudent(null)} onSuccess={() => router.refresh()} student={editingStudent} allSubjects={data.allSubjects} examinationId={examinationId} />
    </div>
  );
}
