const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { load, harness, search, valid } = require('./test-result-search.cjs');
const { MemoryRateLimitStore } = load('src/lib/rate-limit/memory-store.ts');
const { UpstashRateLimitStore, RATE_LIMIT_SCRIPT } = load('src/lib/rate-limit/upstash-store.ts');
const { readRateLimitConfig } = load('src/lib/rate-limit/config.ts');
const { createResultSearchLimiter } = load('src/lib/rate-limit/result-search.ts');
const { identifierRateLimitKey, ipRateLimitKey, normalizeClientIp, resolveClientIp } = load('src/lib/rate-limit/keys.ts');
const { readSearchBody } = load('src/lib/rate-limit/request-body.ts');
const secret = 'test-only-secret-with-at-least-32-characters';
const baseConfig = readRateLimitConfig({ NODE_ENV: 'test', RATE_LIMIT_HASH_SECRET: secret });
const productionEnv = { NODE_ENV: 'production', RATE_LIMIT_HASH_SECRET: secret, UPSTASH_REDIS_REST_URL: 'https://test.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'test-only-token' };
const nic = '200312345678';
const ip = '192.0.2.10';
const bodyWithNic = { examinationId: valid.examinationId, nicNumber: nic };
let now = 1700000000000;
const clock = () => now;
function route(options = {}, overrides = {}, store = new MemoryRateLimitStore(clock)) {
  return harness({ ...options, limiter: createResultSearchLimiter({ ...baseConfig, ...overrides }, store, clock) });
}

async function main() {
  const memory = new MemoryRateLimitStore(clock);
  const input = { key: 'test', limit: 2, windowSeconds: 5 };
  assert.deepEqual(await memory.check(input), { allowed: true, limit: 2, remaining: 1, resetAt: 1700000005 });
  assert.equal((await memory.check(input)).remaining, 0);
  assert.equal((await memory.check(input)).allowed, false);
  now += 4999;
  assert.equal((await memory.check(input)).allowed, false);
  now += 1;
  assert.equal((await memory.check(input)).remaining, 1);
  const concurrent = new MemoryRateLimitStore(clock);
  const outcomes = await Promise.all(Array.from({ length: 60 }, () => concurrent.check({ ...input, limit: 20 })));
  assert.equal(outcomes.filter(result => result.allowed).length, 20);
  const bounded = new MemoryRateLimitStore(clock, 1);
  await bounded.check(input);
  await assert.rejects(() => bounded.check({ ...input, key: 'another' }));
  now += 5000;
  assert((await bounded.check({ ...input, key: 'another' })).allowed);
  console.log('PASS 1: exact quota, concurrent attempts, non-sliding expiry, boundary reset and bounded memory without eviction bypass.');

  const nicKey = identifierRateLimitKey(bodyWithNic, secret);
  assert.equal(nicKey, 'results:v1:identifier:nic:' + createHmac('sha256', secret).update('nic\0' + nic).digest('hex'));
  assert(!nicKey.includes(nic));
  assert(!ipRateLimitKey(ip, secret).includes(ip));
  assert.equal(identifierRateLimitKey({ nicNumber: ' 991234567v ' }, secret), identifierRateLimitKey({ nicNumber: '991234567V' }, secret));
  assert.equal(identifierRateLimitKey({ indexNumber: ' ol2026001 ' }, secret), identifierRateLimitKey(valid, secret));
  assert.equal(identifierRateLimitKey({ ...valid, nicNumber: nic }, secret), identifierRateLimitKey(valid, secret));
  assert.notEqual(identifierRateLimitKey({ indexNumber: nic }, secret), nicKey);
  assert.notEqual(identifierRateLimitKey(bodyWithNic, secret + '!'), nicKey);
  assert(identifierRateLimitKey({ nicNumber: 'NOT-A-VALID-NIC' }, secret));
  for (const value of [null, [], {}, { indexNumber: 123 }, { nicNumber: ' ' }]) assert.equal(identifierRateLimitKey(value, secret), null);
  for (const value of ['2001:DB8::1', '2001:0db8:0000:0000:0000:0000:0000:0001', '[2001:db8::1]']) assert.equal(normalizeClientIp(value), '2001:db8::1');
  for (const value of ['::ffff:192.0.2.10', '::FFFF:c000:020a', ip]) assert.equal(normalizeClientIp(value), ip);
  for (const value of ['1.2.3.999', '192.0.2.1:80', 'fe80::1%test', 'spoof, 192.0.2.1', '']) assert.equal(normalizeClientIp(value), null);
  console.log('PASS 2: HMAC-only keys, index/NIC separation, shared normalization, invalid-string fingerprints and IPv4/IPv6 canonicalization.');

  const spoofed = new Headers({ 'x-forwarded-for': '203.0.113.10', 'x-real-ip': '203.0.113.11', 'x-vercel-forwarded-for': ip });
  assert.equal(resolveClientIp(spoofed, baseConfig), 'local');
  assert.equal(resolveClientIp(spoofed, { ...baseConfig, production: true }), 'unknown');
  const vercel = readRateLimitConfig({ ...productionEnv, VERCEL: '1' });
  assert.equal(resolveClientIp(spoofed, vercel), ip);
  assert.equal(resolveClientIp(new Headers({ 'x-forwarded-for': ip }), vercel), ip);
  assert.equal(resolveClientIp(new Headers({ 'x-real-ip': ip }), vercel), ip);
  assert.equal(resolveClientIp(new Headers({ 'x-vercel-forwarded-for': 'bad', 'x-real-ip': ip }), vercel), 'unknown');
  const forwarded = { ...baseConfig, proxy: 'forwarded' };
  assert.equal(resolveClientIp(new Headers({ 'x-forwarded-for': 'attacker-spoof, ' + ip }), forwarded), ip);
  assert.equal(resolveClientIp(new Headers({ 'x-forwarded-for': `attacker-spoof, ${ip}, 10.0.0.1` }), { ...forwarded, trustedProxyHops: 2 }), ip);
  assert.equal(resolveClientIp(new Headers({ 'x-forwarded-for': ip }), { ...forwarded, trustedProxyHops: 2 }), 'unknown');
  assert.equal(resolveClientIp(new Headers({ 'x-real-ip': ip }), forwarded), ip);
  assert.equal(resolveClientIp(new Headers(), vercel), 'unknown');
  console.log('PASS 3: forwarded headers ignored by default; verified Vercel boundary and explicit right-to-left proxy hop selection.');

  assert.equal(readRateLimitConfig({ NODE_ENV: 'test' }).provider, 'memory');
  assert.equal(readRateLimitConfig(productionEnv).provider, 'upstash');
  for (const env of [
    { NODE_ENV: 'production' },
    { ...productionEnv, RATE_LIMIT_HASH_SECRET: 'short' },
    { ...productionEnv, UPSTASH_REDIS_REST_TOKEN: '' },
    { ...productionEnv, UPSTASH_REDIS_REST_URL: 'http://test.upstash.io' },
    { ...productionEnv, UPSTASH_REDIS_REST_URL: 'https://test.upstash.io/?token=secret' },
    { ...productionEnv, RESULT_SEARCH_RATE_LIMIT_PROVIDER: 'memory' },
    { NODE_ENV: 'development', VERCEL: '1' },
    { NODE_ENV: 'test', RESULT_SEARCH_TRUSTED_PROXY: 'vercel' },
    { NODE_ENV: 'test', RESULT_SEARCH_TRUSTED_PROXY: 'anything' },
    { NODE_ENV: 'test', RESULT_SEARCH_RATE_LIMIT_FAILURE_MODE: 'anything' },
    ...['0', '-1', '1.5', '1e3', 'NaN', '100001'].map(value => ({ NODE_ENV: 'test', RESULT_SEARCH_RATE_LIMIT: value })),
  ]) assert.throws(() => readRateLimitConfig(env), /Invalid rate-limit configuration/);
  const custom = readRateLimitConfig({ NODE_ENV: 'test', RESULT_SEARCH_RATE_LIMIT: '2', RESULT_SEARCH_IDENTIFIER_LIMIT: '3', RESULT_SEARCH_RATE_WINDOW_SECONDS: '4', RESULT_SEARCH_IDENTIFIER_WINDOW_SECONDS: '5' });
  assert.equal(custom.ipLimit, 2); assert.equal(custom.identifierLimit, 3); assert.equal(custom.ipWindowSeconds, 4); assert.equal(custom.identifierWindowSeconds, 5);
  console.log('PASS 4: safe defaults, explicit configuration validation and production memory/credential safeguards.');

  const invalid = route({}, { ipLimit: 2, ipWindowSeconds: 5 });
  assert.equal((await search(invalid, '{')).status, 400);
  assert.equal((await search(invalid, {})).status, 400);
  const blocked = await search(invalid, valid);
  assert.equal(blocked.status, 429);
  assert.deepEqual(blocked.body, { error: 'RATE_LIMITED', message: 'Too many search attempts. Please try again later.' });
  assert.equal(blocked.headers.get('retry-after'), '5');
  assert.equal(blocked.headers.get('x-ratelimit-limit'), '2');
  assert.equal(blocked.headers.get('x-ratelimit-remaining'), '0');
  assert.equal(Number(blocked.headers.get('x-ratelimit-reset')), Math.ceil(now / 1000) + 5);
  assert(blocked.headers.get('cache-control').includes('no-store'));
  assert.equal(invalid.clientCount(), 0);
  now += 5000;
  assert.equal((await search(invalid, valid)).status, 200);
  const oversized = route({}, { ipLimit: 1 });
  assert.equal((await search(oversized, JSON.stringify({ indexNumber: 'X'.repeat(9000) }))).status, 400);
  assert.equal((await search(oversized, valid)).status, 429);
  assert.equal(oversized.clientCount(), 0);
  const invalidIdentifier = route({}, { identifierLimit: 1, ipLimit: 100, proxy: 'forwarded' });
  assert.equal((await search(invalidIdentifier, { ...valid, indexNumber: undefined, nicNumber: 'bad-nic' }, { 'x-real-ip': ip })).status, 400);
  assert.equal((await search(invalidIdentifier, { ...valid, indexNumber: undefined, nicNumber: ' BAD-NIC ' }, { 'x-real-ip': '192.0.2.11' })).status, 429);
  console.log('PASS 5: malformed/invalid/oversized input consumes quotas, blocked valid requests reveal no validity, correct 429/retry/reset/no-store headers and no DB work before limits.');

  for (const [options, expected] of [[{}, 200], [{ missingStudent: true }, 404], [{ status: 'DRAFT' }, 403], [{ errorTable: 'examinations' }, 500]]) {
    const h = route(options, { ipLimit: 2, identifierLimit: 100 });
    for (let count = 0; count < 2; count++) {
      const response = await search(h);
      assert.equal(response.status, expected);
      assert.equal(response.headers.get('x-ratelimit-remaining'), String(1 - count));
    }
    const before = h.clientCount();
    assert.equal((await search(h)).status, 429);
    assert.equal(h.clientCount(), before);
  }
  const sharedStore = new MemoryRateLimitStore(clock);
  const sharedConfig = { ipLimit: 100, identifierLimit: 2, proxy: 'forwarded' };
  const instance1 = route({}, sharedConfig, sharedStore);
  const instance2 = route({}, sharedConfig, sharedStore);
  assert.equal((await search(instance1, valid, { 'x-real-ip': ip })).status, 200);
  assert.equal((await search(instance2, { ...valid, indexNumber: ' ol2026001 ' }, { 'x-real-ip': '192.0.2.11' })).status, 200);
  assert.equal((await search(instance1, valid, { 'x-real-ip': '192.0.2.12' })).status, 429);
  assert.equal((await search(instance1, { ...valid, indexNumber: 'OTHER' }, { 'x-real-ip': '192.0.2.12' })).status, 200);
  const ipv6 = route({}, { ipLimit: 1, proxy: 'forwarded' });
  assert.equal((await search(ipv6, {}, { 'x-real-ip': '2001:0db8:0:0:0:0:0:1' })).status, 400);
  assert.equal((await search(ipv6, valid, { 'x-real-ip': '2001:DB8::1' })).status, 429);
  console.log('PASS 6: success/404/unpublished/DB errors all count; identifier buckets span IPs/instances; equivalent IPv6 shares an IP bucket.');

  const captured = [];
  const upstream = new UpstashRateLimitStore('https://test.upstash.io', 'PRIVATE_TOKEN', 100, async (url, options) => {
    captured.push({ url, options });
    return new Response(JSON.stringify({ result: [2, 1700000999] }));
  });
  assert.deepEqual(await upstream.check({ ...input, key: nicKey }), { allowed: true, limit: 2, remaining: 0, resetAt: 1700000999 });
  const sent = captured[0];
  assert.equal(sent.options.cache, 'no-store'); assert.equal(sent.options.redirect, 'error');
  assert.equal(sent.options.headers.Authorization, 'Bearer PRIVATE_TOKEN');
  assert.deepEqual(JSON.parse(sent.options.body), ['EVAL', RATE_LIMIT_SCRIPT, 1, nicKey, 2, 5]);
  assert(!sent.options.body.includes(nic));
  assert(!sent.url.includes('PRIVATE_TOKEN'));
  for (const payload of [{ error: 'PRIVATE_PROVIDER_ERROR' }, { error: 'PRIVATE_PROVIDER_ERROR', result: [1, 1700000999] }, { result: [] }, { result: [0, 1] }, { result: ['2', 1] }, { result: [3, -1] }, { result: [999, 1] }]) {
    const store = new UpstashRateLimitStore('https://test.upstash.io', 'PRIVATE_TOKEN', 100, async () => Response.json(payload));
    await assert.rejects(() => store.check(input), error => error.message === 'Rate-limit store unavailable.');
  }
  const deniedStore = new UpstashRateLimitStore('https://test.upstash.io', 'PRIVATE_TOKEN', 100, async () => Response.json({ result: [3, 1700000999] }));
  assert.equal((await deniedStore.check(input)).allowed, false);
  let attempts = 0;
  const unavailable = new UpstashRateLimitStore('https://test.upstash.io', 'PRIVATE_TOKEN', 100, async () => { attempts++; return new Response('PRIVATE_PROVIDER_ERROR', { status: 503 }); });
  await assert.rejects(() => unavailable.check(input)); assert.equal(attempts, 1);
  const timeout = new UpstashRateLimitStore('https://test.upstash.io', 'PRIVATE_TOKEN', 5, (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('PRIVATE_TIMEOUT')))));
  await assert.rejects(() => timeout.check(input), /Rate-limit store unavailable/);
  console.log('PASS 7: Upstash atomic EVAL transport, secret-only Authorization, digest-only payloads, response validation, no retries and bounded timeout.');

  const logs = [];
  const oldError = console.error; const oldWarn = console.warn; const oldLog = console.log;
  console.error = console.warn = console.log = (...args) => logs.push(args.join(' '));
  try {
    const failingStore = { check: async () => { throw new Error(`PRIVATE_PROVIDER_ERROR ${nic} ${ip} ${valid.indexNumber} PRIVATE_TOKEN`); } };
    const closed = route({}, {}, failingStore);
    const failure = await search(closed);
    assert.equal(failure.status, 500); assert.equal(closed.clientCount(), 0);
    assert.deepEqual(failure.body, { error: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
    const open = route({}, { failureMode: 'open' }, failingStore);
    const degraded = await search(open);
    assert.equal(degraded.status, 200); assert.equal(degraded.headers.get('x-ratelimit-limit'), null);
    const entry = load('src/lib/rate-limit.ts', {
      '@/lib/rate-limit/config': { readRateLimitConfig: () => readRateLimitConfig({ NODE_ENV: 'production', RESULT_SEARCH_RATE_LIMIT_FAILURE_MODE: 'open' }) },
    });
    const invalidConfig = harness({ limiter: entry.checkResultSearchRateLimit });
    assert.equal((await search(invalidConfig)).status, 500); assert.equal(invalidConfig.clientCount(), 0);
    let calls = 0;
    const partial = { check: async input => { calls++; if (calls === 2) throw new Error(nic); return { allowed: true, limit: input.limit, remaining: input.limit - 1, resetAt: 1700000999 }; } };
    const partialRoute = route({}, {}, partial);
    assert.equal((await search(partialRoute)).status, 500); assert.equal(partialRoute.clientCount(), 0); assert.equal(calls, 2);
    await search(route());
    for (const sensitive of [nic, ip, valid.indexNumber, 'PRIVATE_PROVIDER_ERROR', 'PRIVATE_TOKEN']) {
      assert(!JSON.stringify(logs).includes(sensitive));
      assert(!JSON.stringify(failure.body).includes(sensitive));
      assert(!JSON.stringify(blocked.body).includes(sensitive));
    }
    assert(logs.some(line => line.includes('emergency fail-open')));
  } finally { console.error = oldError; console.warn = oldWarn; console.log = oldLog; }
  console.log('PASS 8: fail-closed default, explicit/logged fail-open, configuration always fail-closed, partial failure stops DB access, no raw IP/NIC/identifier/provider errors logged or returned.');

  const broken = new Request('http://localhost/', { method: 'POST', body: new ReadableStream({ start(controller) { controller.error(new Error('bad upload')); } }), duplex: 'half' });
  assert.equal(await readSearchBody(broken), null);
  let cancelled = false;
  const stalled = new Request('http://localhost/', { method: 'POST', body: new ReadableStream({ cancel() { cancelled = true; } }), duplex: 'half' });
  assert.equal(await readSearchBody(stalled, 5), null);
  assert.equal(cancelled, true);
  console.log('All rate-limit checks passed without a live Redis dependency.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
