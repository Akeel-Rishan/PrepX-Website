import { z } from 'zod';

const nicRegex = /^([0-9]{9}[VvXx]|[0-9]{12})$/;

export const studentSchema = z.object({
  examination_id: z.string().uuid('Please select a valid examination.'),
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(200, 'Full name is too long.'),
  index_number: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Index number is required.')
    .max(50, 'Index number is too long.')
    .regex(/^[A-Z0-9]+$/, 'Index number may only contain letters and numbers.'),
  nic_number: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (value) => value === '' || nicRegex.test(value),
      'NIC must be 9 digits + V/X (old) or 12 digits (new).'
    )
    .optional()
    .nullable()
    .transform((value) => value || null),
  school_name: z
    .string()
    .trim()
    .min(2, 'School name must be at least 2 characters.')
    .max(200, 'School name is too long.'),
  examination_center: z
    .string()
    .trim()
    .max(200, 'Examination center name is too long.')
    .optional()
    .nullable()
    .transform((value) => value || null),
});

export type StudentSchema = z.infer<typeof studentSchema>;

export interface StudentFormState {
  error?: string;
  fieldErrors?: Partial<Record<keyof StudentSchema, string[]>>;
  success?: boolean;
  message?: string;
}
