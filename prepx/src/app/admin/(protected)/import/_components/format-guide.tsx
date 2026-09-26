import { Info } from 'lucide-react';

import { GRADE_LABELS, GRADES, type Grade } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface ImportGuideSubject {
  id: string;
  subject_name: string;
  subject_code: string | null;
  required: boolean;
}

interface FormatGuideProps {
  subjects: ImportGuideSubject[];
}

const GRADE_STYLES: Record<Grade, string> = {
  A: 'border-green-200 bg-green-50 text-green-700',
  B: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  C: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  S: 'border-blue-200 bg-blue-50 text-blue-700',
  W: 'border-red-200 bg-red-50 text-red-700',
  AB: 'border-gray-300 bg-gray-100 text-gray-700',
};

const REQUIRED_COLUMNS = ['index_number', 'full_name', 'school_name'];
const OPTIONAL_COLUMNS = ['nic_number', 'examination_center'];

/** Documents the exact columns accepted by the current parser. */
export function FormatGuide({ subjects }: FormatGuideProps): React.JSX.Element {
  const shownSubjects = subjects.slice(0, 4);
  const headers = [
    'index_number',
    'nic_number',
    'full_name',
    'school_name',
    'examination_center',
    ...shownSubjects.map((subject) => subject.subject_name),
  ];
  const example = [
    'OL2026001',
    '200312345678',
    'Student Name',
    'School Name',
    '',
    ...shownSubjects.map((_, index) => GRADES[index % GRADES.length]),
  ];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Info aria-hidden="true" className="h-4 w-4 text-blue-500" />
        Format Guide
      </h3>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Required columns (exact header names)
          </p>
          <div className="flex flex-wrap gap-2">
            {REQUIRED_COLUMNS.map((column) => (
              <span
                className="rounded border border-blue-200 bg-blue-50 px-2 py-1 font-mono text-xs text-blue-700"
                key={column}
              >
                {column}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Optional columns
          </p>
          <div className="flex flex-wrap gap-2">
            {OPTIONAL_COLUMNS.map((column) => (
              <span
                className="rounded border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-xs text-gray-600"
                key={column}
              >
                {column}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Subject columns (use the subject name or code)
          </p>
          {subjects.length ? (
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <span
                  className={cn(
                    'rounded border px-2 py-1 font-mono text-xs',
                    subject.required
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                  )}
                  key={subject.id}
                  title={subject.subject_code ? `Subject code: ${subject.subject_code}` : undefined}
                >
                  {subject.subject_code ?? subject.subject_name}
                  {subject.required ? ' *' : ''}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-700">
              This examination has no active subjects. Add subjects before importing results.
            </p>
          )}
          {subjects.length ? (
            <p className="mt-1.5 text-xs text-gray-500">
              * Required subject. The full subject name is also accepted when a code is shown.
            </p>
          ) : null}
        </div>
      </div>

      <hr className="my-4 border-gray-100" />

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Valid grade values
        </p>
        <div className="flex flex-wrap gap-2">
          {GRADES.map((grade) => (
            <span
              className={cn(
                'rounded border px-2 py-1 font-mono text-xs font-semibold',
                GRADE_STYLES[grade]
              )}
              key={grade}
            >
              {grade}{' '}
              <span className="font-sans font-normal text-gray-500">
                {GRADE_LABELS[grade]}
              </span>
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          Grade values are case-insensitive. Empty required-subject cells are reported as
          incomplete; optional-subject cells may be left blank.
        </p>
      </div>

      {subjects.length ? (
        <>
          <hr className="my-4 border-gray-100" />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Example row
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    {headers.map((header) => (
                      <th
                        className="whitespace-nowrap border border-gray-200 px-2 py-1.5 text-left font-mono font-semibold text-gray-600"
                        key={header}
                      >
                        {header}
                      </th>
                    ))}
                    {subjects.length > shownSubjects.length ? (
                      <th className="border border-gray-200 px-2 py-1.5 text-gray-400">...</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {example.map((value, index) => (
                      <td
                        className="whitespace-nowrap border border-gray-200 px-2 py-1.5 text-gray-700"
                        key={`${value}-${index}`}
                      >
                        {value}
                      </td>
                    ))}
                    {subjects.length > shownSubjects.length ? (
                      <td className="border border-gray-200 px-2 py-1.5 text-gray-400">...</td>
                    ) : null}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
