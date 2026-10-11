import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

// Synthetic local-development fixtures only. Never run against Preview or Production.
loadEnvConfig(process.cwd());
async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
  const { data: exam, error } = await supabase
    .from('examinations')
    .select('id')
    .eq('year', 2026)
    .eq('status', 'PUBLISHED')
    .order('id')
    .limit(1)
    .single();
  if (error || !exam)
    throw new Error('Published 2026 examination not found; run the dashboard seed first.');
  const schools = [
    'Example Academy Alpha',
    'Example Academy Beta',
    'Example Academy Gamma',
    'Example Academy Delta',
  ];
  const students = Array.from({ length: 55 }, (_, i) => {
    const n = i + 6;
    return {
      examination_id: exam.id,
      full_name: 'Fictional Student ' + String(n).padStart(3, '0'),
      index_number: 'OL2026' + String(n).padStart(3, '0'),
      nic_number: String(n).padStart(12, '0'),
      school_name: schools[n % 4],
      examination_center: n % 2 === 0 ? 'Example Centre A' : 'Example Centre B',
    };
  });
  const { error: insertError } = await supabase
    .from('students')
    .upsert(students, { onConflict: 'examination_id,index_number', ignoreDuplicates: true });
  if (insertError) throw new Error('Student seed failed (' + insertError.code + ').');
  const { count, error: countError } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true });
  if (countError) throw new Error('Seed count verification failed.');
  console.log('Student seed complete; existing records preserved. Total students: ' + count);
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Seed failed');
  process.exitCode = 1;
});
