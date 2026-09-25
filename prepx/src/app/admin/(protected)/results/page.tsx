import type { Metadata } from 'next';
import { Lock, PenLine } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { getExamStatusBadgeVariant, getExamStatusLabel } from '@/lib/exam-utils';
import { getExaminationById, getExaminationsWithCounts } from '@/lib/data/examinations';
import { getGradeGridData, type GradeGridData } from '@/lib/data/grades';
import type { Examination } from '@/types';
import { GradeGrid } from './_components/grade-grid';
import { ResultsFilterBar } from './_components/results-filter-bar';

export const metadata: Metadata = { title: 'Grade Entry | PrepX Admin' };

interface ResultsPageProps {
  searchParams: Promise<{ examId?: string; page?: string; search?: string }>;
}

export default async function ResultsPage({ searchParams }: ResultsPageProps): Promise<JSX.Element> {
  const params = await searchParams;
  const examId = params.examId ?? '';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const search = params.search?.trim() ?? '';
  const examinations = await getExaminationsWithCounts();
  let gradeData: GradeGridData | null = null;
  let selectedExam: Examination | null = null;

  if (examId) {
    selectedExam = await getExaminationById(examId);
    if (selectedExam) gradeData = await getGradeGridData({ examinationId: examId, page, search });
  }

  const isPublished = selectedExam?.status === 'PUBLISHED';
  const currentParams: Record<string, string> = {};
  if (examId) currentParams.examId = examId;
  if (search) currentParams.search = search;
  const summary = gradeData?.completeSummary;

  return (
    <div className="max-w-full space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Grade Entry</h2>
          <p className="mt-1 text-sm text-gray-500">
            {selectedExam ? `${selectedExam.name} ${selectedExam.year}` : 'Select an examination to enter grades.'}
          </p>
        </div>
        {selectedExam && (
          <Badge variant={getExamStatusBadgeVariant(selectedExam.status)}>
            {isPublished && <Lock aria-hidden="true" className="mr-1 h-3 w-3" />}
            {getExamStatusLabel(selectedExam.status)}
          </Badge>
        )}
      </div>

      <ResultsFilterBar
        examinations={examinations.map(({ id, name, year }) => ({ id, name, year }))}
        selectedExamId={examId}
        initialSearch={search}
      />

      {summary && gradeData && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Complete</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{summary.complete}</p>
            <p className="mt-0.5 text-xs text-gray-400">all required grades entered</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Incomplete</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{summary.incomplete}</p>
            <p className="mt-0.5 text-xs text-gray-400">missing some required grades</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">No Grades</p>
            <p className="mt-1 text-2xl font-bold text-gray-400">{summary.empty}</p>
            <p className="mt-0.5 text-xs text-gray-400">grades not yet entered</p>
          </div>
        </div>
      )}

      {!examId && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-16 text-center">
          <PenLine aria-hidden="true" className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-400">Select an examination above to begin entering grades.</p>
        </div>
      )}
      {examId && !selectedExam && <Alert variant="error">Examination not found.</Alert>}
      {selectedExam && gradeData && (
        <GradeGrid
          data={gradeData}
          examinationId={examId}
          isPublished={isPublished}
          currentParams={currentParams}
        />
      )}
    </div>
  );
}
