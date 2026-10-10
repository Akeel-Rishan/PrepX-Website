import type { ReactNode } from 'react';

export default function AdminTemplate({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="app-page-transition">{children}</div>;
}
