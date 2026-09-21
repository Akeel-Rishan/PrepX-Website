import { clsx, type ClassValue } from 'clsx';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function maskNIC(nic: string): string {
  const normalizedNic = nic.trim();

  if (normalizedNic.length <= 4) {
    return normalizedNic;
  }

  return `${'*'.repeat(normalizedNic.length - 4)}${normalizedNic.slice(-4)}`;
}

export function normalizeIndexNumber(index: string): string {
  return index.trim().toUpperCase();
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'd MMMM yyyy');
}
