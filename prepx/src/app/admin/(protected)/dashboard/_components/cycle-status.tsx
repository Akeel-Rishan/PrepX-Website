import { Archive, CheckCircle2, CircleDashed, Send } from 'lucide-react';
import type { DashboardStats } from '@/lib/data/dashboard';
import { cn } from '@/lib/utils';

interface CycleStatusProps {
  stats: DashboardStats;
  year: number;
}

const STATUS_META = [
  {
    key: 'draftExaminations',
    label: 'Draft',
    icon: CircleDashed,
    color: 'bg-slate-400',
    text: 'text-slate-700 dark:text-slate-300',
  },
  {
    key: 'readyExaminations',
    label: 'Ready',
    icon: CheckCircle2,
    color: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
  },
  {
    key: 'publishedExaminations',
    label: 'Published',
    icon: Send,
    color: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  {
    key: 'archivedExaminations',
    label: 'Archived',
    icon: Archive,
    color: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
  },
] as const;

/** Visual breakdown of examination workflow states for the selected year. */
export function CycleStatus({ stats, year }: CycleStatusProps): React.JSX.Element {
  const total = stats.totalExaminations;

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[var(--app-shadow)] dark:border-slate-800 dark:bg-slate-900">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Workflow</p>
        <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
          {year} cycle status
        </h2>
      </div>
      <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {STATUS_META.map((item) => {
          const count = stats[item.key];
          return count > 0 ? (
            <div
              key={item.key}
              className={item.color}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${item.label}: ${count}`}
            />
          ) : null;
        })}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {STATUS_META.map(({ key, label, icon: Icon, color, text }) => (
          <div key={key} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <div className="flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', color)} />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {label}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className={cn('text-xl font-bold', text)}>{stats[key]}</span>
              <Icon aria-hidden="true" className={cn('h-4 w-4', text)} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
