'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { saveExaminationAction } from '@/lib/actions/examinations';
import type { Examination } from '@/types';
import { ArchiveButton } from './archive-button';

interface ExaminationFormProps {
  mode: 'create' | 'edit';
  examination?: Examination | null;
}

export function ExaminationForm({
  mode,
  examination,
}: ExaminationFormProps): React.JSX.Element {
  const [state, formAction, isPending] = useActionState(saveExaminationAction, {});
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setShowSuccess(Boolean(state.success));
    if (!state.success) return;
    const timer = setTimeout(() => setShowSuccess(false), 5000);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <form action={formAction} noValidate className="space-y-5">
      {mode === 'edit' && examination && (
        <input type="hidden" name="id" value={examination.id} />
      )}
      {showSuccess && state.success && (
        <Alert variant="success" onClose={() => setShowSuccess(false)}>
          {state.message}
        </Alert>
      )}
      {state.error && !state.fieldErrors && <Alert variant="error">{state.error}</Alert>}

      <fieldset disabled={isPending} className="min-w-0 space-y-5">
        <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>
            <p className="mt-0.5 text-xs text-gray-500">Core details about this examination.</p>
          </div>
          <hr className="border-gray-100" />
          <Input
            id="name"
            name="name"
            label="Examination Name"
            placeholder="e.g. PrepX O/L Model Examination"
            defaultValue={examination?.name ?? ''}
            error={state.fieldErrors?.name?.[0]}
            maxLength={200}
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="year"
              name="year"
              type="number"
              label="Year"
              placeholder="e.g. 2028"
              defaultValue={examination?.year ?? ''}
              min={2000}
              max={2100}
              error={state.fieldErrors?.year?.[0]}
              required
            />
            <Input
              id="organization_name"
              name="organization_name"
              label="Organization Name"
              placeholder="e.g. PrepX Institute"
              defaultValue={examination?.organization_name ?? 'PrepX'}
              error={state.fieldErrors?.organization_name?.[0]}
              maxLength={200}
              required
            />
          </div>
        </section>

        <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Result Notice</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Optional message displayed to students when they view their result.
            </p>
          </div>
          <hr className="border-gray-100" />
          <Textarea
            id="result_notice"
            name="result_notice"
            label="Notice (Optional)"
            placeholder="e.g. Results are subject to revision. Contact your school for official documentation."
            defaultValue={examination?.result_notice ?? ''}
            rows={4}
            maxLength={1000}
            error={state.fieldErrors?.result_notice?.[0]}
            hint="Shown below the student's result. Maximum 1000 characters."
          />
        </section>
      </fieldset>

      <div className="flex flex-col justify-between gap-4 pt-2 sm:flex-row sm:items-start">
        <div>
          {mode === 'edit' && examination && (
            <ArchiveButton examinationId={examination.id} currentStatus={examination.status} />
          )}
        </div>
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/admin/examinations"
            aria-disabled={isPending}
            className={`inline-flex h-8 items-center justify-center rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${isPending ? 'pointer-events-none opacity-50' : ''}`}
          >
            Cancel
          </Link>
          <Button variant="primary" size="sm" type="submit" loading={isPending}>
            {isPending
              ? mode === 'create'
                ? 'Creating...'
                : 'Saving...'
              : mode === 'create'
                ? 'Create Examination'
                : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
}
