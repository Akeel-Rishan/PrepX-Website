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
    const { count, error } = await supabase.from(table).select('*', {
      count: 'exact',
      head: true,
    });

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    console.log(`✓ ${table}: accessible (${count ?? 0} rows)`);
  }

  console.log('✓ All tables accessible');
}

testDatabaseConnection().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown database connection error';
  console.error(`✗ Database verification failed: ${message}`);
  process.exitCode = 1;
});
