import { cn } from '@/lib/utils';
import type { ReviewSummary } from '@/lib/data/review';

/** Shows overall required-grade completion for the selected examination. */
export function CompletionProgress({ summary }: { summary: ReviewSummary }): JSX.Element {
  const width = Math.max(summary.completionPercent, summary.total > 0 ? 1 : 0);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-gray-900">Completion Progress</p><p className="text-sm font-bold text-gray-700">{summary.completionPercent}%</p></div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.completionPercent}>
        <div className={cn('h-3 rounded-full transition-all duration-500', summary.completionPercent === 100 ? 'bg-green-500' : summary.completionPercent >= 50 ? 'bg-blue-500' : 'bg-amber-400')} style={{ width: `${width}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /><span className="text-gray-600"><strong className="text-green-700">{summary.complete}</strong> complete</span></span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="text-gray-600"><strong className="text-amber-700">{summary.incomplete}</strong> incomplete</span></span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gray-300" /><span className="text-gray-600"><strong className="text-gray-600">{summary.empty}</strong> no grades</span></span>
        <span className="ml-auto text-gray-500">{summary.complete} of {summary.total} students</span>
      </div>
    </div>
  );
}
