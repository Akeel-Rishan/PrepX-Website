import { z } from 'zod';

/** Old NIC: 9 digits + V or X. New NIC: 12 digits. */
const nicRegex = /^([0-9]{9}[VvXx]|[0-9]{12})$/;

export const searchSchema = z
  .object({
    indexNumber: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
    nicNumber: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
  })
  .refine((data) => data.indexNumber !== undefined || data.nicNumber !== undefined, {
    message: 'Please enter your Index Number or NIC Number.',
  })
  .refine((data) => data.nicNumber === undefined || nicRegex.test(data.nicNumber), {
    message: 'The NIC Number format is not valid.',
  });

export type SearchSchema = z.infer<typeof searchSchema>;
