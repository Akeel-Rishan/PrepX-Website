import {
  AlertCircle,
  CheckCircle2,
  CircleAlert,
  Rows3,
  TableProperties,
} from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import type { ImportPreviewResult } from '@/types/import';

interface ValidationSummaryProps {
  result: ImportPreviewResult;
}

const CARDS = [
  { key: 'totalRows', label: 'Total Rows', classes: 'border-gray-200 bg-white text-gray-900', icon: Rows3 },
  { key: 'validRows', label: 'Ready Rows', classes: 'border-green-200 bg-green-50 text-green-800', icon: CheckCircle2 },
  { key: 'errorRows', label: 'Rows with Errors', classes: 'border-red-200 bg-red-50 text-red-800', icon: AlertCircle },
  { key: 'warningRows', label: 'With Warnings', classes: 'border-amber-200 bg-amber-50 text-amber-900', icon: CircleAlert },
] as const;

/** Shows validation totals and the exact reason an import can or cannot continue. */
export function ValidationSummary({ result }: ValidationSummaryProps): React.JSX.Element {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {CARDS.map(({ key, label, classes, icon: Icon }) => (
          <div key={key} className={`rounded-xl border p-3 ${classes}`}>
            <div className="flex items-center gap-1.5">
              <Icon aria-hidden="true" className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{result[key]}</p>
          </div>
        ))}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-900">
          <div className="flex items-center gap-1.5">
            <TableProperties aria-hidden="true" className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">Subjects Found</p>
          </div>
          <p className="mt-1 text-2xl font-bold">{result.detectedSubjects.length}</p>
        </div>
      </div>

      {result.missingRequiredColumns.length > 0 ? (
        <Alert variant="error" title="Required columns missing">
          Add {result.missingRequiredColumns.join(', ')} to the file before continuing.
        </Alert>
      ) : result.validRows === 0 ? (
        <Alert variant="error">No valid rows are available to import.</Alert>
      ) : result.errorRows > 0 ? (
        <Alert variant="warning">
          {result.validRows} valid row{result.validRows === 1 ? '' : 's'} can continue.{' '}
          {result.errorRows} invalid row{result.errorRows === 1 ? '' : 's'} will be excluded.
        </Alert>
      ) : result.warningRows > 0 ? (
        <Alert variant="warning">All rows can continue, but review the warnings below.</Alert>
      ) : (
        <Alert variant="success">All rows are valid and ready for confirmation.</Alert>
      )}
    </div>
  );
}
