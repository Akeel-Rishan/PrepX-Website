const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const { AuthApiError, AuthRetryableFetchError } = require('@supabase/supabase-js');

function load(file, overrides = {}) {
  const filename = path.resolve(file);
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = module.paths;
  m.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts', overrides);
    return require(name);
  };
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return m.exports;
}

async function check(error, { throws = false, login = false, authenticated = false } = {}) {
  const { middleware } = load('src/middleware.ts', {
    '@supabase/ssr': { createServerClient(_url, _key, options) {
      return {
        auth: { async getClaims() {
          if (throws) throw error;
          if (authenticated) {
            options.cookies.setAll([{ name: 'sb-test-auth-token', value: 'renewed', options: { path: '/' } }], { 'Cache-Control': 'private, no-store' });
          }
          return { data: authenticated ? { claims: { sub: 'user-id' } } : null, error };
        } },
        from() {
          const q = { select() { return q; }, eq() { return q; }, async single() { return { data: { id: 'admin-id' }, error: null }; } };
          return q;
        },
      };
    } },
  });
  const request = new NextRequest('https://app.example/admin/' + (login ? 'login' : 'students?page=2'), {
    headers: { cookie: 'sb-test-auth-token=stale; sb-test-auth-token.0=first; sb-test-auth-token.1=second; theme=dark; sb-other-auth-token=other; sb-test-auth-token-code-verifier=pkce' },
  });
  return { request, response: await middleware(request) };
}

async function main() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'public-test-key';
  for (const code of ['refresh_token_not_found', 'refresh_token_already_used']) {
    for (const throws of [false, true]) {
      for (const login of [false, true]) {
        const { request, response } = await check(new AuthApiError('Invalid refresh token', 400, code), { throws, login });
        assert.equal(response.status, login ? 200 : 307);
        if (!login) {
          const target = new URL(response.headers.get('location'));
          assert.equal(target.pathname, '/admin/login');
          assert.equal(target.searchParams.get('redirectTo'), '/admin/students?page=2');
        }
        for (const name of ['sb-test-auth-token', 'sb-test-auth-token.0', 'sb-test-auth-token.1']) {
          assert.equal(request.cookies.has(name), false);
          assert.equal(response.cookies.get(name).maxAge, 0);
        }
        for (const name of ['theme', 'sb-other-auth-token', 'sb-test-auth-token-code-verifier']) {
          assert.equal(request.cookies.has(name), true);
          assert.equal(response.cookies.has(name), false);
        }
        assert.match(response.headers.get('cache-control'), /no-store/);
      }
    }
  }
  const temporary = await check(new AuthRetryableFetchError('Offline', 503));
  assert.equal(temporary.response.cookies.getAll().length, 0);
  assert.equal(temporary.request.cookies.get('sb-test-auth-token').value, 'stale');
  const valid = await check(null, { authenticated: true });
  assert.equal(valid.response.status, 200);
  assert.equal(valid.response.cookies.get('sb-test-auth-token').value, 'renewed');
  const login = await check(null, { authenticated: true, login: true });
  assert.equal(new URL(login.response.headers.get('location')).pathname, '/admin/dashboard');
  assert.equal(login.response.cookies.get('sb-test-auth-token').value, 'renewed');
  await assert.rejects(check(new Error('Unexpected'), { throws: true }), /Unexpected/);

  let publicConfig;
  const server = load('src/lib/supabase/server.ts', {
    'next/headers': { cookies() { throw new Error('Public client must not read session cookies'); } },
    '@supabase/supabase-js': { createClient(url, key, options) { publicConfig = { url, key, options }; return {}; } },
  });
  server.createPublicClient();
  assert.equal(publicConfig.key, 'public-test-key');
  assert.deepEqual(publicConfig.options.auth, { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false });

  // Exercise the installed SSR SDK as well as the explicit error branches above.
  let refreshCalls = 0;
  const realSsr = require('@supabase/ssr');
  const { middleware } = load('src/middleware.ts', {
    '@supabase/ssr': { createServerClient(url, key, options) {
      return realSsr.createServerClient(url, key, {
        ...options,
        global: { fetch: async () => {
          refreshCalls++;
          return new Response(JSON.stringify({ code: 'refresh_token_not_found', message: 'Invalid Refresh Token: Refresh Token Not Found' }), {
            status: 400, headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' },
          });
        } },
      });
    } },
  });
  const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = {
    access_token: encoded({ alg: 'HS256', typ: 'JWT' }) + '.' + encoded({ sub: 'user-id', exp: 1 }) + '.signature',
    refresh_token: 'missing-test-token', expires_at: 1, expires_in: 3600, token_type: 'bearer', user: { id: 'user-id' },
  };
  const expired = new NextRequest('https://app.example/admin/students', {
    headers: { cookie: 'sb-test-auth-token=base64-' + encoded(session) },
  });
  const sdkErrors = [];
  const originalError = console.error;
  const originalWarn = console.warn;
  let recovered;
  try {
    console.error = error => sdkErrors.push(error);
    console.warn = error => sdkErrors.push(error);
    recovered = await middleware(expired);
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
  assert.ok(sdkErrors.every(error => error.code === 'refresh_token_not_found'));
  assert.equal(recovered.status, 307);
  assert.equal(recovered.cookies.get('sb-test-auth-token').maxAge, 0);
  assert.equal(refreshCalls, 1);
  await middleware(new NextRequest('https://app.example/admin/login'));
  assert.equal(refreshCalls, 1, 'Cleared session must not retry the invalid refresh token');
  console.log('PASS: stale session/chunk cleanup, safe redirects, transient-session preservation, valid refresh and cookie-free public client.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
