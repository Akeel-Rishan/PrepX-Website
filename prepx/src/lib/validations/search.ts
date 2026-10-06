import { z } from 'zod';
import { NIC_REGEX, normalizeSearchIdentifier } from '@/lib/public-search';

/** Old NIC: 9 digits + V or X. New NIC: 12 digits. */
export const searchSchema = z
  .object({
    indexNumber: z
      .string()
      .transform(normalizeSearchIdentifier)
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
    nicNumber: z
      .string()
      .transform(normalizeSearchIdentifier)
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
  })
  .refine((data) => data.indexNumber !== undefined || data.nicNumber !== undefined, {
    message: 'Please enter your Index Number or NIC Number.',
  })
  .refine((data) => data.nicNumber === undefined || NIC_REGEX.test(data.nicNumber), {
    message: 'The NIC Number format is not valid.',
  });

export type SearchSchema = z.infer<typeof searchSchema>;

/** API requests additionally identify the examination being searched. */
export const searchRequestSchema = searchSchema.safeExtend({ examinationId: z.uuid() });
