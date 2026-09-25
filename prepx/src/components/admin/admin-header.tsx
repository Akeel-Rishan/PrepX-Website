'use client';

import { usePathname } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
}: AdminHeaderProps): JSX.Element {
  const pageTitle = getAdminPageTitle(usePathname());
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center">
        <button
          type="button"
          onClick={onMenuClick}
          aria-expanded={drawerOpen}
          aria-controls={drawerOpen ? 'admin-mobile-drawer' : undefined}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </button>
        <h1 className="ml-3 truncate text-lg font-semibold text-gray-900 lg:ml-0">
          <span className="lg:hidden">
            PrepX<span className="sr-only"> — {pageTitle}</span>
          </span>
          <span className="hidden lg:inline">{pageTitle}</span>
        </h1>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <span
          title={userEmail}
          className="hidden max-w-[200px] truncate text-sm text-gray-500 sm:block"
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
