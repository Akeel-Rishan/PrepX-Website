import type { ExamStatus } from '@/lib/constants';

type ExamBadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const STATUS_VARIANTS: Record<ExamStatus, ExamBadgeVariant> = {
  DRAFT: 'neutral',
  READY: 'info',
  PUBLISHED: 'success',
  ARCHIVED: 'default',
};

const STATUS_LABELS: Record<ExamStatus, string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export function getExamStatusBadgeVariant(status: ExamStatus): ExamBadgeVariant {
  return STATUS_VARIANTS[status];
}

export function getExamStatusLabel(status: ExamStatus): string {
  return STATUS_LABELS[status];
}

export const EXAM_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'READY', label: 'Ready' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
] as const;
