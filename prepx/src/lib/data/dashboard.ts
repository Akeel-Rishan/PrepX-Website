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

export async function getDashboardData(): Promise<{
  stats: DashboardStats;
  recentExaminations: RecentExamination[];
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
    return { stats: emptyStats, recentExaminations: [] };
  }

  const [examsResult, studentsResult, recentResult] = await Promise.all([
    safeQuery<{ status: ExamStatus }[]>('Examination statistics', () =>
      supabase.from('examinations').select('status')
    ),
    safeQuery<unknown>('Student count', () =>
      supabase.from('students').select('*', { count: 'exact', head: true })
    ),
    safeQuery<RecentExamination[]>('Recent examinations', () =>
      supabase
        .from('examinations')
        .select('id, name, year, organization_name, status, publication_date, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
    ),
  ]);

  const allExams = examsResult.data ?? [];
  return {
    stats: {
      totalExaminations: allExams.length,
      totalStudents: studentsResult.count ?? 0,
      draftExaminations: allExams.filter((exam) => exam.status === 'DRAFT').length,
      readyExaminations: allExams.filter((exam) => exam.status === 'READY').length,
      publishedExaminations: allExams.filter((exam) => exam.status === 'PUBLISHED').length,
      archivedExaminations: allExams.filter((exam) => exam.status === 'ARCHIVED').length,
    },
    recentExaminations: recentResult.data ?? [],
  };
}
