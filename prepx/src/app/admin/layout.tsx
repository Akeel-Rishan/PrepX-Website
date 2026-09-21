import type { ReactNode } from 'react';

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  return <>{children}</>;
}
