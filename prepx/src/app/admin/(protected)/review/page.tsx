import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardCheck, PenLine } from 'lucide-react';

import { ExamSelectorBar } from '@/app/admin/(protected)/subjects/_components/exam-selector-bar';
import { CompletionProgress } from '@/app/admin/(protected)/review/_components/completion-progress';
import { ReviewManager } from '@/app/admin/(protected)/review/_components/review-manager';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { getExaminationById, getExaminationsWithCounts } from '@/lib/data/examinations';
import {
  getReviewData,
  type ReviewData,
  type StatusFilter,
} from '@/lib/data/review';
import { getExamStatusBadgeVariant, getExamStatusLabel } from '@/lib/exam-utils';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Review | PrepX Admin',
};

const VALID_STATUSES = new Set<StatusFilter>([
  'needs_attention',
  'incomplete',
  'empty',
  'complete',
  'all',
]);

interface ReviewPageProps {
  searchParams: Promise<{
    examId?: string;
    status?: string;
    page?: string;
    search?: string;
  }>;
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const params = await searchParams;
  const examId = params.examId ?? '';
  const search = params.search?.trim() ?? '';
  const parsedPage = Number.parseInt(params.page ?? '1', 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const status = VALID_STATUSES.has(params.status as StatusFilter)
    ? (params.status as StatusFilter)
    : 'needs_attention';

  const examinations = await getExaminationsWithCounts();
  let selectedExam = null;
  let reviewData: ReviewData | null = null;
  let loadError = false;

  if (examId) {
    selectedExam = await getExaminationById(examId);

    if (selectedExam) {
      try {
        reviewData = await getReviewData({
          examinationId: examId,
          statusFilter: status,
          search,
          page,
        });
      } catch (error) {
        console.error('Unable to load review data', error);
        loadError = true;
      }
    }
  }

  const isPublished = selectedExam?.status === 'PUBLISHED';
  const currentParams: Record<string, string> = { examId };
  if (status !== 'needs_attention') currentParams.status = status;
  if (search) currentParams.search = search;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Review results</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Check completion and resolve missing grades before publishing.
              </p>
            </div>
          </div>
        </div>

        {selectedExam ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getExamStatusBadgeVariant(selectedExam.status)}>
              {getExamStatusLabel(selectedExam.status)}
            </Badge>
            <Link
              className={cn(
                'inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              href={`/admin/grades?examId=${encodeURIComponent(selectedExam.id)}`}
            >
              <PenLine aria-hidden="true" className="h-4 w-4" />
              Grade grid
            </Link>
          </div>
        ) : null}
      </div>

      <ExamSelectorBar
        basePath="/admin/review"
        examinations={examinations}
        selectedExamId={examId}
      />

      {!examId ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <ClipboardCheck
            aria-hidden="true"
            className="mx-auto h-10 w-10 text-muted-foreground/60"
          />
          <h2 className="mt-4 font-semibold">Select an examination</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose an examination above to review its result completion.
          </p>
        </div>
      ) : !selectedExam ? (
        <Alert variant="error" title="Examination not found">
          The selected examination does not exist or is no longer available.
        </Alert>
      ) : loadError || !reviewData ? (
        <Alert variant="error" title="Could not load review data">
          Refresh the page and try again. If the problem continues, check the database connection.
        </Alert>
      ) : (
        <div className="space-y-6">
          {isPublished ? (
            <Alert variant="warning" title="Published results are read-only">
              You can review these results, but grades cannot be changed after publication.
            </Alert>
          ) : null}

          <CompletionProgress summary={reviewData.summary} />

          <ReviewManager
            currentParams={currentParams}
            data={reviewData}
            examinationId={selectedExam.id}
            initialSearch={search}
            initialStatusFilter={status}
            isPublished={isPublished}
          />
        </div>
      )}
    </div>
  );
}
