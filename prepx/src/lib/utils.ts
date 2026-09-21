import { clsx, type ClassValue } from 'clsx';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes without conflicts */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Mask a NIC number: show only the last 4 characters.
 * Handles both old (9+V/X) and new (12-digit) formats.
 * Returns null if the input is null/undefined/empty.
 */
export function maskNIC(nic: string | null | undefined): string | null {
  if (!nic || nic.trim() === '') return null;
  const trimmed = nic.trim();
  if (trimmed.length <= 4) return trimmed;
  const visible = trimmed.slice(-4);
  const masked = '*'.repeat(trimmed.length - 4);
  return masked + visible;
}

/** Normalize an index number: trim whitespace and uppercase. */
export function normalizeIndexNumber(index: string): string {
  return index.trim().toUpperCase();
}

/** Format a date for human-readable display. */
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'd MMMM yyyy');
}

/** Format a datetime with time. */
export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'd MMM yyyy, h:mm a');
}

/** Truncate a string to a maximum length, adding "..." if truncated. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/** Convert a snake_case string to Title Case. */
export function snakeToTitle(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
