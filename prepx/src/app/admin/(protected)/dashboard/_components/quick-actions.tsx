import Link from 'next/link';
import { ArrowUpRight, PlusCircle, Send, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  {
    href: '/admin/examinations',
    icon: PlusCircle,
    iconBg: 'bg-blue-100/70 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    title: 'Create Examination',
    subtitle: 'Start a new O/L model exam',
  },
  {
    href: '/admin/import',
    icon: Upload,
    iconBg: 'bg-emerald-100/70 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    title: 'Import Results',
    subtitle: 'Upload student grades from Excel',
  },
  {
    href: '/admin/publication',
    icon: Send,
    iconBg: 'bg-amber-100/70 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    title: 'Publish Results',
    subtitle: 'Make results available to students',
  },
];

export function QuickActions(): React.JSX.Element {
  return (
    <section
      aria-labelledby="quick-actions-title"
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900"
    >
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
          Shortcuts
        </p>
        <h2 id="quick-actions-title" className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
          Quick actions
        </h2>
      </div>
      <div className="space-y-2">
        {actions.map(({ href, icon: Icon, iconBg, iconColor, title, subtitle }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700/60 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            <div className={cn('shrink-0 rounded-lg p-2.5', iconBg)}>
              <Icon aria-hidden="true" className={cn('h-5 w-5', iconColor)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 transition-colors group-hover:text-blue-700 dark:text-slate-200 dark:group-hover:text-blue-400">
                {title}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
            <ArrowUpRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-400"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
