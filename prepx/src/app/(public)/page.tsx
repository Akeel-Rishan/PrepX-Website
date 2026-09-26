import { SearchCheck } from 'lucide-react';
import { PublicStatusPage } from '@/components/public/public-status-page';

export default function HomePage(): React.JSX.Element {
  return (
    <PublicStatusPage
      icon={SearchCheck}
      label="Examination results"
      title="Find your published results"
      description="Use the result portal to access grades released by your examination administrator."
      primaryHref="/results"
      primaryLabel="Open result lookup"
      secondaryHref="/admin/login"
      secondaryLabel="Administrator sign in"
    >
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
        Only published examination results are available to students. Keep your index number or NIC
        ready before starting.
      </div>
    </PublicStatusPage>
  );
}
