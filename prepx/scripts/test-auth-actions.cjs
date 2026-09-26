const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file, overrides = {}) {
  const filename = path.resolve(file);
  const moduleUnderTest = new Module(filename, module);
  moduleUnderTest.filename = filename;
  moduleUnderTest.paths = module.paths;
  moduleUnderTest.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, overrides);
    return require(name);
  };
  moduleUnderTest._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return moduleUnderTest.exports;
}

function form(email = 'admin@example.com', password = 'secret-password') {
  const data = new FormData();
  data.set('email', email);
  data.set('password', password);
  data.set('redirectTo', '/admin/students');
  return data;
}

function harness(responses, { profile = true } = {}) {
  let calls = 0;
  const session = {
    auth: {
      async signInWithPassword() {
        return responses[Math.min(calls++, responses.length - 1)];
      },
      async signOut() {},
    },
  };
  const admin = {
    from() {
      const query = {
        select() { return query; },
        eq() { return query; },
        async single() { return { data: profile ? { id: 'profile-id' } : null, error: null }; },
      };
      return query;
    },
  };
  const actions = load('src/lib/actions/auth.ts', {
    '@/lib/supabase/server': { createClient: async () => session, createAdminClient: () => admin },
    '@supabase/supabase-js': { isAuthRetryableFetchError: error => error?.retryable === true },
    'next/navigation': { redirect(destination) { throw Object.assign(new Error('REDIRECT'), { destination }); } },
  });
  return { ...actions, calls: () => calls };
}

async function main() {
  const retryable = { retryable: true, status: 0 };
  const success = { data: { user: { id: 'admin-id' } }, error: null };

  const recovered = harness([{ data: { user: null }, error: retryable }, success]);
  await assert.rejects(
    recovered.loginAction({}, form()),
    error => error.destination === '/admin/students'
  );
  assert.equal(recovered.calls(), 2);

  const unavailable = harness([{ data: { user: null }, error: retryable }]);
  assert.match((await unavailable.loginAction({}, form())).error, /authentication service/i);
  assert.equal(unavailable.calls(), 2);

  const invalid = harness([{ data: { user: null }, error: { status: 400 } }]);
  assert.equal((await invalid.loginAction({}, form())).error, 'Invalid email or password.');
  assert.equal(invalid.calls(), 1);

  console.log('PASS: login retries transient Auth failures once and distinguishes network failures from invalid credentials.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
