import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

const TABLES = [
  'admin_profiles',
  'examinations',
  'students',
  'subjects',
  'student_results',
  'audit_logs',
] as const;

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function testDatabaseConnection(): Promise<void> {
  loadEnvConfig(process.cwd());

  const supabaseUrl = getRequiredEnvironmentVariable('NEXT_PUBLIC_SUPABASE_URL');
  const secretKey = getRequiredEnvironmentVariable('SUPABASE_SECRET_KEY');
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  for (const table of TABLES) {
    // GET retains PostgREST errors that an empty HEAD response can obscure.
    // Select only one ID; count still reports the total without exposing row data.
    const { count, error, status } = await supabase
      .from(table)
      .select('id', { count: 'exact' })
      .limit(1);

    if (error || status >= 400) {
      throw new Error(`${table}: ${error?.message ?? `HTTP ${status}`}`);
    }

    console.log(`✓ ${table}: accessible (${count ?? 0} rows)`);
  }

  const {
    data: auditPage,
    count: auditCount,
    error: auditError,
  } = await supabase
    .from('audit_logs')
    .select('action, entity_type, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(0, 24);
  if (auditError) throw new Error(`audit logs page query: ${auditError.message}`);
  const auditRows = auditPage ?? [];
  if (auditRows.length > 25) throw new Error('audit logs page query returned more than 25 rows');
  if (
    !auditRows.every(
      (row, index) => index === 0 || auditRows[index - 1]!.created_at >= row.created_at
    )
  ) {
    throw new Error('audit logs page query is not ordered newest first');
  }
  if ((auditCount ?? 0) > 0 && auditRows.length === 0) {
    throw new Error('audit logs page query returned no rows for a non-empty table');
  }
  if (auditRows[0]) {
    const [{ error: actionFilterError }, { error: entityFilterError }] = await Promise.all([
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('action', auditRows[0].action),
      auditRows[0].entity_type
        ? supabase
            .from('audit_logs')
            .select('id', { count: 'exact', head: true })
            .eq('entity_type', auditRows[0].entity_type)
        : Promise.resolve({ error: null }),
    ]);
    if (actionFilterError) throw new Error(`audit action filter: ${actionFilterError.message}`);
    if (entityFilterError) throw new Error(`audit entity filter: ${entityFilterError.message}`);
  }
  console.log(
    `✓ audit logs: newest-first pagination and action/entity filters available (${auditCount ?? 0} events)`
  );

  const { data: examination, error: examinationError } = await supabase
    .from('examinations')
    .select('id')
    .limit(1)
    .maybeSingle();
  if (examinationError) {
    throw new Error(`publication validation exam lookup: ${examinationError.message}`);
  }
  if (examination) {
    const { error: joinedResultsError } = await supabase
      .from('student_results')
      .select('student_id, subject_id, grade, student:students!inner(examination_id)')
      .eq('student.examination_id', examination.id)
      .limit(1);
    if (joinedResultsError) {
      throw new Error(`publication validation result join: ${joinedResultsError.message}`);
    }
    console.log('✓ publication validation: examination-scoped result join is available');
  }

  const { error: importFunctionError } = await supabase.rpc('import_exam_results', {
    p_admin_id: '00000000-0000-0000-0000-000000000000',
    p_examination_id: '00000000-0000-0000-0000-000000000000',
    p_rows: [],
  });
  if (!importFunctionError || importFunctionError.code !== '42501') {
    throw new Error(
      `import_exam_results: expected authorization rejection, received ${importFunctionError?.code ?? 'success'}`
    );
  }
  console.log('✓ import_exam_results: installed and rejects unknown administrators');

  console.log('✓ All tables accessible');
}

testDatabaseConnection().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown database connection error';
  console.error(`✗ Database verification failed: ${message}`);
  process.exitCode = 1;
});
