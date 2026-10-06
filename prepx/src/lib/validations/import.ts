import { z } from 'zod';
import '@/lib/security/zod';

import { plainTextSchema, indexSchema, optionalNicSchema } from '@/lib/security/input';
import { gradeSchema } from '@/lib/validations/grade';

const importText = (min = 0) => plainTextSchema(200, min)
  .refine((value) => !/^[=+@-]/.test(value), 'Spreadsheet formulas are not accepted.');

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
  index_number: indexSchema,
  nic_number: optionalNicSchema.optional(),
  full_name: importText(1),
  school_name: importText(1),
  examination_center: importText().optional(),
});

export type ImportRowSchema = z.infer<typeof importRowSchema>;

/** Validates a grade value from an import row */
export function isValidGrade(value: string): boolean {
  return gradeSchema.safeParse(value).success;
}
