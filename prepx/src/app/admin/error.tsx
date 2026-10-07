'use client';

import { ApplicationError, type ErrorBoundaryProps } from '@/components/application-error';

// /admin rechecks the session and admin profile, or redirects to login.
export default function AdminError(props: ErrorBoundaryProps): React.JSX.Element {
  return <ApplicationError {...props} admin />;
}
