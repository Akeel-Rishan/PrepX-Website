import type { ComponentType } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  href?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  href,
}: StatCardProps): React.JSX.Element {
  const card = (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[var(--app-shadow)] transition-[border-color,box-shadow,transform] duration-150 group-active:scale-[0.99] hover:border-slate-300 hover:shadow-lg hover:shadow-blue-950/[0.06] sm:p-6 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div aria-hidden="true" className={cn('shrink-0 rounded-xl p-3', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        {href && (
          <ArrowUpRight
            aria-hidden="true"
            className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-400"
          />
        )}
      </div>
      <div className="mt-5 min-w-0">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <p className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          {value}
        </p>
        {subtitle && (
          <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
    </div>
  );

  return href ? (
    <Link
      href={href}
      className="block min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
    >
      {card}
    </Link>
  ) : (
    card
  );
}
