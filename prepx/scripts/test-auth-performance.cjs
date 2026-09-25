// Tests authorization after performance changes with a disposable account.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');
require('@next/env').loadEnvConfig(process.cwd());
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
let id;
async function request(path, cookies = '') { return fetch(baseURL + path, { headers: { Cookie: cookies }, redirect: 'manual' }); }
async function main() {
  assert.equal((await request('/')).status, 200);
  for (const path of ['/admin/students', '/admin/example.json']) {
    const response = await request(path);
    assert.equal(response.status, 307);
    assert.ok(response.headers.get('location').includes('/admin/login'));
  }
  const email = 'prepx-auth-test-' + crypto.randomUUID() + '@example.com';
  const password = crypto.randomBytes(24).toString('base64url') + '!aA1';
  const user = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (user.error) throw user.error;
  id = user.data.user.id;
  const jar = new Map();
  const sessionClient = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: { getAll: () => Array.from(jar.values()), setAll: cookies => cookies.forEach(c => jar.set(c.name, c)) }
  });
  const signed = await sessionClient.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  const cookies = () => Array.from(jar.values()).map(c => c.name + '=' + c.value).join('; ');
  assert.equal((await request('/admin/students', cookies())).status, 307, 'Non-admin must be blocked');
  const added = await admin.from('admin_profiles').insert({ user_id: id });
  if (added.error) throw added.error;
  assert.equal((await request('/admin/students', cookies())).status, 200, 'Admin must be allowed');
  const token = signed.data.session.access_token.split('.');
  const payload = JSON.parse(Buffer.from(token[1], 'base64url'));
  token[1] = Buffer.from(JSON.stringify({ ...payload, sub: crypto.randomUUID() })).toString('base64url');
  const forgedSession = { ...signed.data.session, access_token: token.join('.') };
  const value = 'base64-' + Buffer.from(JSON.stringify(forgedSession)).toString('base64url');
  const base = Array.from(jar.keys())[0].replace(/\.\d+$/, '');
  const pieces = value.match(/.{1,3000}/g);
  const forgedCookies = pieces.map((part, i) => base + (pieces.length > 1 ? '.' + i : '') + '=' + part).join('; ');
  assert.equal((await request('/admin/students', forgedCookies)).status, 307, 'Forged JWT must be blocked');
  const removed = await admin.from('admin_profiles').delete().eq('user_id', id);
  if (removed.error) throw removed.error;
  assert.equal((await request('/admin/students', cookies())).status, 307, 'Revoked admin membership must take effect immediately');
  console.log('PASS: public page, protected routes including extensions, non-admin rejection, valid admin access, forged-token rejection, and immediate admin-role revocation.');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(async () => {
  if (id) { const { error } = await admin.auth.admin.deleteUser(id); if (error) { console.error('Temporary auth test account cleanup failed'); process.exitCode = 1; } }
});
