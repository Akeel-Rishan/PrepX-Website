'use client';

import { ArrowLeft, ArrowRight, Check, FileSpreadsheet, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ImportPreviewResult } from '@/types/import';
import { PreviewTable } from './preview-table';
import { ValidationSummary } from './validation-summary';

interface PreviewSectionProps {
  result: ImportPreviewResult;
  fileName: string;
  examName: string;
  onBack: () => void;
  onProceed: (result: ImportPreviewResult) => void;
}

const BASE_FIELDS = [
  { key: 'index_number', label: 'Index number', required: true },
  { key: 'full_name', label: 'Full name', required: true },
  { key: 'school_name', label: 'School name', required: true },
  { key: 'nic_number', label: 'NIC number', required: false },
  { key: 'examination_center', label: 'Examination center', required: false },
] as const;

/** Displays Step 2 validation results and hands valid rows to the confirmation step. */
export function PreviewSection({
  result,
  fileName,
  examName,
  onBack,
  onProceed,
}: PreviewSectionProps): React.JSX.Element {
  const disabledReason = result.missingRequiredColumns.length
    ? 'Fix missing required columns before importing.'
    : result.validRows === 0
      ? 'No valid rows are available to import.'
      : undefined;

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Step 2 of 4</p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">Validate &amp; Preview</h3>
            <p className="mt-1 text-sm text-gray-600">
              Review every parsed row. Invalid rows are never passed to confirmation.
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 sm:max-w-sm">
            <FileSpreadsheet aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-600" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900" title={fileName}>{fileName}</p>
              <p className="truncate text-xs text-gray-500" title={examName}>{examName}</p>
            </div>
          </div>
        </div>
      </div>

      <ValidationSummary result={result} />

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h4 className="text-sm font-semibold text-gray-900">Detected columns</h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {BASE_FIELDS.map((field) => {
            const found = result.detectedBaseColumns.includes(field.key);
            return (
              <span
                key={field.key}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                  found
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : field.required
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                )}
              >
                {found ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Minus aria-hidden="true" className="h-3.5 w-3.5" />}
                {field.label}
                {!field.required && <span className="font-normal">(optional)</span>}
              </span>
            );
          })}
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subjects found</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.detectedSubjects.length ? result.detectedSubjects.map((subject) => (
              <span key={subject} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
                {subject}
              </span>
            )) : <span className="text-xs text-gray-500">No subject columns detected.</span>}
          </div>
          {result.subjectsNotFound.length > 0 && (
            <p className="mt-3 text-xs text-gray-600">
              Not in file: <span className="font-medium text-gray-800">{result.subjectsNotFound.join(', ')}</span>
            </p>
          )}
        </div>
      </div>

      <PreviewTable rows={result.rows} columns={result.columns} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" onClick={onBack} className="w-full sm:w-auto">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to Upload
        </Button>
        <div className="flex flex-col items-end gap-1.5">
          {disabledReason && <p className="text-xs text-red-600">{disabledReason}</p>}
          <Button
            disabled={!result.canImport}
            onClick={() => onProceed(result)}
            className="w-full sm:w-auto"
          >
            Proceed to Import
            <span className="rounded bg-blue-500 px-1.5 py-0.5 text-xs">
              {result.validRows} rows
            </span>
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
