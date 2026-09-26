'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/modal';
import {
  archiveExaminationAction,
  unarchiveExaminationAction,
} from '@/lib/actions/examinations';
import type { ExamStatus } from '@/lib/constants';

interface ArchiveButtonProps {
  examinationId: string;
  currentStatus: ExamStatus;
}

export function ArchiveButton({
  examinationId,
  currentStatus,
}: ArchiveButtonProps): React.JSX.Element | null {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isArchived = currentStatus === 'ARCHIVED';

  if (currentStatus === 'PUBLISHED') return null;

  function handleConfirm(): void {
    setError(null);
    startTransition(async () => {
      const result = isArchived
        ? await unarchiveExaminationAction(examinationId)
        : await archiveExaminationAction(examinationId);
      if (result?.error) {
        setError(result.error);
        setModalOpen(false);
        return;
      }
      if (isArchived) {
        setModalOpen(false);
        router.refresh();
      }
    });
  }

  const Icon = isArchived ? ArchiveRestore : Archive;
  return (
    <>
      {error && (
        <Alert variant="error" className="mb-3" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setModalOpen(true)}
        disabled={isPending}
        className={isArchived ? undefined : 'border-amber-300 text-amber-700 hover:bg-amber-50'}
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
        {isArchived ? 'Restore to Draft' : 'Archive'}
      </Button>
      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        title={isArchived ? 'Restore Examination?' : 'Archive Examination?'}
        description={
          isArchived
            ? 'This will move the examination back to Draft status. You can edit and publish it again.'
            : 'This will move the examination to Archived status. Students and grades will not be deleted, and you can restore it later.'
        }
        confirmLabel={isArchived ? 'Restore' : 'Archive'}
        variant={isArchived ? 'default' : 'warning'}
        isLoading={isPending}
      />
    </>
  );
}
