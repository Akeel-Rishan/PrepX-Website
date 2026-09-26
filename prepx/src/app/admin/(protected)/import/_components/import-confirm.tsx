'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Info,
  PenLine,
  ShieldAlert,
  Upload,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  runImportAction,
  type ImportRow,
  type ImportStats,
} from '@/lib/actions/import';
import type { ImportPreviewResult } from '@/types/import';

interface ImportSubjectReference {
  id: string;
  subject_name: string;
}

interface ImportConfirmProps {
  result: ImportPreviewResult;
  examinationId: string;
  examName: string;
  subjects: ImportSubjectReference[];
  onBack: () => void;
  onComplete: () => void;
  onImportAnother: () => void;
}

type ConfirmState = 'idle' | 'importing' | 'success' | 'error';

/** Confirms and runs the atomic database import, then presents its outcome. */
export function ImportConfirm({
  result,
  examinationId,
  examName,
  subjects,
  onBack,
  onComplete,
  onImportAnother,
}: ImportConfirmProps): React.JSX.Element {
  const router = useRouter();
  const submissionStarted = useRef(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>('idle');
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [rollbackConfirmed, setRollbackConfirmed] = useState(true);
  const subjectIdByName = useMemo(
    () => new Map(subjects.map((subject) => [subject.subject_name, subject.id])),
    [subjects]
  );
  const validRows = useMemo<ImportRow[]>(
    () =>
      result.rows
        .filter((row) => row.isValid)
        .map((row) => {
          const grades: Record<string, string> = {};
          for (const [subjectName, grade] of Object.entries(row.grades)) {
            const subjectId = subjectIdByName.get(subjectName);
            if (subjectId) grades[subjectId] = grade;
          }
          return {
            index_number: row.index_number,
            nic_number: row.nic_number || null,
            full_name: row.full_name,
            school_name: row.school_name,
            examination_center: row.examination_center || null,
            grades,
          };
        }),
    [result.rows, subjectIdByName]
  );
  const estimatedGrades = useMemo(
    () =>
      validRows.reduce(
        (total, row) => total + Object.values(row.grades).filter(Boolean).length,
        0
      ),
    [validRows]
  );

  async function handleConfirmImport(): Promise<void> {
    if (submissionStarted.current || validRows.length === 0) return;
    submissionStarted.current = true;
    setConfirmState('importing');
    setImportError(null);
    setRollbackConfirmed(true);
    try {
      const response = await runImportAction({ examinationId, rows: validRows });
      if (response.success && response.stats) {
        setImportStats(response.stats);
        setConfirmState('success');
        onComplete();
        return;
      }
      setImportError(response.error ?? 'An unexpected error occurred. No data was changed.');
      setConfirmState('error');
    } catch {
      setRollbackConfirmed(false);
      setImportError(
        'The connection ended before PrepX received the result. Refresh the student list to confirm the outcome before trying again.'
      );
      setConfirmState('error');
    } finally {
      submissionStarted.current = false;
    }
  }

  if (confirmState === 'success') {
    return (
      <section aria-live="polite" className="rounded-xl border border-green-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 aria-hidden="true" className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Import Complete</h3>
          <p className="mt-1 text-sm text-gray-500">
            Data has been written to <strong className="text-gray-700">{examName}</strong>.
          </p>
          <div className="my-7 grid w-full max-w-sm grid-cols-2 gap-3">
            <div className="rounded-xl bg-green-50 p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{importStats?.rowsProcessed ?? 0}</p>
              <p className="mt-1 text-xs text-green-700">rows processed</p>
            </div>
            <div className="rounded-xl bg-green-50 p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{importStats?.gradesWritten ?? 0}</p>
              <p className="mt-1 text-xs text-green-700">grades written</p>
            </div>
          </div>
          <p className="mb-4 text-xs text-gray-500">What would you like to do next?</p>
          <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Button onClick={() => router.push(`/admin/review?examId=${encodeURIComponent(examinationId)}`)}>
              <ClipboardCheck aria-hidden="true" className="h-4 w-4" /> Review Completion
            </Button>
            <Button variant="outline" onClick={() => router.push(`/admin/results?examId=${encodeURIComponent(examinationId)}`)}>
              <PenLine aria-hidden="true" className="h-4 w-4" /> Grade Grid
            </Button>
            <Button variant="secondary" onClick={onImportAnother}>
              <Upload aria-hidden="true" className="h-4 w-4" /> Import Another
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (confirmState === 'error') {
    return (
      <section aria-live="assertive" className="rounded-xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle aria-hidden="true" className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Import Failed</h3>
          <p className="mt-1 text-sm text-gray-500">
            {rollbackConfirmed ? (
              <>
                The database rejected the import. <strong className="text-gray-700">No data was changed.</strong>
              </>
            ) : (
              'PrepX could not confirm whether the request reached the database.'
            )}
          </p>
          <div className="my-6 w-full rounded-lg border border-red-200 bg-red-50 p-4 text-left">
            <p className="text-sm text-red-700">{importError}</p>
          </div>
          <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to Preview
            </Button>
            <Button
              onClick={() => {
                setConfirmState('idle');
                setImportError(null);
                setRollbackConfirmed(true);
              }}
            >
              Try Again
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Step 3 of 4</p>
        <h3 className="mt-1 text-lg font-semibold text-gray-900">Ready to Import</h3>
        <p className="mt-1 text-sm text-gray-600">
          {validRows.length} valid row{validRows.length === 1 ? '' : 's'} will be imported into{' '}
          <strong>{examName}</strong>.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{validRows.length}</p>
            <p className="mt-1 text-xs text-blue-700">students to write</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">~{estimatedGrades}</p>
            <p className="mt-1 text-xs text-blue-700">grades estimated</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{result.detectedSubjects.length}</p>
            <p className="mt-1 text-xs text-blue-700">subjects detected</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Existing students will be updated, not duplicated</p>
            <p className="mt-1 text-xs text-amber-800">
              Matching index numbers update the student’s details. Non-empty imported grades overwrite matching grades; subjects and blank grades not supplied remain unchanged.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
          <p className="text-xs text-gray-600">
            Students, grades, and the audit record are written in one database transaction. If any part fails, <strong>no data is changed</strong>. A completed import cannot be undone from this screen.
          </p>
        </div>
        {result.errorRows > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
            <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
            <p className="text-xs text-orange-800">
              <strong>{result.errorRows} row{result.errorRows === 1 ? '' : 's'} with errors</strong> will be skipped. Fix and import them separately if needed.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" onClick={onBack} disabled={confirmState === 'importing'}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to Preview
        </Button>
        <Button
          size="lg"
          onClick={handleConfirmImport}
          loading={confirmState === 'importing'}
          disabled={validRows.length === 0}
        >
          {confirmState !== 'importing' && <Check aria-hidden="true" className="h-4 w-4" />}
          {confirmState === 'importing'
            ? 'Importing…'
            : `Confirm & Import ${validRows.length} row${validRows.length === 1 ? '' : 's'}`}
        </Button>
      </div>
    </section>
  );
}
