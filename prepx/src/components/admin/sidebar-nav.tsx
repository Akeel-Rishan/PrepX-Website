'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { LoaderCircle } from 'lucide-react';
import { NAV_GROUPS, isNavItemActive } from '@/lib/nav';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  onNavClick?: () => void;
}

export function SidebarNav({ onNavClick }: SidebarNavProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string>();
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
                  onClick={(event) => {
                    // Preserve native new-tab and modified-click behavior.
                    if (
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    event.preventDefault();
                    setPendingHref(item.href);
                    onNavClick?.();
                    startTransition(() => router.push(item.href));
                  }}
                  aria-busy={isPending && pendingHref === item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <span aria-hidden="true">
                    {isPending && pendingHref === item.href ? (
                      <LoaderCircle className="h-4 w-4 flex-shrink-0 motion-safe:animate-spin" />
                    ) : (
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                    )}
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
