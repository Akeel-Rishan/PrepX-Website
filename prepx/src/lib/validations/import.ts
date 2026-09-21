import { z } from 'zod';

import { GRADES } from '@/lib/constants';

const nicRegex = /^([0-9]{9}[VvXx]|[0-9]{12})$/;

/** Reserved column names that are NOT subject columns */
export const RESERVED_COLUMNS = [
  'index_number',
  'nic_number',
  'full_name',
  'school_name',
  'examination_center',
] as const;

/** Schema for one row parsed from Excel/CSV */
export const importRowSchema = z.object({
  index_number: z.string().trim().toUpperCase().min(1, 'Index number is required.'),
  nic_number: z.string().trim().toUpperCase().regex(nicRegex, 'Invalid NIC format.').optional(),
  full_name: z.string().trim().min(1, 'Student name is required.'),
  school_name: z.string().trim().min(1, 'School name is required.'),
  examination_center: z.string().trim().optional(),
});

export type ImportRowSchema = z.infer<typeof importRowSchema>;

/** Validates a grade value from an import row */
export function isValidGrade(value: string): boolean {
  return (GRADES as readonly string[]).includes(value.toUpperCase());
}
