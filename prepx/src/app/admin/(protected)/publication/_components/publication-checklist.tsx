import { AlertTriangle, CheckCircle2, EyeOff, Globe, RefreshCw, XCircle } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getExamStatusBadgeVariant, getExamStatusLabel } from '@/lib/exam-utils';
import { cn, formatDateTime } from '@/lib/utils';
import type { PublicationValidationResult } from '@/lib/data/publication';

interface PublicationChecklistProps {
  result: PublicationValidationResult;
  examinationId: string;
}

const statCards = (
  result: PublicationValidationResult
): Array<{ label: string; value: number; classes: string }> => [
  {
    label: 'Total Students',
    value: result.stats.totalStudents,
    classes:
      'border-gray-200 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white',
  },
  {
    label: 'Complete',
    value: result.stats.completeStudents,
    classes:
      'border-green-200 bg-green-50 text-green-700 dark:border-green-800/60 dark:bg-green-950/40 dark:text-green-300',
  },
  {
    label: 'Incomplete',
    value: result.stats.incompleteStudents,
    classes:
      result.stats.incompleteStudents > 0
        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300'
        : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500',
  },
  {
    label: 'No Grades',
    value: result.stats.emptyStudents,
    classes:
      result.stats.emptyStudents > 0
        ? 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/60 dark:bg-orange-950/40 dark:text-orange-300'
        : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500',
  },
];

/** Server-rendered publication readiness summary for one examination. */
export function PublicationChecklist({
  result,
  examinationId,
}: PublicationChecklistProps): React.JSX.Element {
  const { examination, stats } = result;
  const published = examination.status === 'PUBLISHED';
  const archived = examination.status === 'ARCHIVED';

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Current status
          </p>
          <p className="mt-1 text-base font-bold text-gray-900 dark:text-white">
            {examination.name} {examination.year}
          </p>
        </div>
        <Badge variant={getExamStatusBadgeVariant(examination.status)}>
          {getExamStatusLabel(examination.status)}
        </Badge>
      </section>

      {published && (
        <section className="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-800/60 dark:bg-green-950/40">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">
              Results are live. Students can search their grades now.
            </p>
          </div>
          <p className="mt-2 pl-8 text-xs text-green-700 dark:text-green-300">
            {examination.publication_date
              ? `Published: ${formatDateTime(examination.publication_date)}`
              : 'Publication date not recorded.'}
          </p>
        </section>
      )}

      {archived && (
        <Alert variant="warning" title="Archived examination">
          This examination cannot be published. Restore it to Draft from the Examinations page
          first.
        </Alert>
      )}

      {result.blockingErrors.length > 0 && !archived && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800/60 dark:bg-red-950/40">
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                Cannot publish. {result.blockingErrors.length} issue
                {result.blockingErrors.length === 1 ? '' : 's'} must be resolved first
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-red-700 dark:text-red-300">
                {result.blockingErrors.map((error) => (
                  <li key={error} className="flex items-start gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/60">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Pre-Publication Checklist
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Blocking checks must pass before results can be published.
          </p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {result.checks.map((check) => (
            <div
              key={check.id}
              className={cn(
                'flex items-start gap-4 px-5 py-4',
                !check.passed && check.blocking && 'bg-red-50/40 dark:bg-red-950/20',
                !check.passed && !check.blocking && 'bg-amber-50/40 dark:bg-amber-950/20'
              )}
            >
              {check.passed ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
              ) : check.blocking ? (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      check.passed
                        ? 'text-gray-900 dark:text-slate-100'
                        : check.blocking
                          ? 'text-red-800 dark:text-red-200'
                          : 'text-amber-800 dark:text-amber-200'
                    )}
                  >
                    {check.label}
                  </p>
                  {!check.passed && (
                    <Badge variant={check.blocking ? 'danger' : 'warning'}>
                      {check.blocking ? 'Blocking' : 'Warning'}
                    </Badge>
                  )}
                </div>
                <p
                  className={cn(
                    'mt-1 text-xs',
                    check.passed
                      ? 'text-gray-500 dark:text-slate-400'
                      : check.blocking
                        ? 'text-red-600 dark:text-red-300'
                        : 'text-amber-700 dark:text-amber-300'
                  )}
                >
                  {check.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="publication-statistics-heading">
        <h2
          id="publication-statistics-heading"
          className="mb-3 text-sm font-semibold text-gray-900 dark:text-white"
        >
          Student Statistics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards(result).map((stat) => (
            <div key={stat.label} className={cn('rounded-xl border p-4', stat.classes)}>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="mt-1 text-xs opacity-75">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Subject Configuration
        </h2>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-600 dark:text-slate-300">
          <p>
            <strong className="text-gray-900 dark:text-white">{stats.totalSubjects}</strong> total
          </p>
          <p>
            <strong className="text-green-700 dark:text-green-300">{stats.activeSubjects}</strong>{' '}
            active
          </p>
          <p>
            <strong className="text-amber-700 dark:text-amber-300">{stats.requiredSubjects}</strong>{' '}
            required
          </p>
        </div>
      </section>

      {result.warnings.length > 0 && (
        <Alert variant="warning" title="Publication allowed with warnings">
          <ul className="space-y-1">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs opacity-85">
            These warnings do not block publication. Affected students will still receive their
            available grades.
          </p>
        </Alert>
      )}

      {!archived && (
        <section className="flex flex-col justify-between gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
              {published
                ? 'Results are currently published.'
                : result.canPublish
                  ? 'Validation passed. Ready to publish.'
                  : 'Resolve the blocking issues above before publishing.'}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Publish and unpublish controls are completed in Step 9.2.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action="/admin/publication" method="get">
              <input type="hidden" name="examId" value={examinationId} />
              <Button type="submit" variant="outline">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </form>
            {published ? (
              <Button variant="outline" className="text-red-600 dark:text-red-300">
                <EyeOff className="h-4 w-4" />
                Unpublish Results
              </Button>
            ) : (
              <Button disabled={!result.canPublish}>
                <Globe className="h-4 w-4" />
                Publish Results
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
