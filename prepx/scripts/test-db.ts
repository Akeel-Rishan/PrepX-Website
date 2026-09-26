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
