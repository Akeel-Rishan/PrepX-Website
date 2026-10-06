// Requires a running app with the existing published seed examination and Edge.
// API edge cases are intercepted here only; production has no test data path.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fixture = require('./fixtures/public-result.cjs');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    let body = fixture;
    let responseStatus = 200;
    let requests = 0;
    let release;
    let delay = false;
    await page.route('**/api/results/search', async route => {
      requests++;
      assert.equal(route.request().method(), 'POST');
      assert.equal(new URL(route.request().url()).search, '');
      if (delay) await new Promise(resolve => { release = resolve; });
      await route.fulfill({ status: responseStatus, json: body });
    });
    async function search() {
      await page.goto(base);
      await page.locator('#indexNumber').fill(fixture.indexNumber);
      await page.getByRole('button', { name: 'Search My Results' }).click();
    }
    // Legacy persisted data is discarded, never restored.
    await page.goto(base + '/results');
    await page.getByRole('heading', { name: 'Search for your result' }).waitFor();
    await page.evaluate(() => sessionStorage.setItem('prepx_result', 'legacy-result'));
    await page.reload();
    await page.getByRole('heading', { name: 'Search for your result' }).waitFor();
    assert.equal(await page.evaluate(() => sessionStorage.getItem('prepx_result')), null);
    delay = true;
    await search();
    await page.waitForFunction(() => document.querySelector('button[type="submit"]')?.disabled);
    await page.locator('form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
    await page.waitForTimeout(150);
    assert.equal(requests, 1);
    release();
    delay = false;
    await page.waitForURL(base + '/results');
    await page.getByText(fixture.studentName, { exact: true }).waitFor();
    assert.equal(new URL(page.url()).search, '');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('prepx_result')), null);
    assert.equal(await page.evaluate(() => localStorage.getItem('prepx_result')), null);
    assert(!(await page.locator('body').innerText()).includes('200312345678'));
    assert.equal(await page.locator('tbody tr').count(), 8);
    assert.equal(await page.getByRole('columnheader').count(), 3);
    assert.equal(await page.getByRole('rowheader').count(), 8);
    for (const dark of [false, true]) {
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
      for (const width of [320, 375, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}`);
        assert(await page.getByRole('button', { name: 'Print Result' }).isVisible());
        if (process.env.PREPX_SCREENSHOT_DIR && [375, 1280].includes(width)) {
          await page.screenshot({ path: require('node:path').join(process.env.PREPX_SCREENSHOT_DIR, `prepx-result-${dark ? 'dark' : 'light'}-${width}.png`), fullPage: true });
        }
      }
    }
    await page.getByRole('button', { name: 'Print Result' }).focus();
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Print Result');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Download PDF');
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), 'none');
    await page.getByRole('link', { name: 'Search Again' }).click();
    await page.waitForURL(base + '/');
    await page.goBack();
    await page.getByRole('heading', { name: 'Search for your result' }).waitFor();
    for (const overallStatus of ['Passed', 'Not Passed', 'Absent', 'Incomplete']) {
      body = { ...fixture, overallStatus, examinationCenter: 'Centre A' };
      await search();
      await page.waitForURL(base + '/results');
      await page.getByLabel(`Overall result: ${overallStatus}`, { exact: true }).waitFor();
      assert(await page.getByText('Centre A', { exact: true }).isVisible());
    }
    await page.reload();
    await page.getByRole('heading', { name: 'Search for your result' }).waitFor();
    for (const [code, status, route, title] of [
      ['NOT_FOUND', 404, '/results/not-found', 'Result Not Found'],
      ['NOT_PUBLISHED', 403, '/results/not-published', 'Results Not Yet Published'],
    ]) {
      body = { error: code, message: 'PRIVATE INTERNAL ERROR' }; responseStatus = status;
      await search();
      await page.waitForURL(base + route);
      assert(await page.getByRole('heading', { name: title, exact: true }).isVisible());
      assert(!(await page.locator('body').innerText()).includes('PRIVATE INTERNAL ERROR'));
    }
    for (const [payload, status] of [[{ error: 'SERVER_ERROR', message: 'PRIVATE INTERNAL ERROR' }, 500], [{}, 200], [{ ...fixture, maskedNic: '200312345678' }, 200]]) {
      body = payload; responseStatus = status;
      await search();
      await page.locator('#search-error').waitFor();
      assert.equal(await page.locator('#search-error').innerText(), 'Something went wrong. Please try again.');
      assert.equal(await page.getByRole('button', { name: 'Search My Results' }).isDisabled(), false);
    }
    console.log('PASS: search handoff without persistence, legacy cleanup, duplicate-submit guard, statuses, center, error routes, generic errors, refresh/back behavior, 320/375/768/1280 layouts, table semantics and keyboard focus.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
