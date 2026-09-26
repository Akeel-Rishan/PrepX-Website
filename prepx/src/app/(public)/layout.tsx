import type { ReactNode } from 'react';

export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>): React.JSX.Element {
  return <main className="min-h-screen bg-gray-50">{children}</main>;
}
