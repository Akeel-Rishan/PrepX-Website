import { z } from 'zod';
import '@/lib/security/zod';

import { GRADES } from '@/lib/constants';
import { identifierTextSchema } from '@/lib/security/input';

export const gradeSchema = identifierTextSchema(2).pipe(z.enum(GRADES, {
  error: `Grade must be one of: ${GRADES.join(', ')}`,
}));

export const gradeOrNullSchema = gradeSchema.nullable();

export type GradeSchema = z.infer<typeof gradeSchema>;
