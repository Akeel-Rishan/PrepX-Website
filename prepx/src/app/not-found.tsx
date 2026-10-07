import type { Metadata } from 'next';
import { SearchX } from 'lucide-react';
import { PublicStatusPage } from '@/components/public/public-status-page';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false, noarchive: true },
};

export default function GlobalNotFoundPage(): React.JSX.Element {
  return (
    <main className="public-portal-background">
      <PublicStatusPage icon={SearchX} label="404" title="Page not found"
        description="The page you are looking for does not exist or may have been moved."
        primaryHref="/#result-search-heading" primaryLabel="Search results"
        secondaryLabel="Return home" />
    </main>
  );
}
