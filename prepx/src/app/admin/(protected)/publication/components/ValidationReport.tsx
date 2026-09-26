'use client';

import { useMemo } from 'react';
import { AlertTriangle, Ban, CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import { ReadinessScoreCard } from './ReadinessScoreCard';
import { PublicationActionBar } from './PublicationActionBar';
import { StudentIssueTable } from './StudentIssueTable';
import { SubjectCoverageTable } from './SubjectCoverageTable';
import { ValidationSection } from './ValidationSection';
import type { ValidationCheck, PublicationValidationResult } from '@/lib/publication-validator';

interface ValidationReportProps {
  result: PublicationValidationResult;
  onPublish: () => void;
  onUnpublish: () => void;
  isActioning: boolean;
}

/** Complete pre-publication report and Step 9.2 action placeholders. */
export function ValidationReport({
  result,
  onPublish,
  onUnpublish,
  isActioning,
}: ValidationReportProps): React.JSX.Element {
  const groupedChecks = useMemo(() => {
    const groups = new Map<string, ValidationCheck[]>();
    for (const item of result.checks)
      groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
    return Array.from(groups);
  }, [result.checks]);
  const distribution = [
    {
      label: 'Passed',
      value: result.statusDistribution.passed,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Not passed',
      value: result.statusDistribution.notPassed,
      icon: XCircle,
      color: 'text-red-600 bg-red-50',
    },
    {
      label: 'Absent',
      value: result.statusDistribution.absent,
      icon: Ban,
      color: 'text-gray-600 bg-gray-50',
    },
    {
      label: 'Incomplete',
      value: result.statusDistribution.incomplete,
      icon: CircleDashed,
      color: 'text-amber-700 bg-amber-50',
    },
  ];

  return (
    <div className="space-y-6">
      <ReadinessScoreCard result={result} />
      {result.totalStudents > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Result status preview</h2>
              <p className="mt-1 text-sm text-gray-500">
                How student results will be classified when published.
              </p>
            </div>
            <p className="text-xs text-gray-400">Preview only · no records changed</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {distribution.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`rounded-xl p-3 ${color}`}>
                <div className="flex items-center gap-2">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  <p className="text-xs font-medium">{label}</p>
                </div>
                <p className="mt-2 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Incomplete means one or more required subjects have no grade. “AB” means absent and “W”
            means not passed.
          </p>
        </section>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs font-medium">
        <span className="text-red-600">✕ Blocking</span>
        <span className="text-amber-700">⚠ Warning</span>
        <span className="text-green-600">✓ Passed</span>
        <span className="text-blue-600">ℹ Info</span>
      </div>
      <div className="space-y-3">
        {groupedChecks.map(([category, checks]) => (
          <ValidationSection
            key={category}
            category={category}
            checks={checks}
            defaultOpen={checks.some((item) => item.status === 'fail' || item.status === 'warn')}
          />
        ))}
      </div>
      <SubjectCoverageTable rows={result.subjectCoverage} />
      <StudentIssueTable rows={result.studentRows} />
      <PublicationActionBar
        result={result}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
        isActioning={isActioning}
      />
    </div>
  );
}
