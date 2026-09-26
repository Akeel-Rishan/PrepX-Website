import { Clock3 } from 'lucide-react';
import { PublicStatusPage } from '@/components/public/public-status-page';

export default function ResultsNotPublishedPage(): React.JSX.Element {
  return (
    <PublicStatusPage
      icon={Clock3}
      label="Publication pending"
      title="These results are not available yet"
      description="The examination administrator has not published this result set. Please check again later."
      primaryHref="/results"
      primaryLabel="Return to lookup"
    />
  );
}
