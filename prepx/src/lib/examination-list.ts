import { EXAM_STATUSES, type ExamStatus } from '@/lib/constants';
import type { ExaminationWithCount } from '@/lib/data/examinations';

export const EXAM_SORT_COLUMNS = ['name', 'year', 'status', 'students', 'created'] as const;
export type ExamSortColumn = (typeof EXAM_SORT_COLUMNS)[number];
export type SortDirection = 'asc' | 'desc';

export function normalizeExamStatus(value: unknown): ExamStatus | null {
  if (typeof value !== 'string') return null;
  return EXAM_STATUSES.find((status) => status === value.toUpperCase()) ?? null;
}

export function normalizeExamSort(value: unknown): ExamSortColumn {
  return EXAM_SORT_COLUMNS.find((column) => column === value) ?? 'year';
}

export function sortExaminations(
  examinations: ExaminationWithCount[],
  column: ExamSortColumn,
  direction: SortDirection
): ExaminationWithCount[] {
  return [...examinations].sort((a, b) => {
    let comparison = 0;
    switch (column) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'year':
        comparison = a.year - b.year;
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'students':
        comparison = a.studentCount - b.studentCount;
        break;
      case 'created':
        comparison = Date.parse(a.created_at) - Date.parse(b.created_at);
        break;
    }
    return (
      comparison * (direction === 'asc' ? 1 : -1) ||
      Date.parse(b.created_at) - Date.parse(a.created_at) ||
      a.id.localeCompare(b.id)
    );
  });
}

export function getExaminationListHref(
  status: string | null,
  sort?: ExamSortColumn,
  direction?: SortDirection
): string {
  const params = new URLSearchParams();
  const validStatus = normalizeExamStatus(status);
  if (validStatus) params.set('status', validStatus);
  if (sort) params.set('sort', sort);
  if (direction) params.set('direction', direction);
  return `/admin/examinations${params.size ? `?${params.toString()}` : ''}`;
}
