import { LayoutDashboard } from 'lucide-react';

export default function DashboardPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-gray-500">Overview of your examination system.</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-12 text-center">
        <LayoutDashboard aria-hidden="true" className="mb-3 h-12 w-12 text-gray-300" />
        <p className="text-sm text-gray-400">Dashboard stats coming in the next step.</p>
      </div>
    </div>
  );
}
