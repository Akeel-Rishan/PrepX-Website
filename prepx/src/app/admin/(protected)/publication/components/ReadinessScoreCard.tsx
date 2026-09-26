import { AlertCircle, CheckCircle2, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublicationValidationResult } from '@/lib/publication-validator';

interface ReadinessScoreCardProps {
  result: PublicationValidationResult;
}

/** Prominent summary of whether an examination can be published. */
export function ReadinessScoreCard({ result }: ReadinessScoreCardProps): React.JSX.Element {
  const published = result.examinationStatus === 'PUBLISHED';
  const theme = published
    ? 'border-blue-200 bg-blue-50 text-blue-800'
    : result.canPublish
      ? 'border-green-200 bg-green-50 text-green-800'
      : 'border-red-200 bg-red-50 text-red-800';
  const Icon = published ? Radio : result.canPublish ? CheckCircle2 : AlertCircle;
  const title = published ? 'Published' : result.canPublish ? 'Ready to Publish' : 'Issues Found';
  const message = published
    ? 'Results are live. You may unpublish them to make changes.'
    : result.canPublish
      ? `${result.warnings} warning${result.warnings === 1 ? '' : 's'}, ${result.checks.length} checks completed`
      : `${result.blockingFailures} blocking issue${result.blockingFailures === 1 ? '' : 's'} must be resolved`;
  const stats = [
    { label: 'students', value: result.totalStudents, tone: '' },
    { label: 'complete', value: result.completeStudents, tone: 'text-green-700' },
    {
      label: 'incomplete',
      value: result.incompleteStudents,
      tone: result.incompleteStudents > 0 ? 'text-red-700' : 'text-green-700',
    },
  ];

  return (
    <section className={cn('rounded-2xl border p-6 shadow-sm sm:p-8', theme)}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Icon aria-hidden="true" className="h-8 w-8 shrink-0" />
            <h2 className="text-2xl font-bold uppercase tracking-tight sm:text-3xl">{title}</h2>
          </div>
          <p className="mt-2 text-sm opacity-85">{message}</p>
        </div>
        <p className="text-xs opacity-70">Validated just now</p>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-current/10 bg-white/70 px-4 py-3 text-center"
          >
            <p className={cn('text-2xl font-bold', stat.tone)}>{stat.value}</p>
            <p className="mt-0.5 text-xs font-medium capitalize opacity-75">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
