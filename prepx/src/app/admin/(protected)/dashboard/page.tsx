import type { Metadata } from 'next';
import { Activity, ClipboardList, Clock, Globe, Users } from 'lucide-react';
import { getDashboardData } from '@/lib/data/dashboard';
import { StatCard } from '@/components/admin/stat-card';
import { CycleStatus } from './_components/cycle-status';
import { RecentExamsTable } from './_components/recent-exams-table';
import { QuickActions } from './_components/quick-actions';
import { YearSelector } from './_components/year-selector';

export const metadata: Metadata = { title: 'Dashboard | PrepX Admin' };
export const dynamic = 'force-dynamic';

interface DashboardPageProps {
  searchParams: Promise<{ year?: string | string[] }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const requestedYear = Array.isArray(params.year) ? params.year[0] : params.year;
  const { stats, recentExaminations, availableYears, selectedYear } =
    await getDashboardData(requestedYear);
  const pendingExaminations = stats.draftExaminations + stats.readyExaminations;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b172a] px-6 py-7 text-white shadow-[var(--app-shadow)] sm:px-8 sm:py-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-300">
              <Activity aria-hidden="true" className="h-4 w-4" />
              <p className="text-sm font-medium">Year overview</p>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {selectedYear} examination overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Monitor examination activity, student records, and publication readiness for the
              selected reporting year.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-200">
                {stats.totalExaminations} examination{stats.totalExaminations === 1 ? '' : 's'}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-200">
                {stats.totalStudents} registered student{stats.totalStudents === 1 ? '' : 's'}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-200">
                {pendingExaminations} awaiting action
              </span>
            </div>
          </div>
          <YearSelector years={availableYears} selectedYear={selectedYear} />
        </div>
      </section>

      <section
        aria-label="Dashboard metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          title="Total Examinations"
          value={stats.totalExaminations}
          subtitle={`${stats.draftExaminations} draft, ${stats.readyExaminations} ready`}
          icon={ClipboardList}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-900/30"
          href="/admin/examinations"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          subtitle={`registered for ${selectedYear}`}
          icon={Users}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-900/30"
          href="/admin/students"
        />
        <StatCard
          title="Published"
          value={stats.publishedExaminations}
          subtitle="results live for students"
          icon={Globe}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-50 dark:bg-green-900/30"
          href="/admin/publication"
        />
        <StatCard
          title="Pending Action"
          value={pendingExaminations}
          subtitle={
            pendingExaminations > 0
              ? `${stats.readyExaminations} ready to publish`
              : 'no exams awaiting publication'
          }
          icon={Clock}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-900/30"
          href="/admin/review"
        />
      </section>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RecentExamsTable examinations={recentExaminations} year={selectedYear} />
        </div>
        <div className="min-w-0 space-y-6">
          <CycleStatus stats={stats} year={selectedYear} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
