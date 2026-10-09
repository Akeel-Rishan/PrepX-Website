import type { Metadata } from 'next';
import { ResultDisplay } from './_components/result-display';

export const metadata: Metadata = {
  title: 'Result Display',
  robots: { index: false, follow: false },
};

export default function ResultsPage(): React.JSX.Element {
  return (
    <div className="flex flex-1 items-center px-4 py-10 sm:px-6 lg:py-14">
      <ResultDisplay />
    </div>
  );
}
