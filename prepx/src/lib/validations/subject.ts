import { z } from 'zod';
import '@/lib/security/zod';
import { plainTextSchema } from '@/lib/security/input';

export const subjectSchema = z.object({
  examination_id: z.string().uuid('Invalid examination.'),
  subject_name: plainTextSchema(100, 1),
  subject_code: plainTextSchema(10)
    .transform((value) => value.toUpperCase())
    .pipe(z.string().max(10))
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
