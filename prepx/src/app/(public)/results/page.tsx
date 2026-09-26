import { Construction } from 'lucide-react';
import { PublicStatusPage } from '@/components/public/public-status-page';

export default function ResultsPage(): React.JSX.Element {
  return (
    <PublicStatusPage
      icon={Construction}
      label="Result lookup"
      title="The search experience is being prepared"
      description="The public result form will be available after the remaining publication workflow is completed."
    />
  );
}
