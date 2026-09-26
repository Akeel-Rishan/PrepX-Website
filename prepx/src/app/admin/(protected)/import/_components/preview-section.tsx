'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ImportPreviewResult } from '@/types/import';
import { PreviewTable } from './preview-table';
import { ValidationSummary } from './validation-summary';

interface PreviewSectionProps {
  result: ImportPreviewResult;
  onBack: () => void;
}

/** Displays Step 2 validation results and the future confirmation entry point. */
export function PreviewSection({ result, onBack }: PreviewSectionProps): React.JSX.Element {
  const [showConfirmationPlaceholder, setShowConfirmationPlaceholder] = useState(false);
  const confirmDisabled = result.hasBlockingErrors || result.totalRows === 0;
  const disabledReason = result.hasBlockingErrors
    ? 'Fix all errors before importing.'
    : result.totalRows === 0
      ? 'There are no data rows to import.'
      : undefined;
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Step 2 of 4</p><h3 className="mt-1 text-lg font-semibold text-gray-900">Validate & Preview</h3><p className="mt-1 text-sm text-gray-600">Review every warning and resolve blocking errors before confirmation.</p></div>
      <div className="space-y-5">
        <ValidationSummary summary={result} />
        <PreviewTable rows={result.rows} columns={result.columns} />
        {showConfirmationPlaceholder && <Alert variant="info" onClose={() => setShowConfirmationPlaceholder(false)}>Import confirmation will be available in the next step.</Alert>}
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={onBack} className="w-full sm:w-auto"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to File Selection</Button>
          <span className="w-full sm:w-auto" title={disabledReason}>
            <Button onClick={() => setShowConfirmationPlaceholder(true)} disabled={confirmDisabled} className="w-full sm:w-auto">Confirm Import <ArrowRight aria-hidden="true" className="h-4 w-4" /></Button>
          </span>
        </div>
      </div>
    </section>
  );
}
