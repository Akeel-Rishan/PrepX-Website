import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
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

interface DashboardExamination {
  id: string;
  year: number;
  status: ExamStatus;
}

interface QueryResult<T> {
  data: T | null;
  count?: number | null;
  error: { code?: string } | null;
  status?: number;
}

async function safeQuery<T>(
  label: string,
  query: () => PromiseLike<QueryResult<T>>
): Promise<{ data: T | null; count: number | null }> {
  try {
    const result = await query();
    if (!result.error && (result.status === undefined || result.status < 400)) {
      return { data: result.data, count: result.count ?? null };
    }
    // Log the operation and code, never query payloads or student identifiers.
    console.error(`[dashboard] ${label} failed`, {
      code: result.error?.code ?? result.status ?? 'unknown',
    });
  } catch {
    console.error(`[dashboard] ${label} failed unexpectedly`);
  }
  return { data: null, count: null };
}

async function loadAllExaminations(
  supabase: ReturnType<typeof createAdminClient>
): Promise<DashboardExamination[]> {
  const examinations: DashboardExamination[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('examinations')
      .select('id, year, status')
      .order('id')
      .range(from, from + 999);
    if (error) throw new Error(`examination-query:${error.code}`);
    examinations.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return examinations;
}

async function loadStudentCount(
  supabase: ReturnType<typeof createAdminClient>,
  examinationIds: string[]
): Promise<number> {
  let count = 0;
  for (let start = 0; start < examinationIds.length; start += 100) {
    const { count: batchCount, error } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .in('examination_id', examinationIds.slice(start, start + 100));
    if (error) throw new Error(`student-query:${error.code}`);
    count += batchCount ?? 0;
  }
  return count;
}

function requestedYearOrNull(value?: string | number): number | null {
  const year = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null;
}

export async function getDashboardData(requestedYear?: string | number): Promise<{
  stats: DashboardStats;
  recentExaminations: RecentExamination[];
  availableYears: number[];
  selectedYear: number;
}> {
  noStore();
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
  const examinationIds = selectedExaminations.map((exam) => exam.id);

  const [studentsResult, recentResult] = await Promise.all([
    loadStudentCount(supabase, examinationIds).catch((error) => {
      console.error('[dashboard] Student count failed', {
        code: error instanceof Error ? error.message.split(':', 2)[1] ?? 'unknown' : 'unknown',
      });
      return 0;
    }),
    safeQuery<RecentExamination[]>('Recent examinations', () =>
      supabase
        .from('examinations')
        .select('id, name, year, organization_name, status, publication_date, created_at')
        .eq('year', selectedYear)
        .order('created_at', { ascending: false })
        .limit(5)
    ),
  ]);

  const statuses = selectedExaminations.map((exam) => exam.status);
  return {
    stats: {
      totalExaminations: selectedExaminations.length,
      totalStudents: studentsResult,
      draftExaminations: statuses.filter((status) => status === 'DRAFT').length,
      readyExaminations: statuses.filter((status) => status === 'READY').length,
      publishedExaminations: statuses.filter((status) => status === 'PUBLISHED').length,
      archivedExaminations: statuses.filter((status) => status === 'ARCHIVED').length,
    },
    recentExaminations: recentResult.data ?? [],
    availableYears,
    selectedYear,
  };
}
