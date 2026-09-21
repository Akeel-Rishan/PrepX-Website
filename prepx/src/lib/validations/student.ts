import { z } from 'zod';

const nicRegex = /^([0-9]{9}[VvXx]|[0-9]{12})$/;

export const studentSchema = z.object({
  examination_id: z.string().uuid('Invalid examination ID.'),
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
    .max(50, 'Index number is too long.'),
  nic_number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(nicRegex, 'Invalid NIC format.')
    .optional()
    .nullable(),
  school_name: z
    .string()
    .trim()
    .min(2, 'School name must be at least 2 characters.')
    .max(200, 'School name is too long.'),
  examination_center: z.string().trim().max(200).optional().nullable(),
});

export type StudentSchema = z.infer<typeof studentSchema>;
