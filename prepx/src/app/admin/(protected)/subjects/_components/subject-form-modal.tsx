'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { saveSubjectAction } from '@/lib/actions/subjects';
import type { SubjectFormState } from '@/lib/validations/subject';
import type { Subject } from '@/types';
import { cn } from '@/lib/utils';

interface SubjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'add' | 'edit';
  subject?: Subject | null;
  examinationId: string;
}

function Fields({
  state,
  mode,
  subject,
  onClose,
  onPendingChange,
}: {
  state: SubjectFormState;
  mode: 'add' | 'edit';
  subject?: Subject | null;
  onClose: () => void;
  onPendingChange: (pending: boolean) => void;
}): JSX.Element {
  const { pending } = useFormStatus();
  const [required, setRequired] = useState(subject?.required ?? true);
  useEffect(() => onPendingChange(pending), [pending, onPendingChange]);
  return (
    <>
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <input type="hidden" name="required" value={String(required)} />
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        <Input
          id="subject_name"
          name="subject_name"
          label="Subject Name"
          placeholder="e.g. Tamil, Mathematics, Science"
          defaultValue={subject?.subject_name ?? ''}
          error={state.fieldErrors?.subject_name?.[0]}
          required
          autoFocus
        />
        <Input
          id="subject_code"
          name="subject_code"
          label="Subject Code (Optional)"
          placeholder="e.g. TML, ENG, MAT"
          defaultValue={subject?.subject_code ?? ''}
          error={state.fieldErrors?.subject_code?.[0]}
          hint="Short code shown on result cards. Max 10 characters."
        />
        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <p id="required-label" className="text-sm font-medium text-gray-900">
              Required Subject
            </p>
            <p id="required-hint" className="mt-0.5 text-xs text-gray-500">
              Required subjects determine the overall PASSED / NOT PASSED status.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-labelledby="required-label"
            aria-describedby="required-hint"
            aria-checked={required}
            onClick={() => setRequired((value) => !value)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              required ? 'bg-blue-600' : 'bg-gray-300'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                required ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>
        {state.fieldErrors?.required && (
          <p className="text-sm text-red-600">Choose whether this subject is required.</p>
        )}
        {state.fieldErrors?.examination_id && (
          <p className="text-sm text-red-600">{state.fieldErrors.examination_id[0]}</p>
        )}
      </fieldset>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" type="submit" loading={pending}>
          {pending ? 'Saving...' : mode === 'add' ? 'Add Subject' : 'Save Changes'}
        </Button>
      </div>
    </>
  );
}

export function SubjectFormModal({
  isOpen,
  onClose,
  onSuccess,
  mode,
  subject,
  examinationId,
}: SubjectFormModalProps): JSX.Element {
  const [state, formAction] = useFormState(saveSubjectAction, {});
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (state.success) {
      onSuccess();
      onClose();
    }
  }, [state.success, onSuccess, onClose]);
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!pending) onClose();
      }}
      title={mode === 'add' ? 'Add Subject' : 'Edit Subject'}
      size="md"
    >
      <form action={formAction} noValidate className="space-y-4">
        <input type="hidden" name="examination_id" value={examinationId} />
        {mode === 'edit' && subject && <input type="hidden" name="id" value={subject.id} />}
        <Fields
          state={state}
          mode={mode}
          subject={subject}
          onClose={onClose}
          onPendingChange={setPending}
        />
      </form>
    </Modal>
  );
}
