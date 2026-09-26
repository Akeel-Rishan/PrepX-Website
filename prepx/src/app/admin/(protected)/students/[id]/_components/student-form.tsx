'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { saveStudentAction } from '@/lib/actions/students';
import type { StudentWithExam } from '@/lib/data/students';
import { getExamStatusBadgeVariant, getExamStatusLabel } from '@/lib/exam-utils';
import type { StudentFormState } from '@/lib/validations/student';
import { DeleteButton } from './delete-button';

interface StudentFormProps {
  mode: 'create' | 'edit';
  student?: StudentWithExam | null;
  examinations: Array<{ id: string; name: string; year: number }>;
  resultCount?: number;
  isReadOnly?: boolean;
}

function FormFields({
  mode,
  student,
  examinations,
  resultCount = 0,
  isReadOnly = false,
  state,
}: StudentFormProps & { state: StudentFormState }): React.JSX.Element {
  const { pending } = useFormStatus();
  const [deleting, setDeleting] = useState(false);
  const busy = pending || deleting;
  return (
    <>
      {isReadOnly && (
        <Alert variant="info">
          Published and archived examinations are read-only. Student details cannot be changed.
        </Alert>
      )}
      <fieldset disabled={busy || isReadOnly} className="min-w-0 space-y-5">
        <section
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-6"
          aria-labelledby="examination-heading"
        >
          <div>
            <h3 id="examination-heading" className="text-sm font-semibold text-gray-900">
              Examination
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {mode === 'create'
                ? 'Select the examination this student is registered for.'
                : 'Examination cannot be changed after a student is created.'}
            </p>
          </div>
          <hr className="border-gray-100" />
          {mode === 'create' ? (
            <>
              <Select
                id="examination_id"
                name="examination_id"
                label="Examination"
                placeholder="Select an examination..."
                options={examinations.map((e) => ({ value: e.id, label: `${e.name} ${e.year}` }))}
                defaultValue=""
                error={state.fieldErrors?.examination_id?.[0]}
                required
              />
              {examinations.length === 0 && (
                <Alert variant="warning">
                  No examinations are available. Create an examination before registering a student.
                </Alert>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {student?.examination?.name} {student?.examination?.year}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  This student&apos;s examination cannot be changed.
                </p>
              </div>
              {student?.examination && (
                <Badge variant={getExamStatusBadgeVariant(student.examination.status)}>
                  {getExamStatusLabel(student.examination.status)}
                </Badge>
              )}
              {state.fieldErrors?.examination_id && (
                <p className="w-full text-sm text-red-600">{state.fieldErrors.examination_id[0]}</p>
              )}
            </div>
          )}
        </section>
        <section
          className="space-y-5 rounded-xl border border-gray-200 bg-white p-6"
          aria-labelledby="personal-heading"
        >
          <div>
            <h3 id="personal-heading" className="text-sm font-semibold text-gray-900">
              Personal Information
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Student identification and registration details.
            </p>
          </div>
          <hr className="border-gray-100" />
          <Input
            id="full_name"
            name="full_name"
            label="Full Name"
            placeholder="e.g. Mohamed Akeel"
            defaultValue={student?.full_name ?? ''}
            error={state.fieldErrors?.full_name?.[0]}
            required
            maxLength={200}
            autoComplete="name"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="index_number"
              name="index_number"
              label="Index Number"
              placeholder="e.g. OL2026001"
              defaultValue={student?.index_number ?? ''}
              error={state.fieldErrors?.index_number?.[0]}
              hint="Letters and numbers only. Must be unique within this examination."
              required
              maxLength={50}
              className="font-mono"
            />
            <Input
              id="nic_number"
              name="nic_number"
              label="NIC Number"
              placeholder="e.g. 200312345678"
              defaultValue={student?.nic_number ?? ''}
              error={state.fieldErrors?.nic_number?.[0]}
              hint="Optional. 9 digits + V/X, or 12 digits."
              maxLength={12}
            />
          </div>
          <Input
            id="school_name"
            name="school_name"
            label="School Name"
            placeholder="e.g. Zahira College"
            defaultValue={student?.school_name ?? ''}
            error={state.fieldErrors?.school_name?.[0]}
            required
            maxLength={200}
          />
          <Input
            id="examination_center"
            name="examination_center"
            label="Examination Center"
            placeholder="e.g. Centre A (optional)"
            defaultValue={student?.examination_center ?? ''}
            error={state.fieldErrors?.examination_center?.[0]}
            maxLength={200}
          />
        </section>
      </fieldset>
      <div className="flex flex-col justify-between gap-4 pt-2 sm:flex-row sm:items-start">
        <div>
          {mode === 'edit' && student && (
            <DeleteButton
              studentId={student.id}
              studentName={student.full_name}
              resultCount={resultCount}
              isReadOnly={isReadOnly}
              disabled={pending}
              onPendingChange={setDeleting}
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          {busy ? (
            <span
              aria-disabled="true"
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-400"
            >
              Cancel
            </span>
          ) : (
            <Link
              href="/admin/students"
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-200"
            >
              Cancel
            </Link>
          )}
          <Button
            variant="primary"
            size="sm"
            type="submit"
            loading={pending}
            disabled={isReadOnly || deleting || (mode === 'create' && examinations.length === 0)}
          >
            {pending
              ? mode === 'create'
                ? 'Creating...'
                : 'Saving...'
              : mode === 'create'
                ? 'Create Student'
                : 'Save Changes'}
          </Button>
        </div>
      </div>
    </>
  );
}

export function StudentForm(props: StudentFormProps): React.JSX.Element {
  const [state, formAction] = useActionState(saveStudentAction, {});
  const [showSuccess, setShowSuccess] = useState(false);
  useEffect(() => {
    setShowSuccess(!!state.success);
    if (!state.success) return;
    const timer = setTimeout(() => setShowSuccess(false), 5000);
    return () => clearTimeout(timer);
  }, [state]);
  return (
    <form action={formAction} noValidate className="space-y-5">
      {props.mode === 'edit' && props.student && (
        <>
          <input type="hidden" name="id" value={props.student.id} />
          <input type="hidden" name="examination_id" value={props.student.examination_id} />
        </>
      )}
      {showSuccess && state.success && (
        <Alert variant="success" onClose={() => setShowSuccess(false)}>
          {state.message}
        </Alert>
      )}
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <FormFields {...props} state={state} />
    </form>
  );
}
