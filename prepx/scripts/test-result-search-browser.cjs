// Requires a running app, existing published results, playwright-core and Edge.
// Optional PLAYWRIGHT_MODULE may point to an externally installed playwright-core.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const { createClient } = require('@supabase/supabase-js');
require('@next/env').loadEnvConfig(process.cwd());
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let browser;
let stage = 'published fixture lookup';
async function main() {
  const { data: exam, error } = await client.from('examinations').select('id')
    .eq('status', 'PUBLISHED').order('year', { ascending: false })
    .order('publication_date', { ascending: false }).limit(1).single();
  if (error || !exam) throw new Error('No published fixture');
  const { data: student, error: studentError } = await client.from('students')
    .select('index_number, nic_number').eq('examination_id', exam.id).limit(1).single();
  if (studentError || !student) throw new Error('No student fixture');
  stage = 'browser launch';
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  stage = 'search page';
  await page.goto(baseURL);
  await page.locator('#indexNumber').fill(student.index_number);
  let releaseRequest;
  await page.route('**/api/results/search', async route => {
    assert.equal(route.request().method(), 'POST');
    assert.equal(new URL(route.request().url()).search, '');
    await new Promise(resolve => { releaseRequest = resolve; });
    await route.continue();
  });
  stage = 'loading indicator';
  await page.getByRole('button', { name: 'Search My Results' }).click();
  await page.getByRole('button', { name: /Searching/ }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Searching/ }).isDisabled(), true);
  await page.waitForTimeout(100);
  if (!releaseRequest) throw new Error('Request was not dispatched');
  releaseRequest();
  stage = 'result navigation without persistence';
  await page.waitForURL(baseURL + '/results');
  await page.getByText(student.index_number, { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => sessionStorage.getItem('prepx_result')), null);
  if (student.nic_number) assert.ok(!(await page.locator('body').innerText()).includes(student.nic_number));
  assert.equal(new URL(page.url()).search, '');
  await page.unroute('**/api/results/search');
  stage = 'generic not-found route';
  await page.goto(baseURL);
  await page.locator('#indexNumber').fill('NO-MATCH-' + require('node:crypto').randomUUID());
  await page.getByRole('button', { name: 'Search My Results' }).click();
  await page.waitForURL(baseURL + '/results/not-found');
  await page.getByRole('heading', { name: 'Result Not Found', exact: true }).waitFor();
  console.log('PASS 10: browser spinner, POST, in-memory result display, no persisted result and generic not-found navigation');
}
main().catch(() => {
  console.error(`FAIL: browser verification stopped at ${stage}. No sensitive details logged.`);
  process.exitCode = 1;
}).finally(async () => { if (browser) await browser.close(); });
