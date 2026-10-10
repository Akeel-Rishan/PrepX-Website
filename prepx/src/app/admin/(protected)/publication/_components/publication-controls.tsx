'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, EyeOff, Globe, RefreshCw } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/modal';
import { LoadingProgress } from '@/components/ui/loading-primitives';
import { publishExaminationAction, unpublishExaminationAction } from '@/lib/actions/publication';
import type { ExamStatus } from '@/lib/constants';

interface PublicationControlsProps {
  examinationId: string;
  examName: string;
  currentStatus: ExamStatus;
  canPublish: boolean;
  studentCount: number;
  incompleteCount: number;
  warnings: string[];
}

/** Confirmation and mutation controls for one validated examination. */
export function PublicationControls({
  examinationId,
  examName,
  currentStatus,
  canPublish,
  studentCount,
  incompleteCount,
  warnings,
}: PublicationControlsProps): React.JSX.Element | null {
  const router = useRouter();
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [unpublishModalOpen, setUnpublishModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const published = currentStatus === 'PUBLISHED';

  if (currentStatus === 'ARCHIVED') return null;

  function handlePublish(): void {
    setError(null);
    startTransition(async () => {
      try {
        const result = await publishExaminationAction(examinationId);
        if (result.error) {
          setError(result.error);
          setPublishModalOpen(false);
          return;
        }
        setPublishModalOpen(false);
        router.refresh();
      } catch {
        setPublishModalOpen(false);
        setError('Publishing failed unexpectedly. Please try again.');
      }
    });
  }

  function handleUnpublish(): void {
    setError(null);
    startTransition(async () => {
      try {
        const result = await unpublishExaminationAction(examinationId);
        if (result.error) {
          setError(result.error);
          setUnpublishModalOpen(false);
          return;
        }
        setUnpublishModalOpen(false);
        router.refresh();
      } catch {
        setUnpublishModalOpen(false);
        setError('Unpublishing failed unexpectedly. Please try again.');
      }
    });
  }

  const publishDescription = (
    <div className="space-y-3">
      <p className="text-sm text-gray-700 dark:text-slate-300">
        Results for <strong>{examName}</strong> will become immediately visible to all{' '}
        <strong>{studentCount}</strong> registered student{studentCount === 1 ? '' : 's'}.
      </p>
      {incompleteCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-950/40">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>{incompleteCount}</strong> student{incompleteCount === 1 ? '' : 's'} with
            incomplete grades will show an incomplete result status. Publication is still allowed.
          </p>
        </div>
      )}
      {warnings.length > 0 && incompleteCount === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
          {warnings[0]}
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-slate-400">
        You can unpublish later if corrections are needed. Students cannot modify their results.
      </p>
    </div>
  );

  const unpublishDescription = (
    <div className="space-y-3">
      <p className="text-sm text-gray-700 dark:text-slate-300">
        Student results for <strong>{examName}</strong> will be hidden immediately. Students will no
        longer be able to search for their grades.
      </p>
      <p className="text-sm text-gray-700 dark:text-slate-300">
        No grade data will be deleted. You can publish again after making corrections.
      </p>
    </div>
  );

  return (
    <div className="space-y-4" aria-busy={isPending || undefined}>
      {isPending && <LoadingProgress />}
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <section className="flex flex-col justify-between gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
            {published
              ? 'Results are currently published.'
              : canPublish
                ? 'Validation passed. Ready to publish.'
                : 'Resolve the blocking issues above before publishing.'}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            {published
              ? 'Unpublishing hides student results immediately without deleting grades.'
              : canPublish
                ? 'Publishing makes these results visible to registered students.'
                : 'Run the checklist again after resolving every blocking issue.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action="/admin/publication" method="get">
            <input type="hidden" name="examId" value={examinationId} />
            <Button type="submit" variant="outline" disabled={isPending}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </form>
          {published ? (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setError(null);
                setUnpublishModalOpen(true);
              }}
              className="text-red-600 dark:text-red-300"
            >
              <EyeOff className="h-4 w-4" />
              Unpublish Results
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!canPublish || isPending}
              onClick={() => {
                setError(null);
                setPublishModalOpen(true);
              }}
            >
              <Globe className="h-4 w-4" />
              Publish Results
            </Button>
          )}
        </div>
      </section>

      <ConfirmModal
        isOpen={publishModalOpen}
        onClose={() => {
          if (!isPending) setPublishModalOpen(false);
        }}
        onConfirm={handlePublish}
        title="Publish Results for Students?"
        description={publishDescription}
        confirmLabel="Yes, Publish Now"
        cancelLabel="Not Yet"
        variant="default"
        isLoading={isPending}
      />

      <ConfirmModal
        isOpen={unpublishModalOpen}
        onClose={() => {
          if (!isPending) setUnpublishModalOpen(false);
        }}
        onConfirm={handleUnpublish}
        title="Unpublish Results?"
        description={unpublishDescription}
        confirmLabel="Unpublish"
        cancelLabel="Keep Published"
        variant="danger"
        isLoading={isPending}
      />
    </div>
  );
}
