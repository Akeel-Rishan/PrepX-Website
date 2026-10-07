// Read-only HTTP smoke checks against a running app. No real result identifiers.
const assert = require('node:assert/strict');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3014';
(async () => {
  const health = await fetch(base + '/api/health');
  const body = await health.json();
  assert([200, 503].includes(health.status));
  assert.equal(body.status, health.status === 200 ? 'ok' : 'unavailable');
  assert.deepEqual(Object.keys(body).sort(), ['service', 'status', 'timestamp']);
  assert.equal(body.service, 'prepx');
  assert.equal(health.headers.get('cache-control'), 'no-store, no-cache, must-revalidate');
  assert.equal(health.headers.get('pragma'), 'no-cache');
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) {
    const response = await fetch(base + '/api/health', { method });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET');
    assert.match(response.headers.get('cache-control'), /no-store/);
    if (method !== 'HEAD') assert.equal((await response.json()).error, 'METHOD_NOT_ALLOWED');
    else assert.equal(await response.text(), '');
  }
  for (const [path, title, status] of [['/phase-14-missing-page', 'Page not found', 404],
    ['/results/not-found', 'Result Not Found', 200], ['/results/not-published', 'Results Not Yet Published', 200],
    ['/results', 'Loading result', 200], ['/', 'Examination', 200]]) {
    const response = await fetch(base + path);
    assert.equal(response.status, status);
    assert((await response.text()).includes(title));
    assert.match(response.headers.get('cache-control'), /no-store/);
  }
  const admin = await fetch(base + '/admin/dashboard', { redirect: 'manual' });
  assert.equal(admin.status, 307);
  assert.equal(new URL(admin.headers.get('location'), base).pathname, '/admin/login');
  assert.match(admin.headers.get('cache-control'), /no-store/);
  assert.equal(admin.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  console.log(`PASS: live health (${health.status}), all methods, custom 404, home/result states and anonymous admin protection.`);
})().catch(() => { console.error('FAIL: live smoke check; inspect assertions locally without logging private responses.'); process.exitCode = 1; });
