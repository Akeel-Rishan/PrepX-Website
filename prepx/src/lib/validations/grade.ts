import { z } from 'zod';

import { GRADES } from '@/lib/constants';

export const gradeSchema = z.enum(GRADES, {
  error: `Grade must be one of: ${GRADES.join(', ')}`,
});

export const gradeOrNullSchema = gradeSchema.nullable();

export type GradeSchema = z.infer<typeof gradeSchema>;
