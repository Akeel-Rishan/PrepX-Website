'use client';

import { useCallback, useEffect, useState, useTransition, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions/auth';
import { Alert } from '@/components/ui/alert';
import { Sidebar } from './sidebar';
import { MobileDrawer } from './mobile-drawer';
import { AdminHeader } from './admin-header';

interface AdminShellProps {
  userEmail: string;
  children: ReactNode;
}

export function AdminShell({ userEmail, children }: AdminShellProps): React.JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoutError, setLogoutError] = useState<string>();
  const pathname = usePathname();
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const isLoggingOut = isPending || isSubmitting;

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const handleResize = (): void => {
      if (desktop.matches) closeDrawer();
    };
    desktop.addEventListener('change', handleResize);
    return () => desktop.removeEventListener('change', handleResize);
  }, [closeDrawer]);

  function handleLogout(): void {
    if (isLoggingOut) return;
    setLogoutError(undefined);
    setIsSubmitting(true);
    closeDrawer();
    // React 18 needs explicit state to cover the asynchronous action.
    startTransition(() => {
      void logoutAction()
        .catch(() => setLogoutError('Unable to log out. Please try again.'))
        .finally(() => setIsSubmitting(false));
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col">
        <Sidebar userEmail={userEmail} onLogout={handleLogout} isLoggingOut={isLoggingOut} />
      </div>
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        userEmail={userEmail}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />
      <div className="flex min-h-screen min-w-0 flex-col lg:pl-64">
        <AdminHeader
          userEmail={userEmail}
          onMenuClick={() => setDrawerOpen(true)}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          drawerOpen={drawerOpen}
        />
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          {logoutError && (
            <Alert variant="error" className="mb-6" onClose={() => setLogoutError(undefined)}>
              {logoutError}
            </Alert>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
