// Read-only local-dev verification. Start an isolated dev server with:
// IP=6, identifier=2, both windows=10 seconds; see RATE-LIMITING.md.
// Uses existing published seed data; never logs identifiers or response bodies.
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');
require('@next/env').loadEnvConfig(process.cwd());
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3002';
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
let browser;
let stage = 'fixture lookup';
async function main() {
  const { data: exam, error } = await client.from('examinations').select('id')
    .eq('status', 'PUBLISHED').order('year', { ascending: false }).order('publication_date', { ascending: false }).limit(1).single();
  if (error || !exam) throw new Error('Published fixture unavailable');
  const { data: student, error: studentError } = await client.from('students').select('index_number,nic_number')
    .eq('examination_id', exam.id).not('nic_number', 'is', null).order('index_number').limit(1).single();
  if (studentError || !student) throw new Error('Student fixture unavailable');
  stage = 'browser warmup';
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.goto(base + '/results');
  await page.getByRole('heading', { name: 'Search for your result' }).waitFor();
  await page.goto(base);
  await page.locator('#indexNumber').waitFor();
  // GET does not consume the POST quota, and warms the development route.
  assert.equal((await fetch(base + '/api/results/search')).status, 405);
  const indexBody = { examinationId: exam.id, indexNumber: student.index_number };
  async function post(body, ip = '192.0.2.100') {
    const response = await fetch(base + '/api/results/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip, 'x-real-ip': ip },
      body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(30000),
    });
    assert(response.headers.get('cache-control').includes('no-store'));
    return { response, data: await response.json() };
  }
  stage = 'normal index and NIC searches';
  const first = await post(indexBody);
  assert.equal(first.response.status, 200);
  assert.equal(first.response.headers.get('x-ratelimit-limit'), '2');
  assert.equal(first.response.headers.get('x-ratelimit-remaining'), '1');
  assert(!JSON.stringify(first.data).includes(student.nic_number));
  const nic = await post({ examinationId: exam.id, nicNumber: student.nic_number });
  assert.equal(nic.response.status, 200);
  assert.deepEqual(nic.data, first.data);
  console.log('PASS: live index and NIC searches, unchanged public result, masking and rate headers.');
  stage = 'identifier threshold';
  assert.equal((await post({ ...indexBody, indexNumber: ' ' + student.index_number.toLowerCase() + ' ' })).response.status, 200);
  const identifierBlock = await post(indexBody, '192.0.2.101');
  assert.equal(identifierBlock.response.status, 429);
  assert.equal(identifierBlock.response.headers.get('x-ratelimit-limit'), '2');
  stage = 'invalid requests and spoofed forwarded headers';
  assert.equal((await post('{', '192.0.2.102')).response.status, 400);
  assert.equal((await post('{', '192.0.2.103')).response.status, 400);
  const ipBlock = await post('{', '192.0.2.104');
  assert.equal(ipBlock.response.status, 429);
  assert.equal(ipBlock.response.headers.get('x-ratelimit-limit'), '6');
  for (const blocked of [identifierBlock, ipBlock]) {
    assert.deepEqual(blocked.data, { error: 'RATE_LIMITED', message: 'Too many search attempts. Please try again later.' });
    assert.equal(blocked.response.headers.get('x-ratelimit-remaining'), '0');
    assert(Number(blocked.response.headers.get('retry-after')) >= 1);
    assert(Number(blocked.response.headers.get('x-ratelimit-reset')) >= Date.now() / 1000);
  }
  console.log('PASS: identifier and IP 429s, invalid requests count, spoofed IP headers cannot bypass local quota, generic body and Retry-After/reset headers.');
  stage = 'window reset';
  const resetAt = Math.max(Number(identifierBlock.response.headers.get('x-ratelimit-reset')), Number(ipBlock.response.headers.get('x-ratelimit-reset')));
  const delay = Math.max(0, resetAt * 1000 - Date.now() + 100);
  assert(delay <= 12000, 'Use the documented 10-second test windows');
  await new Promise(resolve => setTimeout(resolve, delay));
  const reset = await post(indexBody);
  assert.equal(reset.response.status, 200);
  assert.equal(reset.response.headers.get('x-ratelimit-remaining'), '1');
  console.log('PASS: real HTTP quota reset after Retry-After.');
  stage = 'successful browser search';
  await page.locator('#indexNumber').fill(student.index_number);
  await page.getByRole('button', { name: 'Search My Results' }).click();
  await page.waitForURL(base + '/results');
  await page.getByText(student.index_number, { exact: true }).waitFor();
  assert(!(await page.locator('body').innerText()).includes(student.nic_number));
  assert(await page.getByRole('button', { name: 'Print / Save as PDF' }).isVisible());
  stage = 'browser rate-limit feedback';
  await page.getByRole('link', { name: 'Search Again' }).click();
  await page.locator('#indexNumber').fill(student.index_number);
  await page.getByRole('button', { name: 'Search My Results' }).click();
  await page.locator('#search-error').waitFor();
  assert.equal(await page.locator('#search-error').innerText(), 'Too many attempts. Please wait a moment and try again.');
  assert.equal(await page.getByRole('button', { name: 'Search My Results' }).isDisabled(), false);
  assert.equal(new URL(page.url()).search, '');
  console.log('PASS: actual browser handoff/result/print action and retryable generic 429 feedback.');
}
main().catch(() => {
  console.error(`FAIL: live rate-limit verification stopped at ${stage}; no private details logged.`);
  process.exitCode = 1;
}).finally(async () => { if (browser) await browser.close(); });
