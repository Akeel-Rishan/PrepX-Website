// Requires the guarded local integration stack, a running app pointed at it, and Edge.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const { createClient } = require('@supabase/supabase-js');
const { configuration } = require('./integration/config.cjs');

const config = configuration();
const client = createClient(config.url, config.service, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
let adminId;
let examinationId;
let browser;

async function data(query) {
  const result = await query;
  if (result.error) throw new Error(`Local fixture operation failed (${result.error.code}).`);
  return result.data;
}

(async () => {
  const token = crypto.randomUUID();
  const email = `delete-browser-${token}@example.invalid`;
  const password = `${crypto.randomBytes(24).toString('base64url')}!aA1`;
  const examinationName = `Delete Browser Test ${token.slice(0, 8)}`;
  const examinationYear = 2028;

  const createdUser = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { prepx_test_run: token },
  });
  if (createdUser.error || !createdUser.data.user) throw new Error('Local test user creation failed.');
  adminId = createdUser.data.user.id;
  await data(client.from('admin_profiles').insert({ user_id: adminId }));

  const examination = await data(
    client
      .from('examinations')
      .insert({
        name: examinationName,
        year: examinationYear,
        organization_name: `PREPX-DELETE-BROWSER-${token}`,
        status: 'PUBLISHED',
      })
      .select('id')
      .single()
  );
  examinationId = examination.id;
  const student = await data(
    client
      .from('students')
      .insert({
        examination_id: examinationId,
        full_name: 'Fictional Delete Student',
        index_number: 'DELETEBROWSER1',
        school_name: 'Fictional School',
      })
      .select('id')
      .single()
  );
  const subject = await data(
    client
      .from('subjects')
      .insert({ examination_id: examinationId, subject_name: 'Fictional Delete Subject' })
      .select('id')
      .single()
  );
  await data(
    client
      .from('student_results')
      .insert({ student_id: student.id, subject_id: subject.id, grade: 'A' })
  );

  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  page.setDefaultTimeout(45000);
  page.setDefaultNavigationTimeout(120000);

  await page.goto(base + '/admin/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in securely', exact: true }).click();
  await page.waitForURL('**/admin/dashboard');
  await page.goto(`${base}/admin/examinations/${examinationId}`);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.equal(await page.getByRole('button', { name: 'Archive', exact: true }).count(), 0);

  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('heading', { name: 'Delete examination permanently?' }).waitFor();
  await dialog.getByText('This cannot be undone.', { exact: true }).waitFor();
  const confirmation = dialog.getByLabel(new RegExp(`Type ${examinationName} ${examinationYear}`));
  const submit = dialog.getByRole('button', { name: 'Delete Permanently', exact: true });
  assert(await submit.isDisabled());
  await confirmation.fill('wrong confirmation');
  assert(await submit.isDisabled());
  await confirmation.fill(`${examinationName} ${examinationYear}`);
  assert(!(await submit.isDisabled()));
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(
    (await data(client.from('examinations').select('id').eq('id', examinationId))).length,
    1
  );

  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await dialog
    .getByLabel(new RegExp(`Type ${examinationName} ${examinationYear}`))
    .fill(`${examinationName} ${examinationYear}`);
  await dialog.getByRole('button', { name: 'Delete Permanently', exact: true }).click();
  await page.waitForURL('**/admin/examinations?deleted=1');
  await page.getByText('Examination and all associated data were deleted.', { exact: true }).waitFor();

  for (const [table, column, value] of [
    ['examinations', 'id', examinationId],
    ['students', 'id', student.id],
    ['subjects', 'id', subject.id],
    ['student_results', 'student_id', student.id],
  ]) {
    assert.equal((await data(client.from(table).select('id').eq(column, value))).length, 0);
  }
  const audit = await data(
    client
      .from('audit_logs')
      .select('new_value')
      .eq('admin_id', adminId)
      .eq('action', 'EXAMINATION_DELETED')
      .eq('entity_id', examinationId)
      .single()
  );
  assert.equal(audit.new_value.students_deleted, 1);
  assert.equal(audit.new_value.subjects_deleted, 1);
  assert.equal(audit.new_value.results_deleted, 1);

  console.log('PASS: responsive typed confirmation, cancellation, published examination deletion, database cascades, redirect feedback, and retained audit counts.');
})()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (examinationId) {
      const { error } = await client.from('examinations').delete().eq('id', examinationId);
      if (error) process.exitCode = 1;
    }
    if (adminId) {
      const auditCleanup = await client.from('audit_logs').delete().eq('admin_id', adminId);
      if (auditCleanup.error) process.exitCode = 1;
      const userCleanup = await client.auth.admin.deleteUser(adminId);
      if (userCleanup.error && userCleanup.error.status !== 404) process.exitCode = 1;
    }
  });
