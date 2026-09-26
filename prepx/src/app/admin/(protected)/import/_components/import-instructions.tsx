'use client';

import { ChevronDown, ChevronUp, TriangleAlert } from 'lucide-react';

interface ImportInstructionsProps {
  isOpen: boolean;
  onToggle: () => void;
}

/** Collapsible instructions for preparing an import workbook. */
export function ImportInstructions({
  isOpen,
  onToggle,
}: ImportInstructionsProps): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border border-blue-200 bg-blue-50/50">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="import-instructions"
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <span className="font-semibold text-gray-900">How to Import Results</span>
        <span className="flex items-center gap-1 text-sm font-medium text-blue-700">
          {isOpen ? 'Hide Instructions' : 'Show Instructions'}
          {isOpen ? (
            <ChevronUp aria-hidden="true" className="h-4 w-4" />
          ) : (
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          )}
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div id="import-instructions" aria-hidden={!isOpen} className="overflow-hidden">
          <div className="border-t border-blue-200 px-5 py-4">
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-gray-700">
              <li>Select the examination you want to import results for.</li>
              <li>Download the CSV template using the button below.</li>
              <li>
                Fill in student index numbers, names, schools, and grades. NIC numbers and
                examination centers are optional.
              </li>
              <li>Valid grades are A, B, C, S, W, and AB. Do not use other values.</li>
              <li>Save the file as .xlsx or .csv and upload it here.</li>
              <li>Review the validation preview before confirming the import.</li>
            </ol>
            <div className="mt-4 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <TriangleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                Importing will add or update student records. Existing grades for the same student
                and subject will be overwritten. This action is logged in the audit trail.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
