'use client';

import { useState, useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logoutAction } from '@/lib/actions/auth';

export function LogoutButton(): JSX.Element {
  const [isPending, startTransition] = useTransition();
  // React 18 does not keep a transition pending across an awaited action.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const loading = isPending || isSubmitting;

  function handleLogout(): void {
    setIsSubmitting(true);
    setError(undefined);
    startTransition(() => {
      void logoutAction()
        .catch(() => setError('Unable to log out. Please try again.'))
        .finally(() => setIsSubmitting(false));
    });
  }

  return (
    <div>
      <Button variant="ghost" size="sm" loading={loading} onClick={handleLogout}>
        <LogOut aria-hidden="true" className="h-4 w-4" />
        {loading ? 'Logging out...' : 'Log Out'}
      </Button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
