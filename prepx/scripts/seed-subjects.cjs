// Repeatable Step 6.1 seed. Existing subjects are preserved.
const { createClient } = require('@supabase/supabase-js');
require('@next/env').loadEnvConfig(process.cwd());
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
async function main() {
  const { data: exam, error } = await client.from('examinations').select('id').eq('year', 2026).eq('status', 'PUBLISHED').order('id').limit(1).single();
  if (error || !exam) throw new Error('A published 2026 examination is required.');
  const { data: existing, error: listError } = await client.from('subjects').select('subject_name,subject_code,display_order').eq('examination_id', exam.id);
  if (listError) throw new Error('Cannot inspect existing subjects.');
  const definitions = [['Tamil','TML',true],['English','ENG',true],['Mathematics','MAT',true],['Science','SCI',true],['History','HIS',true],['Religion','REL',false],['ICT','ICT',false],['Commerce','COM',false]];
  let next = Math.max(-1, ...existing.map(subject => subject.display_order)) + 1;
  const additions = definitions.filter(([name, code]) => !existing.some(subject => subject.subject_code?.toUpperCase() === code || subject.subject_name.toLowerCase() === name.toLowerCase())).map(([subject_name, subject_code, required]) => ({ examination_id: exam.id, subject_name, subject_code, required, active: true, display_order: next++ }));
  if (additions.length) {
    const result = await client.from('subjects').insert(additions);
    if (result.error) throw new Error('Subject seed failed: ' + result.error.code);
  }
  console.log('Subject seed complete: added ' + additions.length + '; existing rows preserved.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
