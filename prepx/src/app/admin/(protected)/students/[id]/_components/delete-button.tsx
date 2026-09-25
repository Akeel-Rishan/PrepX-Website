'use client';

import { useRef, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { ConfirmModal } from '@/components/ui/modal';
import { deleteStudentAction } from '@/lib/actions/students';

interface DeleteButtonProps {
  studentId: string;
  studentName: string;
  resultCount: number;
  isPublished: boolean;
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
}

export function DeleteButton({
  studentId,
  studentName,
  resultCount,
  isPublished,
  disabled,
  onPendingChange,
}: DeleteButtonProps): JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const inFlight = useRef(false);

  async function handleConfirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsPending(true);
    onPendingChange?.(true);
    setError(null);
    try {
      const result = await deleteStudentAction(studentId);
      if (result?.error) {
        setError(result.error);
        setModalOpen(false);
      }
    } catch {
      setError('Unable to delete the student. Please try again.');
      setModalOpen(false);
    } finally {
      inFlight.current = false;
      setIsPending(false);
      onPendingChange?.(false);
    }
  }

  if (isPublished)
    return (
      <div className="flex flex-col gap-1">
        <Button variant="outline" size="sm" disabled className="border-gray-200 text-gray-400">
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          Delete Student
        </Button>
        <p className="text-xs text-gray-400">Cannot delete from a published exam.</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || isPending}
        className="border-red-200 text-red-600 hover:bg-red-50"
        onClick={() => {
          setError(null);
          setModalOpen(true);
        }}
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
        Delete Student
      </Button>
      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        title="Delete Student?"
        confirmLabel="Delete Permanently"
        cancelLabel="Keep Student"
        variant="danger"
        isLoading={isPending}
        description={
          <div className="space-y-2">
            <p>
              This will permanently delete <strong>{studentName}</strong> and cannot be undone.
            </p>
            {resultCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600"
                />
                <p className="text-sm text-amber-800">
                  {resultCount} grade {resultCount === 1 ? 'entry' : 'entries'} will also be
                  permanently deleted.
                </p>
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}
