'use client';

import { usePathname } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { getAdminPageTitle } from '@/lib/nav';

interface AdminHeaderProps {
  userEmail: string;
  onMenuClick: () => void;
  onLogout: () => void;
  isLoggingOut?: boolean;
  drawerOpen?: boolean;
}

export function AdminHeader({
  userEmail,
  onMenuClick,
  onLogout,
  isLoggingOut = false,
  drawerOpen = false,
}: AdminHeaderProps): React.JSX.Element {
  const pageTitle = getAdminPageTitle(usePathname());
  return (
    <header className="sticky top-0 z-30 flex min-h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-200/90 bg-white px-3 py-2 shadow-[0_1px_0_rgba(15,23,42,0.02)] transition-colors dark:border-slate-800 dark:bg-slate-900 min-[380px]:px-4 sm:min-h-18 sm:gap-3 sm:px-6 xl:px-8">
      <div className="flex min-w-0 items-center">
        <button
          type="button"
          onClick={onMenuClick}
          aria-expanded={drawerOpen}
          aria-controls={drawerOpen ? 'admin-mobile-drawer' : undefined}
          className="rounded-xl p-2.5 text-slate-500 transition-[background-color,color,transform] active:scale-95 hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </button>
        <h1 className="ml-2 truncate text-base font-semibold text-gray-900 min-[380px]:ml-3 sm:text-lg lg:ml-0 dark:text-slate-100">
          {pageTitle}
          <span className="sr-only"> | PrepX</span>
        </h1>
      </div>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <span
          title={userEmail}
          className="hidden max-w-[220px] truncate rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 md:block dark:bg-slate-800 dark:text-slate-300"
        >
          {userEmail}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          loading={isLoggingOut}
          className="hidden lg:flex"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
          {isLoggingOut ? 'Logging out...' : 'Log Out'}
        </Button>
      </div>
    </header>
  );
}
