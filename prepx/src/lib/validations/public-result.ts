import { z } from 'zod';
import { GRADES, RESULT_STATUSES } from '@/lib/constants';
import type { PublicStudentResult } from '@/types';

/** Validate the existing public contract and discard unexpected response fields. */
export const publicResultSchema = z.object({
  studentName: z.string().trim().min(1),
  indexNumber: z.string().trim().min(1),
  // Never trust a field name alone to guarantee that a NIC has been masked.
  maskedNic: z
    .string()
    .regex(/^\*+(?:[0-9VvXx]{0,4})$/)
    .nullish()
    .transform((value) => value ?? null),
  schoolName: z.string().trim().min(1),
  examinationCenter: z
    .string()
    .nullish()
    .transform((value) => value?.trim() || null),
  examinationName: z.string().trim().min(1),
  examinationYear: z.number().int().min(1900).max(9999),
  overallStatus: z.enum(RESULT_STATUSES),
  grades: z.array(
    z.object({
      subjectName: z.string().trim().min(1),
      subjectCode: z.string().nullable(),
      displayOrder: z.number().int(),
      grade: z
        .enum(GRADES)
        .nullish()
        .transform((value) => value ?? null),
    })
  ),
}) satisfies z.ZodType<PublicStudentResult>;
