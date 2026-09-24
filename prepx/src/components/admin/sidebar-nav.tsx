'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_GROUPS, isNavItemActive } from '@/lib/nav';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  onNavClick?: () => void;
}

export function SidebarNav({ onNavClick }: SidebarNavProps): JSX.Element {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin navigation">
      {NAV_GROUPS.map((group) => (
        <div key={group.groupLabel} className="mt-6 first:mt-2">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            {group.groupLabel}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = isNavItemActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavClick}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <span aria-hidden="true">
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
