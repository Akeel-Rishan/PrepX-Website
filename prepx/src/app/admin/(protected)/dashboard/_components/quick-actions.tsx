import Link from 'next/link';
import { ChevronRight, PlusCircle, Send, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  {
    href: '/admin/examinations',
    icon: PlusCircle,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'Create Examination',
    subtitle: 'Start a new O/L model exam',
  },
  {
    href: '/admin/import',
    icon: Upload,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: 'Import Results',
    subtitle: 'Upload student grades from Excel',
  },
  {
    href: '/admin/publication',
    icon: Send,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: 'Publish Results',
    subtitle: 'Make results available to students',
  },
];

export function QuickActions(): JSX.Element {
  return (
    <section
      aria-labelledby="quick-actions-title"
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      <h3 id="quick-actions-title" className="mb-4 text-base font-semibold text-gray-900">
        Quick Actions
      </h3>
      <div className="space-y-1">
        {actions.map(({ href, icon: Icon, iconBg, iconColor, title, subtitle }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-4 rounded-lg border border-transparent p-3 transition-colors hover:border-gray-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className={cn('shrink-0 rounded-lg p-2.5', iconBg)}>
              <Icon aria-hidden="true" className={cn('h-5 w-5', iconColor)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 transition-colors group-hover:text-blue-600">
                {title}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
            </div>
            <ChevronRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-gray-400"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
