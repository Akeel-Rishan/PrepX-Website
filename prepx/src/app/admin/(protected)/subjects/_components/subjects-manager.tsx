'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Pencil,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { ConfirmModal } from '@/components/ui/modal';
import {
  deleteSubjectAction,
  moveSubjectAction,
  toggleSubjectActiveAction,
} from '@/lib/actions/subjects';
import { cn } from '@/lib/utils';
import type { Subject } from '@/types';
import { SubjectFormModal } from './subject-form-modal';

interface SubjectsManagerProps {
  subjects: Subject[];
  examinationId: string;
  resultCounts: Map<string, number>;
  isPublished: boolean;
}

export function SubjectsManager({
  subjects,
  examinationId,
  resultCounts,
  isPublished,
}: SubjectsManagerProps): JSX.Element {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [pending, setPending] = useState<{ id: string; action: string } | null>(null);
  const inFlight = useRef(false);
  const [form, setForm] = useState<{ mode: 'add' | 'edit'; subject?: Subject } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const busy = !!pending || refreshing;
  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);
  const closeForm = useCallback(() => setForm(null), []);

  async function runAction(id: string, action: string, fn: () => Promise<{ error?: string }>) {
    if (inFlight.current || busy || isPublished) return;
    inFlight.current = true;
    setPending({ id, action });
    setActionError(null);
    try {
      const result = await fn();
      if (result.error) setActionError(result.error);
      // Refresh even after errors: another admin or a partial reorder may have changed data.
      refresh();
    } catch {
      setActionError('Unable to complete this action. Please try again.');
      refresh();
    } finally {
      if (action === 'delete') setDeleteTarget(null);
      inFlight.current = false;
      setPending(null);
    }
  }

  const iconButton =
    'rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-30';
  return (
    <div className="space-y-4">
      {isPublished && (
        <Alert variant="info">
          This examination is published. Subjects cannot be edited. Unpublish the examination first
          to make changes.
        </Alert>
      )}
      {!isPublished && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            disabled={busy}
            onClick={() => {
              setActionError(null);
              setForm({ mode: 'add' });
            }}
          >
            <PlusCircle aria-hidden="true" className="h-4 w-4" />
            Add Subject
          </Button>
        </div>
      )}
      {actionError && (
        <Alert variant="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}
      {subjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <BookOpen aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="mb-4 text-sm text-gray-400">
            No subjects yet. Add subjects to start managing grades.
          </p>
          {!isPublished && (
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={() => setForm({ mode: 'add' })}
            >
              <PlusCircle aria-hidden="true" className="h-4 w-4" />
              Add First Subject
            </Button>
          )}
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-xl border border-gray-200 bg-white"
          aria-busy={busy}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-sm">
              <caption className="sr-only">Subjects in display order</caption>
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  {['Order', 'Subject', 'Status', 'Type', 'Actions'].map((name) => (
                    <th key={name} scope="col" className="px-4 py-3 font-semibold">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjects.map((subject, index) => (
                  <tr key={subject.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="w-16 px-4 py-3">
                      <div className="flex flex-col items-start">
                        {(['up', 'down'] as const).map((direction) => {
                          const Icon = direction === 'up' ? ChevronUp : ChevronDown;
                          return (
                            <button
                              key={direction}
                              type="button"
                              title={`Move ${direction}`}
                              aria-label={`Move ${subject.subject_name} ${direction}`}
                              disabled={
                                busy ||
                                isPublished ||
                                (direction === 'up' ? index === 0 : index === subjects.length - 1)
                              }
                              className={iconButton}
                              onClick={() =>
                                void runAction(subject.id, direction, () =>
                                  moveSubjectAction(subject.id, direction)
                                )
                              }
                            >
                              {pending?.id === subject.id && pending.action === direction ? (
                                <LoaderCircle
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5 animate-spin"
                                />
                              ) : (
                                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-gray-900">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-words">{subject.subject_name}</span>
                        {subject.subject_code && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-normal text-gray-600">
                            {subject.subject_code}
                          </span>
                        )}
                      </div>
                    </th>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-label={`${subject.subject_name} active`}
                        aria-checked={subject.active}
                        disabled={busy || isPublished}
                        title={subject.active ? 'Click to deactivate' : 'Click to activate'}
                        onClick={() =>
                          void runAction(subject.id, 'toggle', () =>
                            toggleSubjectActiveAction(subject.id)
                          )
                        }
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                          subject.active
                            ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                            : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            subject.active ? 'bg-green-500' : 'bg-gray-400'
                          )}
                        />
                        {pending?.id === subject.id && pending.action === 'toggle'
                          ? 'Updating...'
                          : subject.active
                            ? 'Active'
                            : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-1 text-xs font-medium',
                          subject.required
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
                        )}
                      >
                        {subject.required ? 'Required' : 'Optional'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${subject.subject_name}`}
                          title="Edit subject"
                          disabled={busy || isPublished}
                          className={cn(iconButton, 'hover:bg-blue-50 hover:text-blue-600')}
                          onClick={() => {
                            setActionError(null);
                            setForm({ mode: 'edit', subject });
                          }}
                        >
                          <Pencil aria-hidden="true" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${subject.subject_name}`}
                          title="Delete subject"
                          disabled={busy || isPublished}
                          className={cn(iconButton, 'hover:bg-red-50 hover:text-red-600')}
                          onClick={() => {
                            setActionError(null);
                            setDeleteTarget(subject);
                          }}
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            className="border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-xs text-gray-400"
            role="status"
          >
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} ·{' '}
            {subjects.filter((subject) => subject.active).length} active ·{' '}
            {subjects.filter((subject) => subject.required).length} required
          </p>
        </div>
      )}
      {form && !isPublished && (
        <SubjectFormModal
          key={`${examinationId}:${form.subject?.id ?? 'add'}`}
          isOpen
          mode={form.mode}
          subject={form.subject}
          examinationId={examinationId}
          onClose={closeForm}
          onSuccess={refresh}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteTarget && !isPublished}
        onClose={() => setDeleteTarget(null)}
        title="Delete Subject?"
        confirmLabel="Delete Subject"
        variant="danger"
        isLoading={busy}
        onConfirm={() => {
          if (deleteTarget)
            void runAction(deleteTarget.id, 'delete', () => deleteSubjectAction(deleteTarget.id));
        }}
        description={
          deleteTarget ? (
            <div className="space-y-2">
              <p>
                Permanently delete <strong>{deleteTarget.subject_name}</strong>? This cannot be
                undone.
              </p>
              {(resultCounts.get(deleteTarget.id) ?? 0) > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                  />
                  <p className="text-sm text-amber-800">
                    {resultCounts.get(deleteTarget.id)} grade{' '}
                    {resultCounts.get(deleteTarget.id) === 1 ? 'entry' : 'entries'} will also be
                    permanently deleted.
                  </p>
                </div>
              )}
            </div>
          ) : (
            ''
          )
        }
      />
    </div>
  );
}
