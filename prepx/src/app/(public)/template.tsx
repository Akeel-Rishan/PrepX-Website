import type { ReactNode } from 'react';

export default function PublicTemplate({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="app-page-transition flex flex-1 flex-col">{children}</div>;
}
