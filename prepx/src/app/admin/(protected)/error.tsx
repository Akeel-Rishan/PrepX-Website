'use client';

import { ApplicationError, type ErrorBoundaryProps } from '@/components/application-error';

export default function ProtectedAdminError(props: ErrorBoundaryProps): React.JSX.Element {
  return <ApplicationError {...props} admin />;
}
