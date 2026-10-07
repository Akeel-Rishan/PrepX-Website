'use client';

import { AlertCircle } from 'lucide-react';
import { PublicStatusPage } from '@/components/public/public-status-page';
import { Button } from '@/components/ui/button';

export interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ApplicationError({ reset, admin = false }: ErrorBoundaryProps & {
  admin?: boolean;
}): React.JSX.Element {
  return (
    <>
      <title>Something went wrong | PrepX</title>
      <meta name="robots" content="noindex, nofollow, noarchive" />
      <PublicStatusPage
        icon={AlertCircle}
        label="Request unavailable"
        title="Something went wrong"
        description="We could not complete this request right now. Please try again or return to the home page."
        primaryHref={admin ? '/admin' : undefined}
        primaryLabel={admin ? 'Return to admin' : undefined}
        secondaryLabel="Return home"
      >
        <Button size="lg" onClick={reset}>Try again</Button>
      </PublicStatusPage>
    </>
  );
}
