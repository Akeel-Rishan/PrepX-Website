import { z } from 'zod';
import '@/lib/security/zod';
import { plainTextSchema } from '@/lib/security/input';

export const examinationSchema = z.object({
  name: plainTextSchema(200, 2),
  year: z.coerce
    .number({ error: 'Year must be a number.' })
    .int('Year must be a whole number.')
    .min(2000, 'Year must be 2000 or later.')
    .max(2100, 'Year must be 2100 or earlier.'),
  organization_name: plainTextSchema(200, 2),
  result_notice: plainTextSchema(1000, 0, true)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
});

export type ExaminationSchema = z.infer<typeof examinationSchema>;

export interface ExaminationFormState {
  error?: string;
  fieldErrors?: Partial<
    Record<'name' | 'year' | 'organization_name' | 'result_notice', string[]>
  >;
  success?: boolean;
  message?: string;
}
