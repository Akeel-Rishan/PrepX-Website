import type { ComponentType } from 'react';
import Link from 'next/link';
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
    <div className="h-full rounded-xl border border-gray-200 bg-white p-5 transition-shadow duration-200 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 break-words text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div aria-hidden="true" className={cn('shrink-0 rounded-xl p-3', iconBg)}>
          <Icon className={cn('h-6 w-6', iconColor)} />
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link
      href={href}
      className="block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  ) : (
    card
  );
}
