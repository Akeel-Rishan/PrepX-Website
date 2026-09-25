import { z } from 'zod';

export const subjectSchema = z.object({
  examination_id: z.string().uuid('Invalid examination.'),
  subject_name: z
    .string()
    .trim()
    .min(1, 'Subject name is required.')
    .max(100, 'Subject name must be under 100 characters.'),
  subject_code: z
    .string()
    .trim()
    .toUpperCase()
    .max(10, 'Subject code must be under 10 characters.')
    .optional()
    .nullable()
    .transform((value) => value || null),
  required: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type SubjectSchema = z.infer<typeof subjectSchema>;
export interface SubjectFormState {
  error?: string;
  fieldErrors?: Partial<
    Record<'subject_name' | 'subject_code' | 'examination_id' | 'required', string[]>
  >;
  success?: boolean;
}
