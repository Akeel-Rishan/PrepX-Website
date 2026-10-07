'use client';

import { ApplicationError, type ErrorBoundaryProps } from '@/components/application-error';

export default function ErrorPage(props: ErrorBoundaryProps): React.JSX.Element {
  return <ApplicationError {...props} />;
}
