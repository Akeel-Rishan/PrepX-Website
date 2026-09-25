import type { Metadata } from 'next';
import { getExaminationsWithCounts } from '@/lib/data/examinations';
import { getIncompleteReviewData, type IncompleteReviewData } from '@/lib/data/review';
import { ReviewClient } from './review-client';

export const metadata: Metadata = { title: 'Review Incomplete | PrepX Admin' };

interface ReviewPageProps {
  searchParams: Promise<{ examId?: string }>;
}

export default async function ReviewPage({ searchParams }: ReviewPageProps): Promise<JSX.Element> {
  const params = await searchParams;
  const examinations = await getExaminationsWithCounts();
  const selectedExam = examinations.find((exam) => exam.id === params.examId) ?? examinations[0] ?? null;
  let reviewData: IncompleteReviewData | null = null;
  let loadError = false;
  if (selectedExam) {
    try {
      reviewData = await getIncompleteReviewData(selectedExam.id);
    } catch {
      loadError = true;
      console.error('[Review Page Error] Review data could not be loaded');
    }
  }

  return (
    <div className="max-w-full space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Review Incomplete Records</h2>
        <p className="mt-1 text-sm text-gray-600">Find and resolve missing required grades before publication.</p>
      </div>
      <ReviewClient
        examinations={examinations.map(({ id, name, year, status }) => ({ id, name, year, status }))}
        selectedExam={selectedExam ? { id: selectedExam.id, name: selectedExam.name, year: selectedExam.year, status: selectedExam.status } : null}
        initialData={reviewData}
        loadError={loadError}
      />
    </div>
  );
}
