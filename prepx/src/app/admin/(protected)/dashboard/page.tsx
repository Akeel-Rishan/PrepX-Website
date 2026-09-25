import type { Metadata } from 'next';
import { ClipboardList, Clock, Globe, Users } from 'lucide-react';
import { getDashboardData } from '@/lib/data/dashboard';
import { StatCard } from '@/components/admin/stat-card';
import { RecentExamsTable } from './_components/recent-exams-table';
import { QuickActions } from './_components/quick-actions';

export const metadata: Metadata = { title: 'Dashboard | PrepX Admin' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage(): Promise<JSX.Element> {
  const { stats, recentExaminations } = await getDashboardData();
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">Overview of your examination system.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Examinations"
          value={stats.totalExaminations}
          subtitle={`${stats.draftExaminations} draft · ${stats.readyExaminations} ready`}
          icon={ClipboardList}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          href="/admin/examinations"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          subtitle="across all examinations"
          icon={Users}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          href="/admin/students"
        />
        <StatCard
          title="Published"
          value={stats.publishedExaminations}
          subtitle="results live for students"
          icon={Globe}
          iconColor="text-green-600"
          iconBg="bg-green-50"
          href="/admin/publication"
        />
        <StatCard
          title="Pending Action"
          value={stats.draftExaminations + stats.readyExaminations}
          subtitle={
            stats.draftExaminations + stats.readyExaminations > 0
              ? `${stats.readyExaminations} ready to publish`
              : 'no exams awaiting publication'
          }
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          href="/admin/review"
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <RecentExamsTable examinations={recentExaminations} />
        </div>
        <div className="min-w-0">
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
