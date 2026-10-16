// Requires a production server. Verifies that public routes never mount the
// removed loading placeholders, including while hydration is delayed.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

async function auditPage(browser, { width, height, colorScheme }) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme });
  await context.addInitScript((theme) => {
    localStorage.setItem('prepx-theme', theme);
    window.__prepxInitialRenderAudit = { skeletonSeen: false, layoutShift: 0 };

    const scan = () => {
      if (document.querySelector('.app-skeleton, .result-loading')) {
        window.__prepxInitialRenderAudit.skeletonSeen = true;
      }
    };
    new MutationObserver(scan).observe(document, { childList: true, subtree: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__prepxInitialRenderAudit.layoutShift += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  }, colorScheme);

  const page = await context.newPage();
  await page.route('**/_next/static/chunks/*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto(base, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200);
  const initialHtml = await response.text();
  assert(!initialHtml.includes('app-skeleton'), 'Initial HTML must not contain a skeleton');
  assert(!initialHtml.includes('Preparing PrepX'), 'Initial HTML must not contain the root loader');

  await page
    .getByRole('heading', { name: /Results|Examination Results Portal/ })
    .first()
    .waitFor();
  await page.getByRole('heading', { name: 'Find your result' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);

  const homeAudit = await page.evaluate(() => ({
    ...window.__prepxInitialRenderAudit,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  }));
  assert.equal(homeAudit.skeletonSeen, false, 'Homepage must never mount a skeleton');
  assert.equal(homeAudit.overflow, false, 'Homepage must fit the viewport');
  assert(
    homeAudit.layoutShift < 0.1,
    `Homepage CLS must stay below 0.1, got ${homeAudit.layoutShift}`
  );

  await page.goto(`${base}/results`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Search for your result' }).waitFor();
  await page.waitForTimeout(100);
  const resultAudit = await page.evaluate(() => window.__prepxInitialRenderAudit);
  assert.equal(resultAudit.skeletonSeen, false, 'Direct result route must not mount a skeleton');
  assert.deepEqual(errors, [], 'Public routes must not raise browser runtime errors');

  await context.close();
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    await auditPage(browser, { width: 360, height: 800, colorScheme: 'dark' });
    await auditPage(browser, { width: 768, height: 1024, colorScheme: 'light' });
    await auditPage(browser, { width: 1440, height: 900, colorScheme: 'light' });
    console.log(
      'PASS: public initial HTML, hydration, theme, CLS, overflow, and direct result rendering at phone, tablet, and desktop widths.'
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
