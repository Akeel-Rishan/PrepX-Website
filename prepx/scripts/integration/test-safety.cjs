const assert = require('node:assert/strict');
const { validate } = require('./config.cjs');
const jwt = (role) =>
  'fake.' +
  Buffer.from(JSON.stringify({ iss: 'supabase-demo', role })).toString('base64url') +
  '.fake';
const good = {
  PREPX_TEST_CONFIRM: 'LOCAL_TEST_DATABASE_ONLY',
  PREPX_TEST_SUPABASE_URL: 'http://127.0.0.1:55321',
  PREPX_TEST_ANON_KEY: jwt('anon'),
  PREPX_TEST_SERVICE_ROLE_KEY: jwt('service_role'),
};
assert.equal(validate(good).url, good.PREPX_TEST_SUPABASE_URL);
for (const url of [
  'https://production.supabase.co',
  'http://127.0.0.1:54321',
  'http://localhost:55321',
  'http://127.0.0.1:55321/path',
  'http://user:pass@127.0.0.1:55321',
])
  assert.throws(() => validate({ ...good, PREPX_TEST_SUPABASE_URL: url }), /safety/);
for (const patch of [
  { PREPX_TEST_CONFIRM: '' },
  { PREPX_TEST_SERVICE_ROLE_KEY: 'sb_secret_fake' },
  { PREPX_TEST_SERVICE_ROLE_KEY: jwt('anon') },
  { PREPX_TEST_ANON_KEY: 'malformed' },
])
  assert.throws(() => validate({ ...good, ...patch }), /safety/);
console.log(
  'PASS: integration configuration rejects hosted/default-local URLs, malformed keys and missing opt-in. No database contacted.'
);

// Exercise the destination/redirect guard without a network connection.
(async () => {
  const { installNetworkGuard } = require('./config.cjs');
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return new Response('{}');
  };
  try {
    const guarded = installNetworkGuard(good.PREPX_TEST_SUPABASE_URL);
    for (const target of [
      'https://production.supabase.co/rest/v1/students',
      'http://127.0.0.1:54321/auth/v1/user',
    ]) {
      await assert.rejects(guarded(target), /blocked/);
    }
    assert.equal(calls.length, 0);
    await guarded(good.PREPX_TEST_SUPABASE_URL + '/rest/v1/examinations');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.redirect, 'error');
    assert(calls[0].init.signal instanceof AbortSignal);
    console.log(
      'PASS: test transport blocks other origins and forces redirect rejection and timeout.'
    );
  } finally {
    globalThis.fetch = previous;
  }
})().catch(() => {
  console.error('FAIL: integration network guard.');
  process.exitCode = 1;
});
