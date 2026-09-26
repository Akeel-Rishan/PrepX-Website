import { z } from 'zod';

export const examinationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Examination name must be at least 2 characters.')
    .max(200, 'Examination name must be under 200 characters.'),
  year: z.coerce
    .number({ error: 'Year must be a number.' })
    .int('Year must be a whole number.')
    .min(2000, 'Year must be 2000 or later.')
    .max(2100, 'Year must be 2100 or earlier.'),
  organization_name: z
    .string()
    .trim()
    .min(2, 'Organization name must be at least 2 characters.')
    .max(200, 'Organization name must be under 200 characters.'),
  result_notice: z
    .string()
    .trim()
    .max(1000, 'Result notice must be under 1000 characters.')
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
