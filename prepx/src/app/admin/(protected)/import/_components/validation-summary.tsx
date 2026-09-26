import { AlertCircle, CheckCircle2, CircleAlert, Rows3 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import type { ImportValidationSummary } from '@/types/import';

interface ValidationSummaryProps {
  summary: ImportValidationSummary;
}

const CARDS = [
  { key: 'totalRows', label: 'Total Rows', classes: 'border-gray-200 bg-white text-gray-900', icon: Rows3 },
  { key: 'validRows', label: 'Valid Rows', classes: 'border-green-200 bg-green-50 text-green-800', icon: CheckCircle2 },
  { key: 'errorRows', label: 'Rows with Errors', classes: 'border-red-200 bg-red-50 text-red-800', icon: AlertCircle },
  { key: 'warningRows', label: 'Rows with Warnings', classes: 'border-amber-200 bg-amber-50 text-amber-900', icon: CircleAlert },
] as const;

/** Displays validation counts and whether the import may proceed. */
export function ValidationSummary({ summary }: ValidationSummaryProps): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {CARDS.map(({ key, label, classes, icon: Icon }) => (
          <div key={key} className={`rounded-xl border p-3 ${classes}`}>
            <div className="flex items-center gap-1.5"><Icon aria-hidden="true" className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-wide">{label}</p></div>
            <p className="mt-1 text-2xl font-bold">{summary[key]}</p>
          </div>
        ))}
      </div>
      {summary.hasBlockingErrors ? (
        <Alert variant="error">Import cannot proceed. Fix all errors before importing.</Alert>
      ) : summary.warningRows > 0 ? (
        <Alert variant="warning">Import can proceed, but review the warnings below.</Alert>
      ) : (
        <Alert variant="success">All rows are valid. You can confirm the import.</Alert>
      )}
    </div>
  );
}
