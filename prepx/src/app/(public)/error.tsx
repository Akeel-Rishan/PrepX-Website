'use client';

import { ApplicationError, type ErrorBoundaryProps } from '@/components/application-error';

export default function PublicError(props: ErrorBoundaryProps): React.JSX.Element {
  return <ApplicationError {...props} />;
}
