// Live provider verification. Uses one random, non-user key with a short TTL,
// never prints credentials/provider responses, and removes the key on exit.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());
const { load } = require('./test-result-search.cjs');
const { UpstashRateLimitStore } = load('src/lib/rate-limit/upstash-store.ts');

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const limit = 7;
const attempts = 20;
const windowSeconds = 30;
const key = `prepx:provider-verification:${randomBytes(16).toString('hex')}`;
const pairKey = `prepx:provider-verification:${randomBytes(16).toString('hex')}`;
const pairIdentifierKey = `prepx:provider-verification:${randomBytes(16).toString('hex')}`;

function requireSafeConfiguration() {
  assert(url && token, 'Live Upstash credentials are not configured.');
  const endpoint = new URL(url);
  assert.equal(endpoint.protocol, 'https:', 'Upstash endpoint must use HTTPS.');
  assert(endpoint.hostname === 'upstash.io' || endpoint.hostname.endsWith('.upstash.io'), 'Expected an Upstash REST endpoint.');
}

async function removeVerificationKey() {
  if (!url || !token) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['DEL', key, pairKey, pairIdentifierKey]),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // The key still expires automatically after the bounded test window.
  }
}

async function main() {
  requireSafeConfiguration();
  const stores = Array.from({ length: attempts }, () => new UpstashRateLimitStore(url, token, 2000));
  const results = await Promise.all(stores.map(store => store.check({ key, limit, windowSeconds })));
  assert.equal(results.filter(result => result.allowed).length, limit);
  assert.equal(results.filter(result => !result.allowed).length, attempts - limit);
  assert(results.every(result => result.limit === limit));
  assert(results.every(result => result.remaining >= 0 && result.remaining < limit));
  assert.equal(new Set(results.map(result => result.resetAt)).size, 1, 'All clients must share one reset window.');

  const independentClient = new UpstashRateLimitStore(url, token, 2000);
  const blocked = await independentClient.check({ key, limit, windowSeconds });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.resetAt, results[0].resetAt);

  const pairLimit = 4;
  const pairIdentifierLimit = 6;
  const pairResults = await Promise.all(
    Array.from({ length: attempts }, () =>
      new UpstashRateLimitStore(url, token, 2000).checkPair(
        { key: pairKey, limit: pairLimit, windowSeconds },
        { key: pairIdentifierKey, limit: pairIdentifierLimit, windowSeconds }
      )
    )
  );
  const firstResults = pairResults.map(([first]) => first);
  const secondResults = pairResults.map(([, second]) => second);
  assert.equal(firstResults.filter((result) => result.allowed).length, pairLimit);
  assert.equal(firstResults.filter((result) => !result.allowed).length, attempts - pairLimit);
  assert.equal(secondResults.filter(Boolean).length, pairLimit);
  assert(secondResults.filter(Boolean).every((result) => result.allowed));
  assert.equal(
    new Set(firstResults.map((result) => result.resetAt)).size,
    1,
    'Paired clients must share one first-bucket reset window.'
  );
  console.log(`PASS: ${attempts + 1} single and ${attempts} paired clients shared atomic Upstash quotas; cleanup was requested.`);
}

main()
  .catch(() => {
    console.error('FAIL: live Upstash shared-quota verification failed; no credentials or provider response were logged.');
    process.exitCode = 1;
  })
  .finally(removeVerificationKey);
