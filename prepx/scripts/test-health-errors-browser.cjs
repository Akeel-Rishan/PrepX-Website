// Optional browser smoke test using the installed Edge browser through Playwright.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3014';
let stage = 'launch';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

    stage = '404 navigation';
    await page.goto(base + '/phase-14-missing-page');
    await page.getByRole('heading', { name: 'Page not found', exact: true }).waitFor();
    const returnHome = page.getByRole('link', { name: /Return home/ });
    await returnHome.waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

    await returnHome.click();
    stage = 'return home';
    await page.waitForURL(base + '/');
    await page.locator('#result-search-heading').waitFor();

    // Inject only into the browser's existing React boundary state; no source or routes are changed.
    stage = 'hydration';
    await page.waitForFunction(() => {
      const element = document.querySelector('#result-search-heading');
      return Boolean(element && Object.keys(element).some((key) => key.startsWith('__reactFiber')));
    });
    const injected = await page.evaluate(() => {
      const element = document.querySelector('#result-search-heading');
      if (!element) return false;
      const fiberKey = Object.keys(element).find((key) => key.startsWith('__reactFiber'));
      let fiber = fiberKey ? element[fiberKey] : null;
      while (fiber) {
        const instance = fiber.stateNode;
        if (
          instance?.state &&
          Object.hasOwn(instance.state, 'error') &&
          typeof instance.reset === 'function'
        ) {
          instance.setState({
            error: Object.assign(new Error('PRIVATE_SENTINEL'), { digest: 'PRIVATE_DIGEST' }),
          });
          return true;
        }
        fiber = fiber.return;
      }
      return false;
    });
    assert(injected);

    stage = 'boundary rendering';
    await page.getByRole('heading', { name: 'Something went wrong', exact: true }).waitFor();
    assert(!(await page.locator('body').innerText()).includes('PRIVATE_'));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

    const retry = page.getByRole('button', { name: 'Try again', exact: true });
    await retry.focus();
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Try again');
    await retry.press('Enter');
    stage = 'keyboard retry';
    await page.locator('#result-search-heading').waitFor();

    console.log(
      'PASS: Edge mobile 404, home navigation, simulated public boundary, private-error exclusion and keyboard retry recovery.'
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(`FAIL: browser error smoke check at ${stage} (${error.message}).`);
  process.exitCode = 1;
});
