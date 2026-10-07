// Requires a running app, its existing published examination, Edge and playwright-core.
// Result API responses are fixtures here; real rate limiting is tested separately.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fixture = require('./fixtures/public-result.cjs');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3003';
let stage = 'launch';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', () => errors.push('pageerror'));
    page.on('console', message => {
      if (message.type() === 'error' && /hydrat|server rendered HTML/i.test(message.text())) errors.push('hydration');
    });
    await page.addInitScript(() => {
      window.__securityViolations = [];
      addEventListener('securitypolicyviolation', event => window.__securityViolations.push(event.effectiveDirective));
    });
    async function checkPage(pathname) {
      stage = 'page ' + pathname;
      const response = await page.goto(base + pathname);
      const headers = response.headers();
      assert.equal(headers['x-content-type-options'], 'nosniff');
      assert.equal(headers['x-frame-options'], 'DENY');
      assert.equal(headers['referrer-policy'], 'strict-origin-when-cross-origin');
      assert.equal(headers['permissions-policy'], 'camera=(), microphone=(), geolocation=()');
      assert(headers['cache-control'].includes('no-store'));
      assert.equal(headers['strict-transport-security'], undefined, 'Local HTTP has no HSTS opt-in');
      if (pathname !== '/') assert.equal(headers['x-robots-tag'], 'noindex, nofollow, noarchive');
      const csp = headers['content-security-policy'];
      if (process.env.TEST_DEVELOPMENT !== 'true') assert(!csp.includes('unsafe-eval'));
      const nonce = /'nonce-([^']+)'/.exec(csp)[1];
      assert(await page.locator('script').evaluateAll((scripts, nonce) => scripts.filter(script => !script.src && script.textContent.trim()).every(script => script.nonce === nonce), nonce));
      await page.evaluate(() => document.fonts.ready);
      assert.deepEqual(await page.evaluate(() => window.__securityViolations), []);
      return nonce;
    }
    const first = await checkPage('/');
    await page.locator('#indexNumber').waitFor();
    const second = await checkPage('/');
    assert.notEqual(first, second);
    // Inject into the response, not DevTools evaluate (which bypasses CSP).
    await page.route(base + '/', async route => {
      const response = await route.fetch();
      const html = (await response.text()).replace('</head>', '<script>window.__injected=true</script></head>');
      await route.fulfill({ response, body: html });
    });
    await page.goto(base);
    assert.equal(await page.evaluate(() => window.__injected), undefined);
    assert((await page.evaluate(() => window.__securityViolations)).includes('script-src-elem'));
    await page.unroute(base + '/');
    await checkPage('/results');
    await page.getByRole('heading', { name: 'Search for your result' }).waitFor();
    await checkPage('/results/not-found');
    await page.getByRole('heading', { name: 'Result Not Found', exact: true }).waitFor();
    await checkPage('/results/not-published');
    await page.getByRole('heading', { name: 'Results Not Yet Published', exact: true }).waitFor();
    await checkPage('/admin/login');
    assert(await page.locator('input[type="password"]').isVisible());
    await page.locator('input[type="password"]').fill('unchanged password ');
    assert.equal(await page.locator('input[type="password"]').inputValue(), 'unchanged password ');
    const protectedResponse = await page.request.get(base + '/admin/students', { maxRedirects: 0 });
    assert.equal(protectedResponse.status(), 307);
    assert(new URL(protectedResponse.headers().location, base).pathname === '/admin/login');
    assert(protectedResponse.headers()['cache-control'].includes('no-store'));
    assert.equal(protectedResponse.headers()['x-robots-tag'], 'noindex, nofollow, noarchive');
    console.log('PASS: actual page/redirect headers, nonce freshness, blocked untrusted script, local HSTS exclusion, fonts and anonymous admin protection.');

    stage = 'result navigation';
    let body = fixture; let status = 200;
    await page.route('**/api/results/search', route => route.fulfill({ status, json: body }));
    for (const [payload, code, target] of [
      [fixture, 200, '/results'],
      [{ error: 'NOT_FOUND' }, 404, '/results/not-found'],
      [{ error: 'NOT_PUBLISHED' }, 403, '/results/not-published'],
    ]) {
      body = payload; status = code;
      await checkPage('/');
      await page.locator('#indexNumber').fill(fixture.indexNumber);
      await page.getByRole('button', { name: 'Search My Results' }).click();
      await page.waitForURL(base + target);
      if (target === '/results') {
        await page.getByRole('button', { name: 'Print / Save as PDF' }).waitFor();
        assert(!(await page.locator('body').innerText()).includes('200312345678'));
      }
      assert.deepEqual(await page.evaluate(() => window.__securityViolations), []);
    }
    const health = await page.request.get(base + '/api/health');
    assert.equal(health.status(), 200);
    assert.equal(health.headers()['x-content-type-options'], 'nosniff');
    assert(health.headers()['cache-control'].includes('no-store'));
    const method = await page.request.patch(base + '/api/results/search');
    assert.equal(method.status(), 405);
    assert.equal(method.headers()['x-frame-options'], 'DENY');
    assert(method.headers()['cache-control'].includes('no-store'));
    assert.deepEqual(errors, []);
    console.log('PASS: CSP-compatible hydration, search/result/error navigation, print action, masking and API headers; no unexpected CSP or page errors.');
  } finally { await browser.close(); }
})().catch(error => {
  const location = /test-security-browser\.cjs:\d+:\d+/.exec(error.stack ?? '')?.[0] ?? error.name;
  console.error(`FAIL: browser security check at ${stage} (${location}); no private response or credential data logged.`);
  process.exitCode = 1;
});
