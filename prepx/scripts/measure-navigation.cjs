// Compare the same warmed development server before/after a change.
// Creates a temporary admin, measures browser navigations, then removes that admin.
const { chromium } = require('playwright-core');
const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');
const crypto = require('node:crypto');
const fs = require('node:fs');
require('@next/env').loadEnvConfig(process.cwd());
const url = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const label = process.argv[2] || 'measurement';
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
let userId, browser;
async function main() {
  const email = 'prepx-perf-' + crypto.randomUUID() + '@example.com';
  const password = crypto.randomBytes(24).toString('base64url') + '!aA1';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
  const profile = await admin.from('admin_profiles').insert({ user_id: userId });
  if (profile.error) throw profile.error;
  const jar = new Map();
  let authRequests = 0;
  const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: { getAll: () => Array.from(jar.values()), setAll: cs => cs.forEach(c => jar.set(c.name, c)) },
    global: { fetch: (...args) => { authRequests++; return fetch(...args); } }
  });
  const signed = await auth.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  const tokenHeader = JSON.parse(Buffer.from(signed.data.session.access_token.split('.')[0], 'base64url'));
  const authTimes = [];
  for (const method of ['getUser','getClaims','getClaims']) {
    authRequests = 0;
    const started = performance.now();
    const result = await auth.auth[method]();
    if (result.error) throw result.error;
    authTimes.push({ method, milliseconds: Math.round(performance.now() - started), requests: authRequests });
  }
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies(Array.from(jar.values()).map(c => ({ name: c.name, value: c.value, domain: new URL(url).hostname, path: '/', httpOnly: false, sameSite: 'Lax' })));
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000);
  const routes = [['Dashboard','/admin/dashboard'],['Students','/admin/students'],['Examinations','/admin/examinations']];
  // Warm each route once; do not confuse on-demand compilation with query latency.
  for (const [, route] of routes) { await page.goto(url + route); await page.locator('main h2').waitFor(); }
  const measurements = [];
  for (let pass = 0; pass < 3; pass++) {
    for (const [name, route] of routes) {
      // Hard refresh the origin page to clear the client router cache consistently.
      await page.goto(url + '/admin/subjects');
      await page.getByRole('heading', { name: 'Subjects', exact: true, level: 2 }).waitFor();
      const started = performance.now();
      await page.getByRole('navigation', { name: 'Admin navigation' }).first().getByRole('link', { name, exact: true }).click();
      await page.waitForURL('**' + route);
      await page.locator('main h2').filter({ hasText: new RegExp('^' + name + '$') }).waitFor();
      measurements.push({ route, milliseconds: Math.round(performance.now() - started) });
    }
  }
  const output = { label, tokenAlgorithm: tokenHeader.alg, authTimes, measurements };
  fs.mkdirSync('node_modules/.cache/prepx-performance', { recursive: true });
  fs.writeFileSync('node_modules/.cache/prepx-performance/' + label + '.json', JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output, null, 2));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) { console.error('Temporary benchmark user cleanup failed'); process.exitCode = 1; }
  }
});

