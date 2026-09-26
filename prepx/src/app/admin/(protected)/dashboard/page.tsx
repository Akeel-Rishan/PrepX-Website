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
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-200/70 sm:px-8 sm:py-9 dark:shadow-slate-950/50">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-28 right-1/3 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-300">
              <Activity aria-hidden="true" className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                Administration workspace
              </p>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {selectedYear} examination overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Monitor examination activity, student records, and publication readiness for the
              selected reporting year.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200">
                {stats.totalExaminations} examination{stats.totalExaminations === 1 ? '' : 's'}
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200">
                {stats.totalStudents} registered student{stats.totalStudents === 1 ? '' : 's'}
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200">
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
          subtitle={`${stats.draftExaminations} draft · ${stats.readyExaminations} ready`}
          icon={ClipboardList}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-900/30"
          accentColor="bg-blue-500"
          href="/admin/examinations"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          subtitle={`registered for ${selectedYear}`}
          icon={Users}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-900/30"
          accentColor="bg-emerald-500"
          href="/admin/students"
        />
        <StatCard
          title="Published"
          value={stats.publishedExaminations}
          subtitle="results live for students"
          icon={Globe}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-50 dark:bg-green-900/30"
          accentColor="bg-green-500"
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
          accentColor="bg-amber-500"
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
