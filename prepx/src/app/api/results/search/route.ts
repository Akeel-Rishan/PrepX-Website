import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { buildPublicStudentResult } from '@/lib/public-result';
import { coalescePublicResultLookup } from '@/lib/public-result-inflight';
import { checkResultSearchRateLimit } from '@/lib/rate-limit';
import { readSearchBody } from '@/lib/rate-limit/request-body';
import { createAdminClient } from '@/lib/supabase/server';
import { searchRequestSchema } from '@/lib/validations/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ErrorCode =
  'VALIDATION_ERROR' | 'RATE_LIMITED' | 'NOT_PUBLISHED' | 'NOT_FOUND' | 'SERVER_ERROR';

const errorMessages: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Please enter the required information.',
  RATE_LIMITED: 'Too many search attempts. Please try again later.',
  NOT_PUBLISHED: 'Results have not been published yet.',
  NOT_FOUND: 'The provided information does not match an available result.',
  SERVER_ERROR: 'Something went wrong. Please try again.',
};

function lookupKey(examinationId: string, identifier: string): string {
  const secret = process.env.RATE_LIMIT_HASH_SECRET ?? 'prepx-local-result-lookup-v1';
  const digest = createHmac('sha256', secret)
    .update(`${examinationId}\0${identifier}`)
    .digest('hex');
  return `result:${digest}`;
}

function jsonResponse(
  body: unknown,
  status: number,
  headers?: Record<string, string>
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      ...headers,
    },
  });
}

function errorResponse(
  code: ErrorCode,
  status: number,
  headers?: Record<string, string>
): NextResponse {
  return jsonResponse({ error: code, message: errorMessages[code] }, status, headers);
}

function methodNotAllowed(): NextResponse {
  return jsonResponse({ error: 'Method not allowed.' }, 405, { Allow: 'POST' });
}

export async function GET(): Promise<NextResponse> {
  return methodNotAllowed();
}

export async function PUT(): Promise<NextResponse> {
  return methodNotAllowed();
}

export async function DELETE(): Promise<NextResponse> {
  return methodNotAllowed();
}

export async function PATCH(): Promise<NextResponse> {
  return methodNotAllowed();
}

export async function OPTIONS(): Promise<NextResponse> {
  return methodNotAllowed();
}

export async function POST(request: Request): Promise<NextResponse> {
  const payload = await readSearchBody(request);
  const rateLimit = await checkResultSearchRateLimit(request.headers, payload);
  if (!rateLimit.allowed) {
    return errorResponse(
      rateLimit.status === 429 ? 'RATE_LIMITED' : 'SERVER_ERROR',
      rateLimit.status,
      rateLimit.headers
    );
  }
  const limitedError = (code: ErrorCode, status: number) =>
    errorResponse(code, status, rateLimit.headers);
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return limitedError('VALIDATION_ERROR', 400);
  }

  const validation = searchRequestSchema.safeParse(payload);
  if (!validation.success) {
    return limitedError('VALIDATION_ERROR', 400);
  }
  const { examinationId, indexNumber, nicNumber } = validation.data;

  try {
    const { examination, examinationError } = await coalescePublicResultLookup(
      lookupKey(examinationId, indexNumber ?? nicNumber!),
      async () => {
        const admin = createAdminClient();
        let searchQuery = admin
          .from('examinations')
          .select(
            `
              id,
              name,
              year,
              status,
              subjects!subjects_examination_id_fkey (
                id,
                subject_name,
                subject_code,
                display_order,
                required
              ),
              students!students_examination_id_fkey (
                id,
                full_name,
                index_number,
                nic_number,
                school_name,
                examination_center,
                student_results!student_results_student_id_fkey (
                  subject_id,
                  grade
                )
              )
            `
          )
          .eq('id', examinationId)
          .eq('status', 'PUBLISHED')
          .eq('subjects.active', true)
          .order('display_order', { referencedTable: 'subjects', ascending: true });

        searchQuery = indexNumber
          ? searchQuery.eq('students.index_number', indexNumber)
          : searchQuery.eq('students.nic_number', nicNumber!);

        // PostgREST embeds the matching student, grades, and active subjects in one
        // database request. This preserves publication gating while avoiding the
        // three sequential network round trips used by the previous implementation.
        const { data, error } = await searchQuery.maybeSingle();
        return { examination: data, examinationError: error };
      }
    );

    if (examinationError) {
      console.error('[Public Result Search]', {
        stage: 'result',
        code: examinationError.code,
      });
      return limitedError('SERVER_ERROR', 500);
    }
    if (!examination) {
      return limitedError('NOT_PUBLISHED', 403);
    }

    const [student, duplicateStudent] = examination.students;
    if (!student) return limitedError('NOT_FOUND', 404);
    if (duplicateStudent) {
      console.error('[Public Result Search]', { stage: 'ambiguous-student' });
      return limitedError('SERVER_ERROR', 500);
    }

    const publicResult = buildPublicStudentResult({
      examination,
      student,
      subjects: examination.subjects,
      results: student.student_results,
    });
    return jsonResponse(publicResult, 200, rateLimit.headers);
  } catch {
    console.error('[Public Result Search]', { stage: 'unexpected' });
    return limitedError('SERVER_ERROR', 500);
  }
}
