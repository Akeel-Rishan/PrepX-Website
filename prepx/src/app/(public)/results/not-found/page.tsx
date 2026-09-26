import { FileQuestion } from 'lucide-react';
import { PublicStatusPage } from '@/components/public/public-status-page';

export default function ResultNotFoundPage(): React.JSX.Element {
  return (
    <PublicStatusPage
      icon={FileQuestion}
      label="No matching record"
      title="We could not find that result"
      description="Check the index number or NIC and try the search again."
      primaryHref="/results"
      primaryLabel="Try another search"
    />
  );
}
