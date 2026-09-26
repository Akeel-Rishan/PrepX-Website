import Link from 'next/link';

export interface ImportExamination {
  id: string;
  name: string;
  year: number;
  status: 'DRAFT' | 'READY';
}

interface ExaminationSelectorProps {
  examinations: ImportExamination[];
  selectedId: string;
  onChange: (id: string) => void;
  hiddenExaminationCount: number;
}

/** Selects an examination that is still open for result imports. */
export function ExaminationSelector({
  examinations,
  selectedId,
  onChange,
  hiddenExaminationCount,
}: ExaminationSelectorProps): React.JSX.Element {
  if (examinations.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        No Draft or Ready examinations are available.{' '}
        <Link href="/admin/examinations" className="font-semibold underline underline-offset-2">
          Create or update an examination
        </Link>{' '}
        before importing.
      </div>
    );
  }
  return (
    <div>
      <label
        htmlFor="import-examination"
        className="mb-1.5 block text-sm font-medium text-gray-800"
      >
        Examination
      </label>
      <select
        id="import-examination"
        value={selectedId}
        onChange={(event) => onChange(event.target.value)}
        className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select an examination...</option>
        {examinations.map((exam) => (
          <option key={exam.id} value={exam.id}>
            {exam.name} {exam.year} ({exam.status})
          </option>
        ))}
      </select>
      {hiddenExaminationCount > 0 && (
        <p
          className="mt-1.5 text-xs text-gray-600"
          title="Published and archived examinations are locked to protect released results."
        >
          {hiddenExaminationCount} published or archived examination
          {hiddenExaminationCount === 1 ? ' is' : 's are'} hidden because result imports are locked.
        </p>
      )}
    </div>
  );
}
