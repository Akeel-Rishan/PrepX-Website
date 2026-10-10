import { NextResponse } from 'next/server';
import { buildPublicStudentResult } from '@/lib/public-result';
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
    const admin = createAdminClient();
    const { data: examination, error: examinationError } = await admin
      .from('examinations')
      .select('id, name, year, status')
      .eq('id', examinationId)
      .maybeSingle();

    if (examinationError) {
      console.error('[Public Result Search]', {
        stage: 'examination',
        code: examinationError.code,
      });
      return limitedError('SERVER_ERROR', 500);
    }
    if (!examination || examination.status !== 'PUBLISHED') {
      return limitedError('NOT_PUBLISHED', 403);
    }

    let studentQuery = admin
      .from('students')
      .select('id, full_name, index_number, nic_number, school_name, examination_center')
      .eq('examination_id', examination.id);
    studentQuery = indexNumber
      ? studentQuery.eq('index_number', indexNumber)
      : studentQuery.eq('nic_number', nicNumber!);

    const { data: student, error: studentError } = await studentQuery.maybeSingle();
    if (studentError) {
      console.error('[Public Result Search]', { stage: 'student', code: studentError.code });
      return limitedError('SERVER_ERROR', 500);
    }
    if (!student) return limitedError('NOT_FOUND', 404);

    const [subjectsResult, gradesResult] = await Promise.all([
      admin
        .from('subjects')
        .select('id, subject_name, subject_code, display_order, required')
        .eq('examination_id', examination.id)
        .eq('active', true)
        .order('display_order', { ascending: true }),
      admin.from('student_results').select('subject_id, grade').eq('student_id', student.id),
    ]);

    if (subjectsResult.error || gradesResult.error) {
      console.error('[Public Result Search]', {
        stage: 'result',
        subjects: subjectsResult.error?.code,
        grades: gradesResult.error?.code,
      });
      return limitedError('SERVER_ERROR', 500);
    }

    const publicResult = buildPublicStudentResult({
      examination,
      student,
      subjects: subjectsResult.data ?? [],
      results: gradesResult.data ?? [],
    });
    return jsonResponse(publicResult, 200, rateLimit.headers);
  } catch {
    console.error('[Public Result Search]', { stage: 'unexpected' });
    return limitedError('SERVER_ERROR', 500);
  }
}
