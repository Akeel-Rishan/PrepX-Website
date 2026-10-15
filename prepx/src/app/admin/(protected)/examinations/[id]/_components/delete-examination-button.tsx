'use client';

import { useRef, useState, useTransition } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { deleteExaminationAction } from '@/lib/actions/examinations';

interface DeleteExaminationButtonProps {
  examinationId: string;
  examinationName: string;
  examinationYear: number;
}

export function DeleteExaminationButton({
  examinationId,
  examinationName,
  examinationYear,
}: DeleteExaminationButtonProps): React.JSX.Element {
  const confirmationText = `${examinationName} ${examinationYear}`;
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const isConfirmed = confirmation.trim() === confirmationText;

  function closeModal(): void {
    if (isPending) return;
    setModalOpen(false);
    setConfirmation('');
    setError(null);
  }

  function handleDelete(): void {
    if (!isConfirmed || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    startTransition(async () => {
      const result = await deleteExaminationAction(examinationId, confirmation);
      inFlight.current = false;
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 dark:border-red-900/70 dark:text-red-400 dark:hover:bg-red-950/40"
        onClick={() => setModalOpen(true)}
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
        Delete
      </Button>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Delete examination permanently?"
        description="Verify this irreversible action before any data is removed."
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            handleDelete();
          }}
        >
          {error && <Alert variant="error">{error}</Alert>}

          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
            />
            <div className="space-y-1 text-sm leading-6">
              <p className="font-semibold">This cannot be undone.</p>
              <p className="text-red-800 dark:text-red-200">
                The examination and all associated students, subjects, and grades will be
                permanently deleted. The audit record will remain.
              </p>
            </div>
          </div>

          <label className="block" htmlFor="delete-examination-confirmation">
            <span className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              Type <strong>{confirmationText}</strong> to confirm
            </span>
            <input
              id="delete-examination-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={isPending}
              autoComplete="off"
              spellCheck={false}
              autoFocus
              className="mt-2 h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-hidden transition-[border-color,box-shadow] placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              placeholder={confirmationText}
            />
            <span className="mt-1.5 block text-xs text-gray-500 dark:text-slate-400">
              The text must match exactly. The Delete Permanently button stays disabled until it
              does.
            </span>
          </label>

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={closeModal} disabled={isPending}>
              Keep Examination
            </Button>
            <Button
              type="submit"
              variant="destructive"
              loading={isPending}
              disabled={!isConfirmed}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Delete Permanently
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
