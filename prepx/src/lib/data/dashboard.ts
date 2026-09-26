import 'server-only';

import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import type { ExamStatus } from '@/lib/constants';

export interface DashboardStats {
  totalExaminations: number;
  totalStudents: number;
  publishedExaminations: number;
  draftExaminations: number;
  readyExaminations: number;
  archivedExaminations: number;
}

export interface RecentExamination {
  id: string;
  name: string;
  year: number;
  organization_name: string;
  status: ExamStatus;
  publication_date: string | null;
  created_at: string;
}

type DashboardExamination = RecentExamination & {
  students: Array<{ count: number }>;
};

async function loadAllExaminations(
  supabase: ReturnType<typeof createAdminClient>
): Promise<DashboardExamination[]> {
  const examinations: DashboardExamination[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('examinations')
      .select(
        'id, name, year, organization_name, status, publication_date, created_at, students(count)'
      )
      .order('id')
      .range(from, from + 999);
    if (error) throw new Error(`examination-query:${error.code}`);
    examinations.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return examinations;
}

function requestedYearOrNull(value?: string | number): number | null {
  const year = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null;
}

export interface DashboardData {
  stats: DashboardStats;
  recentExaminations: RecentExamination[];
  availableYears: number[];
  selectedYear: number;
}

async function queryDashboardData(requestedYear: string): Promise<DashboardData> {
  const emptyStats: DashboardStats = {
    totalExaminations: 0,
    totalStudents: 0,
    publishedExaminations: 0,
    draftExaminations: 0,
    readyExaminations: 0,
    archivedExaminations: 0,
  };

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    console.error('[dashboard] Database client initialization failed');
    return {
      stats: emptyStats,
      recentExaminations: [],
      availableYears: [],
      selectedYear: requestedYearOrNull(requestedYear) ?? new Date().getUTCFullYear(),
    };
  }

  let allExaminations: DashboardExamination[] = [];
  try {
    allExaminations = await loadAllExaminations(supabase);
  } catch (error) {
      console.error('[dashboard] Examination statistics failed', {
        code: error instanceof Error ? error.message.split(':', 2)[1] ?? 'unknown' : 'unknown',
      });
  }
  const availableYears = Array.from(new Set(allExaminations.map((exam) => exam.year)))
    .sort((a, b) => b - a);
  const requested = requestedYearOrNull(requestedYear);
  const selectedYear = requested && availableYears.includes(requested)
    ? requested
    : availableYears[0] ?? requested ?? new Date().getUTCFullYear();
  const selectedExaminations = allExaminations.filter((exam) => exam.year === selectedYear);
  const totalStudents = selectedExaminations.reduce(
    (total, exam) => total + (exam.students[0]?.count ?? 0),
    0
  );
  const recentExaminations = selectedExaminations
    .slice()
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, 5)
    .map(({ id, name, year, organization_name, status, publication_date, created_at }) => ({
      id,
      name,
      year,
      organization_name,
      status,
      publication_date,
      created_at,
    }));

  const statuses = selectedExaminations.map((exam) => exam.status);
  return {
    stats: {
      totalExaminations: selectedExaminations.length,
      totalStudents,
      draftExaminations: statuses.filter((status) => status === 'DRAFT').length,
      readyExaminations: statuses.filter((status) => status === 'READY').length,
      publishedExaminations: statuses.filter((status) => status === 'PUBLISHED').length,
      archivedExaminations: statuses.filter((status) => status === 'ARCHIVED').length,
    },
    recentExaminations,
    availableYears,
    selectedYear,
  };
}

const readDashboardData = unstable_cache(queryDashboardData, ['dashboard-data-v2'], {
  revalidate: 30,
  tags: ['dashboard', 'examinations', 'students'],
});

export async function getDashboardData(
  requestedYear?: string | number
): Promise<DashboardData> {
  return readDashboardData(String(requestedYear ?? ''));
}
