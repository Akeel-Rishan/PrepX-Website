import { z } from 'zod';
import '@/lib/security/zod';
import { NIC_REGEX } from '@/lib/public-search';
import { identifierTextSchema, optionalNicSchema } from '@/lib/security/input';

/** Old NIC: 9 digits + V or X. New NIC: 12 digits. */
export const searchSchema = z
  .object({
    indexNumber: identifierTextSchema(50)
      .refine((value) => value === '' || /^[A-Z0-9]+$/.test(value), 'Invalid index number.')
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
    nicNumber: optionalNicSchema
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
  })
  .strict()
  .refine((data) => data.indexNumber !== undefined || data.nicNumber !== undefined, {
    message: 'Please enter your Index Number or NIC Number.',
  })
  .refine((data) => data.nicNumber === undefined || NIC_REGEX.test(data.nicNumber), {
    message: 'The NIC Number format is not valid.',
  });

export type SearchSchema = z.infer<typeof searchSchema>;

/** API requests additionally identify the examination being searched. */
export const searchRequestSchema = searchSchema.safeExtend({ examinationId: z.uuid() });
