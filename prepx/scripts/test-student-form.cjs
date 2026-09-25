// Install temporary tooling: npm install --no-save --package-lock=false playwright-core
// Run against npm run dev: node scripts/test-student-form.cjs
// Creates and cleans up its own admin, examination, students and grades.
// Audit records are retained as the application's immutable test audit trail.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright-core');
const { createClient } = require('@supabase/supabase-js');
require('@next/env').loadEnvConfig(process.cwd());
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const token = crypto.randomUUID().replaceAll('-', '');
let authId, examId, browser;
const checks = [];
async function db(query) { const result = await query; if (result.error) throw new Error('Fixture database failure: ' + result.error.code); return result; }
async function visible(locator) { await locator.waitFor({ state: 'visible', timeout: 30000 }); }
async function main() {
  const email = 'prepx-test-' + token + '@example.com';
  const password = crypto.randomBytes(24).toString('base64url') + '!aA1';
  const createdUser = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createdUser.error) throw new Error('Test user creation failed: ' + createdUser.error.code);
  authId = createdUser.data.user.id;
  await db(admin.from('admin_profiles').insert({ user_id: authId }));
  examId = (await db(admin.from('examinations').insert({ name: 'Step 5.2 Test ' + token.slice(0, 8), year: 2026, status: 'DRAFT' }).select('id').single())).data.id;
  const other = (await db(admin.from('students').insert({ examination_id: examId, full_name: 'Existing Test Student', index_number: 'EXISTING52', school_name: 'Test School', nic_number: '991234567V' }).select('id').single())).data;
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(120000);
  await page.goto(baseURL + '/admin/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL('**/admin/dashboard', { timeout: 90000 });
  // Fixture creation bypasses app actions. Save once through the application to
  // invalidate the lookup caches exactly as a normal student mutation does.
  await page.goto(baseURL + '/admin/students/' + other.id);
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await visible(page.getByText('Student record updated successfully.', { exact: true }));
  await page.goto(baseURL + '/admin/students/new');
  await visible(page.getByRole('heading', { name: 'Create Student', exact: true }));
  await page.getByRole('button', { name: 'Create Student', exact: true }).click();
  await visible(page.getByText('Please select a valid examination.', { exact: true }));
  await visible(page.getByText('Full name must be at least 2 characters.', { exact: true }));
  await visible(page.getByText('School name must be at least 2 characters.', { exact: true }));
  await page.getByRole('combobox', { name: 'Examination', exact: true }).selectOption(examId);
  await page.getByLabel('Full Name', { exact: true }).fill('Step 5.2 Test Student');
  await page.getByLabel('School Name', { exact: true }).fill('Test School');
  await page.getByLabel('Index Number', { exact: true }).fill('OL 2026 001');
  await page.getByLabel('NIC Number', { exact: true }).fill('12345');
  await page.getByRole('button', { name: 'Create Student', exact: true }).click();
  await visible(page.getByText('Index number may only contain letters and numbers.', { exact: true }));
  await visible(page.getByText('NIC must be 9 digits + V/X (old) or 12 digits (new).', { exact: true }));
  checks.push('2: required fields, index spaces, and invalid NIC errors');
  await page.getByLabel('Index Number', { exact: true }).fill('EXISTING52');
  await page.getByLabel('NIC Number', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Create Student', exact: true }).click();
  await visible(page.getByText('This index number is already registered in this examination.', { exact: true }));
  assert.equal(await page.getByLabel('Full Name', { exact: true }).inputValue(), 'Step 5.2 Test Student');
  checks.push('3: duplicate index error and preserved values');
  await page.getByLabel('Index Number', { exact: true }).fill(' ol2026099 ');
  await page.getByRole('button', { name: 'Create Student', exact: true }).click();
  await page.waitForURL(url => /\/admin\/students\/[0-9a-f-]{36}$/.test(url.pathname), { timeout: 90000 });
  const studentId = new URL(page.url()).pathname.split('/').pop();
  await visible(page.getByRole('heading', { name: 'Step 5.2 Test Student', exact: true }));
  const created = (await db(admin.from('students').select('*').eq('id', studentId).single())).data;
  assert.equal(created.index_number, 'OL2026099');
  assert.equal(created.nic_number, null);
  assert.equal(await page.getByRole('combobox').count(), 0);
  checks.push('1: create with blank NIC, normalization, redirect and edit page');
  await page.goto(baseURL + '/admin/students');
  await visible(page.getByRole('combobox', { name: 'School', exact: true }));
  await page.goto(baseURL + '/admin/students/' + studentId);
  await page.getByLabel('School Name', { exact: true }).fill('Updated Test School');
  await page.getByLabel('NIC Number', { exact: true }).fill('200312345678');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await visible(page.getByText('Student record updated successfully.', { exact: true }));
  assert.equal((await db(admin.from('students').select('school_name').eq('id', studentId).single())).data.school_name, 'Updated Test School');
  await page.getByText('Student record updated successfully.', { exact: true }).waitFor({ state: 'hidden', timeout: 10000 });
  checks.push('4: edit, new-format NIC, locked exam and auto-dismiss success');
  await page.goto(baseURL + '/admin/students');
  const schoolOptions = await page.getByRole('combobox', { name: 'School', exact: true }).locator('option').allTextContents();
  assert.ok(schoolOptions.includes('Updated Test School'), 'A save must immediately invalidate cached school options');
  await page.goto(baseURL + '/admin/students/' + studentId);
  await page.getByLabel('Index Number', { exact: true }).fill('EXISTING52');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await visible(page.getByText('This index number is already registered in this examination.', { exact: true }));
  checks.push('5: edit duplicate index');
  await page.getByLabel('Index Number', { exact: true }).fill('OL2026099');
  await page.getByLabel('NIC Number', { exact: true }).fill('981234567x');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await visible(page.getByText('Student record updated successfully.', { exact: true }));
  assert.equal((await db(admin.from('students').select('nic_number').eq('id', studentId).single())).data.nic_number, '981234567X');
  await page.getByRole('button', { name: 'Delete Student', exact: true }).click();
  await visible(page.getByRole('dialog'));
  assert.equal(await page.getByText(/grade entr.*will also/).count(), 0);
  await page.getByRole('button', { name: 'Keep Student', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal((await db(admin.from('students').select('id').eq('id', studentId).single())).data.id, studentId);
  checks.push('7: no-grade dialog and cancellation');
  const subjectId = (await db(admin.from('subjects').insert({ examination_id: examId, subject_name: 'Test Subject' }).select('id').single())).data.id;
  await db(admin.from('student_results').insert({ student_id: studentId, subject_id: subjectId, grade: 'A' }));
  await page.reload();
  await visible(page.getByText('1 grade entry', { exact: true }));
  checks.push('8: grade count badge');
  await page.getByRole('button', { name: 'Delete Student', exact: true }).click();
  await visible(page.getByText('1 grade entry will also be permanently deleted.', { exact: true }));
  await page.getByRole('button', { name: 'Keep Student', exact: true }).click();
  await db(admin.from('examinations').update({ status: 'PUBLISHED' }).eq('id', examId));
  await page.reload();
  assert.ok(await page.getByRole('button', { name: 'Delete Student', exact: true }).isDisabled());
  await visible(page.getByText('Cannot delete from a published exam.', { exact: true }));
  await db(admin.from('examinations').update({ status: 'DRAFT' }).eq('id', examId));
  await page.reload();
  await page.setViewportSize({ width: 375, height: 812 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.getByRole('button', { name: 'Delete Student', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Permanently', exact: true }).click();
  await page.waitForURL('**/admin/students', { timeout: 90000 });
  assert.equal((await db(admin.from('students').select('id').eq('id', studentId))).data.length, 0);
  assert.equal((await db(admin.from('student_results').select('id').eq('student_id', studentId))).data.length, 0);
  checks.push('6: published deletion disabled, grade warning, delete redirect and cascade; mobile width');
  const logs = (await db(admin.from('audit_logs').select('action,old_value,new_value').eq('entity_id', studentId))).data;
  for (const action of ['STUDENT_CREATED', 'STUDENT_UPDATED', 'STUDENT_DELETED']) assert.ok(logs.some(log => log.action === action));
  assert.ok(!JSON.stringify(logs).includes('200312345678'));
  assert.ok(!JSON.stringify(logs).includes('981234567X'));
  checks.push('9: create/update/delete audit entries with masked NIC snapshots');
  await page.goto(baseURL + '/admin/students/not-a-valid-id');
  await visible(page.getByText('Page not found.', { exact: true }));
  checks.push('10: invalid UUID not-found page');
  await page.goto(baseURL + '/admin/students/' + other.id);
  await page.getByRole('button', { name: 'Delete Student', exact: true }).click();
  assert.equal(await page.getByText(/grade entr.*will also/).count(), 0);
  await page.getByRole('button', { name: 'Delete Permanently', exact: true }).click();
  await page.waitForURL('**/admin/students', { timeout: 90000 });
  checks.push('7: no-grade deletion completes');
  console.log('PASS browser tests:\n' + checks.join('\n'));
}
main().catch(error => { console.error('Completed checks:', checks); console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (examId) await db(admin.from('examinations').delete().eq('id', examId));
  if (authId) { const { error } = await admin.auth.admin.deleteUser(authId); if (error) { console.error('Test user cleanup failed'); process.exitCode = 1; } }
});


