import type { Json } from '@/types/database';

export type AuditActionMeta = {
  label: string;
  badgeVariant: 'success' | 'info' | 'danger' | 'warning' | 'neutral' | 'default';
  entityType: 'examination' | 'student' | 'subject' | 'student_result' | 'system';
};

export const AUDIT_ACTION_META: Record<string, AuditActionMeta> = {
  EXAMINATION_CREATED: {
    label: 'Exam Created',
    badgeVariant: 'success',
    entityType: 'examination',
  },
  EXAMINATION_UPDATED: {
    label: 'Exam Updated',
    badgeVariant: 'info',
    entityType: 'examination',
  },
  EXAMINATION_ARCHIVED: {
    label: 'Exam Archived',
    badgeVariant: 'neutral',
    entityType: 'examination',
  },
  EXAMINATION_UNARCHIVED: {
    label: 'Exam Restored',
    badgeVariant: 'info',
    entityType: 'examination',
  },
  EXAMINATION_PUBLISHED: {
    label: 'Published',
    badgeVariant: 'success',
    entityType: 'examination',
  },
  EXAMINATION_UNPUBLISHED: {
    label: 'Unpublished',
    badgeVariant: 'warning',
    entityType: 'examination',
  },
  STUDENT_CREATED: {
    label: 'Student Created',
    badgeVariant: 'success',
    entityType: 'student',
  },
  STUDENT_UPDATED: {
    label: 'Student Updated',
    badgeVariant: 'info',
    entityType: 'student',
  },
  STUDENT_DELETED: {
    label: 'Student Deleted',
    badgeVariant: 'danger',
    entityType: 'student',
  },
  SUBJECT_CREATED: {
    label: 'Subject Created',
    badgeVariant: 'success',
    entityType: 'subject',
  },
  SUBJECT_UPDATED: {
    label: 'Subject Updated',
    badgeVariant: 'info',
    entityType: 'subject',
  },
  SUBJECT_REORDERED: {
    label: 'Subjects Reordered',
    badgeVariant: 'info',
    entityType: 'subject',
  },
  SUBJECT_DELETED: {
    label: 'Subject Deleted',
    badgeVariant: 'danger',
    entityType: 'subject',
  },
  GRADES_UPDATED: {
    label: 'Grades Updated',
    badgeVariant: 'info',
    entityType: 'examination',
  },
  RESULT_CREATED: {
    label: 'Grade Created',
    badgeVariant: 'success',
    entityType: 'student_result',
  },
  RESULT_UPDATED: {
    label: 'Grade Updated',
    badgeVariant: 'info',
    entityType: 'student_result',
  },
  IMPORT_COMPLETED: {
    label: 'Import Done',
    badgeVariant: 'info',
    entityType: 'examination',
  },
};

export const AUDIT_ACTION_GROUPS = [
  {
    group: 'Examinations',
    actions: [
      'EXAMINATION_CREATED',
      'EXAMINATION_UPDATED',
      'EXAMINATION_PUBLISHED',
      'EXAMINATION_UNPUBLISHED',
      'EXAMINATION_ARCHIVED',
      'EXAMINATION_UNARCHIVED',
    ],
  },
  {
    group: 'Students',
    actions: ['STUDENT_CREATED', 'STUDENT_UPDATED', 'STUDENT_DELETED'],
  },
  {
    group: 'Subjects',
    actions: ['SUBJECT_CREATED', 'SUBJECT_UPDATED', 'SUBJECT_REORDERED', 'SUBJECT_DELETED'],
  },
  {
    group: 'Grades and Import',
    actions: ['GRADES_UPDATED', 'RESULT_CREATED', 'RESULT_UPDATED', 'IMPORT_COMPLETED'],
  },
] as const;

export const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All Entity Types' },
  { value: 'examination', label: 'Examination' },
  { value: 'student', label: 'Student' },
  { value: 'subject', label: 'Subject' },
  { value: 'student_result', label: 'Student Result' },
] as const;

function asObject(value: Json | null): Record<string, Json | undefined> | null {
  return value !== null && !Array.isArray(value) && typeof value === 'object' ? value : null;
}

function text(value: Json | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function count(value: Json | undefined): string {
  return typeof value === 'number' || typeof value === 'string' ? String(value) : '?';
}

/** Derives a compact, human-readable description without exposing extra data. */
export function getAuditSummary(
  action: string,
  newValue: Json | null,
  oldValue: Json | null
): string {
  const next = asObject(newValue);
  const previous = asObject(oldValue);

  switch (action) {
    case 'STUDENT_CREATED':
    case 'STUDENT_UPDATED':
      return text(next?.full_name) ?? text(next?.index_number) ?? 'Not recorded';
    case 'STUDENT_DELETED':
      return text(previous?.full_name) ?? text(previous?.index_number) ?? 'Not recorded';
    case 'EXAMINATION_CREATED':
    case 'EXAMINATION_UPDATED':
      return text(next?.name) ?? 'Not recorded';
    case 'EXAMINATION_PUBLISHED':
      return `${count(next?.students)} students • ${count(next?.complete)} complete`;
    case 'EXAMINATION_UNPUBLISHED':
      return 'Results hidden from students';
    case 'EXAMINATION_ARCHIVED':
      return 'Moved to Archived';
    case 'EXAMINATION_UNARCHIVED':
      return 'Restored to Draft';
    case 'IMPORT_COMPLETED':
      return `${count(next?.rows_processed)} rows • ${count(next?.grades_written)} grades`;
    case 'GRADES_UPDATED':
      return `${count(next?.total_changes)} changes`;
    case 'RESULT_CREATED':
      return text(next?.grade) ? `Grade ${text(next?.grade)}` : 'Grade recorded';
    case 'RESULT_UPDATED': {
      const before = text(previous?.grade);
      const after = text(next?.grade);
      return before && after
        ? `Grade ${before} to ${after}`
        : after
          ? `Grade ${after}`
          : 'Grade updated';
    }
    case 'SUBJECT_CREATED':
    case 'SUBJECT_UPDATED':
      return text(next?.subject_name) ?? 'Not recorded';
    case 'SUBJECT_REORDERED':
      return `${Array.isArray(newValue) ? newValue.length : '?'} subjects reordered`;
    case 'SUBJECT_DELETED':
      return text(previous?.subject_name) ?? 'Not recorded';
    default:
      return 'No summary available';
  }
}
