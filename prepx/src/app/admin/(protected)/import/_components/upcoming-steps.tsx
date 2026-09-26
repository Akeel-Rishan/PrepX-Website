import { CheckCircle2, CircleEllipsis, Database } from 'lucide-react';

const UPCOMING = [
  { title: 'Preview & Validate', description: 'Review parsed rows and resolve validation issues.', icon: CircleEllipsis },
  { title: 'Confirm & Import', description: 'Confirm validated changes before writing to the database.', icon: Database },
  { title: 'Done', description: 'See the import result and audit summary.', icon: CheckCircle2 },
];

/** Shows the future workflow stages that become available in Steps 8.2 and 8.3. */
export function UpcomingSteps(): React.JSX.Element {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {UPCOMING.map(({ title, description, icon: Icon }, index) => (
        <section key={title} className="pointer-events-none rounded-xl border border-gray-200 bg-gray-50 p-4 opacity-60">
          <div className="flex items-center gap-2 text-gray-600"><Icon aria-hidden="true" className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-wide">Step {index + 2}</p></div>
          <h3 className="mt-2 text-sm font-semibold text-gray-800">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-gray-600">{description}</p>
          <p className="mt-3 text-[11px] font-medium text-gray-500">Complete Step 1 first</p>
        </section>
      ))}
    </div>
  );
}
