import { z } from 'zod';
import '@/lib/security/zod';
import { plainTextSchema, indexSchema, optionalNicSchema } from '@/lib/security/input';

export const studentSchema = z.object({
  examination_id: z.string().uuid('Please select a valid examination.'),
  full_name: plainTextSchema(200, 2),
  index_number: indexSchema,
  nic_number: optionalNicSchema
    .optional()
    .nullable()
    .transform((value) => value || null),
  school_name: plainTextSchema(200, 2),
  examination_center: plainTextSchema(200)
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
