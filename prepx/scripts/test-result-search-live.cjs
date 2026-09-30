// Read-only HTTP smoke test. Start the app first; uses existing published data.
// Never prints identifiers, result bodies, credentials, or upstream error details.
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');
require('@next/env').loadEnvConfig(process.cwd());
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
let stage = 'database connection';
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function request(body) {
  return fetch(baseURL + '/api/results/search', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
  });
}
async function main() {
  const { data: exams, error } = await client.from('examinations').select('id, status').limit(100);
  if (error) throw new Error('Database read unavailable; no live tests completed.');
  const published = exams.find(exam => exam.status === 'PUBLISHED');
  const unpublished = exams.find(exam => exam.status !== 'PUBLISHED');
  stage = 'local HTTP endpoint';
  for (const method of ['GET', 'PUT', 'DELETE']) {
    assert.equal((await fetch(baseURL + '/api/results/search', { method })).status, 405);
  }
  console.log('PASS: live method restrictions');
  assert.equal((await request({})).status, 400);
  console.log('PASS: live validation');
  if (unpublished) {
    assert.equal((await request({ examinationId: unpublished.id, indexNumber: 'NO-MATCH' })).status, 403);
    console.log('PASS: live unpublished exam rejection');
  } else console.log('SKIP: no unpublished fixture');
  if (!published) { console.log('SKIP: no published fixture'); return; }
  const { data: student, error: studentError } = await client.from('students')
    .select('index_number, nic_number').eq('examination_id', published.id).limit(1).maybeSingle();
  if (studentError) throw new Error('Student fixture read unavailable.');
  if (!student) { console.log('SKIP: no student in published fixture'); return; }
  const body = { examinationId: published.id, indexNumber: student.index_number };
  const response = await request(body);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store, no-cache, must-revalidate');
  const result = await response.json();
  assert.ok(Array.isArray(result.grades));
  assert.ok(['Passed', 'Not Passed', 'Absent', 'Incomplete'].includes(result.overallStatus));
  if (student.nic_number) assert.ok(!JSON.stringify(result).includes(student.nic_number));
  assert.deepEqual(await (await request({ ...body, indexNumber: '  ' + student.index_number.toLowerCase() + '  ' })).json(), result);
  console.log('PASS: live index lookup, normalization, masking and no-cache');
  if (student.nic_number) {
    const byNic = await request({ examinationId: published.id, nicNumber: student.nic_number.toLowerCase() });
    assert.equal(byNic.status, 200);
    assert.deepEqual(await byNic.json(), result);
    console.log('PASS: live NIC lookup');
  } else console.log('SKIP: fixture has no NIC');
  assert.equal((await request({ ...body, indexNumber: 'NO-MATCH-' + require('node:crypto').randomUUID() })).status, 404);
  console.log('PASS: live not-found response');
}
main().catch(() => {
  console.error(`FAIL: live search verification stopped at ${stage}. No sensitive details logged.`);
  process.exitCode = 1;
});
