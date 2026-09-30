import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { maskNIC, normalizeIndexNumber } from '@/lib/utils';
import { calculateResultStatus } from '@/lib/result-utils';
import { searchRequestSchema } from '@/lib/validations/search';
import type { GradeEntry, PublicStudentResult } from '@/types';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
};

const messages = {
  VALIDATION_ERROR: 'Please enter the required information.',
  NOT_PUBLISHED: 'Results have not been published yet.',
  NOT_FOUND: 'The provided information does not match an available result.',
  RATE_LIMITED: 'Too many attempts. Please try again shortly.',
  SERVER_ERROR: 'Something went wrong. Please try again.',
} as const;

function err(code: keyof typeof messages, status: number): NextResponse {
  return NextResponse.json(
    { error: code, message: messages[code] },
    { status, headers: noCacheHeaders }
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('VALIDATION_ERROR', 400);
  }

  const validation = searchRequestSchema.safeParse(body);
  if (!validation.success) return err('VALIDATION_ERROR', 400);
  const { indexNumber, nicNumber, examinationId } = validation.data;

  // Phase 13: add IP-based rate limiting here before any database access.
  // Do not deploy publicly until that protection is implemented.
  try {
    const supabase = createAdminClient();
    // This client bypasses RLS, so enforce publication before reading students.
    const { data: exam, error: examError } = await supabase
      .from('examinations')
      .select('id, name, year, status')
      .eq('id', examinationId)
      .maybeSingle();
    if (examError) return err('SERVER_ERROR', 500);
    // Missing and unpublished examinations deliberately share a response.
    if (!exam || exam.status !== 'PUBLISHED') return err('NOT_PUBLISHED', 403);

    const studentQuery = supabase
      .from('students')
      .select('id, full_name, index_number, nic_number, school_name, examination_center')
      .eq('examination_id', examinationId);
    // Exact equality on indexed columns; no fallback to NIC when index is supplied.
    const { data: student, error: studentError } = await (
      indexNumber
        ? studentQuery.eq('index_number', normalizeIndexNumber(indexNumber))
        : studentQuery.eq('nic_number', nicNumber!)
    ).maybeSingle();
    if (studentError) return err('SERVER_ERROR', 500);
    if (!student) return err('NOT_FOUND', 404);

    const [subjectsResult, gradesResult] = await Promise.all([
      supabase
        .from('subjects')
        .select('id, subject_name, subject_code, display_order, required')
        .eq('examination_id', examinationId)
        .eq('active', true)
        .order('display_order', { ascending: true }),
      supabase.from('student_results').select('subject_id, grade').eq('student_id', student.id),
    ]);
    // Never turn a failed query into an empty grade list or a misleading status.
    if (subjectsResult.error || gradesResult.error) return err('SERVER_ERROR', 500);
    const subjects = subjectsResult.data ?? [];
    const gradeMap = new Map<string, string>(
      (gradesResult.data ?? []).map((grade) => [grade.subject_id, grade.grade])
    );
    const requiredIds = new Set(
      subjects.filter((subject) => subject.required).map((subject) => subject.id)
    );
    const overallStatus = calculateResultStatus(gradeMap, requiredIds);
    const grades: GradeEntry[] = subjects.map((subject) => ({
      subjectId: subject.id,
      subjectName: subject.subject_name,
      subjectCode: subject.subject_code,
      displayOrder: subject.display_order,
      grade: (gradeMap.get(subject.id) ?? null) as GradeEntry['grade'],
    }));
    // Explicit allowlist: never serialize a database row into the public response.
    const result: PublicStudentResult = {
      studentName: student.full_name,
      indexNumber: student.index_number,
      maskedNic: maskNIC(student.nic_number),
      schoolName: student.school_name,
      examinationCenter: student.examination_center,
      examinationName: exam.name,
      examinationYear: exam.year,
      grades,
      overallStatus,
    };
    console.log(
      `[Search] Exam: ${examinationId} | Found: ${student.index_number} | Status: ${overallStatus}`
    );
    return NextResponse.json(result, { status: 200, headers: noCacheHeaders });
  } catch {
    // Do not log exception objects: upstream errors can contain request identifiers.
    return err('SERVER_ERROR', 500);
  }
}

function methodNotAllowed(): NextResponse {
  return NextResponse.json(
    { error: 'Method not allowed.' },
    { status: 405, headers: { ...noCacheHeaders, Allow: 'POST' } }
  );
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
