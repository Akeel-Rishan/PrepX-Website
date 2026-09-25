// Run after applying 002_student_nic_uniqueness.sql.
// Creates and removes a private test examination and students.
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');
require('@next/env').loadEnvConfig(process.cwd());
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
let examId;
async function main() {
  const exam = await db.from('examinations').insert({ name: 'Step 5.2 NIC constraint test', year: 2026, status: 'DRAFT' }).select('id').single();
  if (exam.error) throw new Error('Test fixture creation failed: ' + exam.error.code);
  examId = exam.data.id;
  const row = { examination_id: examId, full_name: 'NIC Constraint Test', school_name: 'Test School', nic_number: '991234567V' };
  const first = await db.from('students').insert({ ...row, index_number: 'NICONE' });
  if (first.error) throw new Error('Test fixture creation failed: ' + first.error.code);
  const duplicate = await db.from('students').insert({ ...row, nic_number: ' 991234567v ', index_number: 'NICTWO' });
  assert.equal(duplicate.error?.code, '23505', 'NIC uniqueness migration is not active: apply 002_student_nic_uniqueness.sql.');
  console.log('PASS: database rejects duplicate NICs within one examination, including case/whitespace variants.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (examId) {
    const { error } = await db.from('examinations').delete().eq('id', examId);
    if (error) { console.error('NIC test fixture cleanup failed'); process.exitCode = 1; }
  }
});
