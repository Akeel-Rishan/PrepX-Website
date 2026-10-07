// Run against a production server with a published seed examination.
// PLAYWRIGHT_MODULE may point to an external playwright-core installation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const fixture = require('./fixtures/public-result.cjs');
const printName = 'Print / Save as PDF';
const artifacts = process.env.PREPX_PRINT_ARTIFACTS;

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let result = {
      ...fixture, examinationCenter: 'Centre A',
      nicNumber: '200312345678', rawMarks: 'PRIVATE_MARKS', total: 'PRIVATE_TOTAL',
      average: 'PRIVATE_AVERAGE', rank: 'PRIVATE_RANK', audit: 'PRIVATE_AUDIT',
      id: 'PRIVATE_ID', metadata: 'PRIVATE_METADATA', serviceRole: 'PRIVATE_CREDENTIAL',
      grades: fixture.grades.map((grade, index) => ({ ...grade, grade: index === 7 ? undefined : grade.grade, score: 'PRIVATE_SCORE' })),
    };
    const secrets = ['200312345678', 'PRIVATE_MARKS', 'PRIVATE_TOTAL', 'PRIVATE_AVERAGE', 'PRIVATE_RANK', 'PRIVATE_AUDIT', 'PRIVATE_ID', 'PRIVATE_METADATA', 'PRIVATE_CREDENTIAL', 'PRIVATE_SCORE'];
    await page.route('**/api/results/search', route => route.fulfill({ json: result }));
    async function search() {
      await page.emulateMedia({ media: 'screen' });
      await page.goto(base);
      await page.locator('#indexNumber').fill(fixture.indexNumber);
      await page.getByRole('button', { name: 'Search My Results' }).click();
      await page.waitForURL(base + '/results');
      await page.getByText(fixture.studentName, { exact: true }).waitFor();
    }
    for (const route of ['/results', '/results/not-found', '/results/not-published']) {
      await page.goto(base + route);
      if (route === '/results') await page.getByRole('heading', { name: 'Search for your result' }).waitFor();
      assert.equal(await page.getByRole('button', { name: printName }).count(), 0);
    }
    await search();
    const printButton = page.getByRole('button', { name: printName, exact: true });
    assert(await printButton.isVisible());
    assert.equal(await printButton.getAttribute('type'), 'button');
    assert.equal(await printButton.getAttribute('aria-describedby'), 'print-result-help');
    assert.equal(await page.locator('.print-doc-header').isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'Download PDF' }).count(), 0);
    await page.evaluate(() => {
      window.printCalls = 0;
      window.print = () => {
        window.printCalls++;
        window.dispatchEvent(new Event('beforeprint'));
        window.dispatchEvent(new Event('afterprint'));
      };
    });
    await printButton.click();
    assert.equal(await page.evaluate(() => window.printCalls), 1);
    await printButton.focus();
    assert.notEqual(await printButton.evaluate(el => getComputedStyle(el).boxShadow), 'none');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => window.printCalls), 2);

    for (const dark of [false, true]) {
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
      for (const width of [320, 375, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const box = await printButton.boundingBox();
        assert(box && box.height >= 44 && box.width <= width);
      }
      await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
      assert(await page.locator('.print-doc-header').isVisible());
      assert.match(await page.locator('#print-date-stamp').innerText(), /^Printed: /);
      assert(await page.getByText('Organized by UGSM', { exact: true }).isVisible());
      assert(await page.getByText('Centre A', { exact: true }).isVisible());
      for (const element of await page.locator('.no-print, .public-portal-background a, .public-portal-background button').all()) assert.equal(await element.isVisible(), false);
      assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
      assert.equal(await page.locator('.public-portal-background').evaluate(el => getComputedStyle(el, '::after').display), 'none');
      for (const grade of ['A', 'B', 'C', 'S', 'W', 'AB']) {
        const badge = page.locator('.print-grade-' + grade).first();
        assert(await badge.isVisible());
        assert.equal(await badge.innerText(), grade);
        assert.equal(await badge.evaluate(el => getComputedStyle(el).color), 'rgb(17, 24, 39)');
        assert.equal(await badge.evaluate(el => getComputedStyle(el).borderTopStyle), 'solid');
      }
      for (const label of ['Distinction', 'Very Good', 'Credit', 'Pass', 'Fail', 'Absent']) assert(await page.getByRole('cell', { name: label, exact: true }).isVisible());
      assert.equal(await page.getByLabel('Grade not available').count(), 2);
      assert(await page.getByLabel('Overall result: Passed', { exact: true }).isVisible());
      assert.equal(await page.locator('thead').evaluate(el => getComputedStyle(el).display), 'table-header-group');
      assert.equal(await page.getByRole('columnheader', { name: 'Grade', exact: true }).evaluate(el => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getClientRects().length;
      }), 1, 'Grade heading stays on one line');
      assert.equal(await page.getByLabel('Grade not available').first().evaluate(el => getComputedStyle(el).borderTopWidth), '0px');
      assert.equal(await page.locator('tbody tr').first().evaluate(el => getComputedStyle(el).breakInside), 'avoid');
      assert.equal(await page.locator('.print-status-banner').evaluate(el => getComputedStyle(el).breakInside), 'avoid');
      assert.equal(await page.locator('.print-doc-footer').innerText(), 'PrepX Examination System');
      assert(await page.locator('.print-notice').isVisible());
      const text = await page.locator('body').innerText();
      for (const secret of secrets) assert(!text.includes(secret));
      assert(text.includes(fixture.maskedNic));
      assert(await page.locator('.result-print-wrapper *').evaluateAll(elements => elements.every(el => getComputedStyle(el).animationName === 'none')));
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
      assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 1);
      if (artifacts) {
        fs.mkdirSync(artifacts, { recursive: true });
        fs.writeFileSync(path.join(artifacts, `result-${dark ? 'dark' : 'light'}.pdf`), pdf);
        await page.setViewportSize({ width: 794, height: 1123 });
        await page.screenshot({ path: path.join(artifacts, `print-${dark ? 'dark' : 'light'}.png`), fullPage: true });
      }
      await page.emulateMedia({ media: 'screen' });
      await page.setViewportSize({ width: 320, height: 812 });
      assert(await printButton.isVisible());
      assert.equal(await page.locator('.print-doc-header').isVisible(), false);
    }

    for (const overallStatus of ['Not Passed', 'Absent', 'Incomplete']) {
      result = { ...fixture, overallStatus };
      await search();
      await page.emulateMedia({ media: 'print' });
      assert(await page.getByLabel(`Overall result: ${overallStatus}`, { exact: true }).isVisible());
      assert.equal(await page.getByText('Examination center', { exact: true }).count(), 0);
    }
    result = {
      ...fixture,
      grades: Array.from({ length: 60 }, (_, i) => ({ subjectName: `Print subject ${String(i + 1).padStart(2, '0')}`, subjectCode: null, displayOrder: i, grade: 'A' })),
    };
    await search();
    await page.emulateMedia({ media: 'print' });
    const longPdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    assert((longPdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length > 1);
    if (artifacts) fs.writeFileSync(path.join(artifacts, 'result-multipage.pdf'), longPdf);

    // Disabling JS before navigation cannot recover the existing memory-only handoff.
    // It must show a useful fallback rather than a permanent loading indicator.
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const staticPage = await noJs.newPage();
    await staticPage.goto(base + '/results');
    assert(await staticPage.getByRole('heading', { name: 'JavaScript is needed to view your result' }).isVisible());
    assert.equal(await staticPage.locator('.result-loading').isVisible(), false);
    assert.equal(await staticPage.getByRole('button', { name: printName }).count(), 0);
    await noJs.close();
    assert.deepEqual(errors, []);
    console.log('PASS: accessible print action/click/keyboard, safe print content, all grades/statuses, center/null grades, no chrome/animations, monochrome A4 PDF in both themes, multipage output, 320/375/768/1280 screens, no-JS fallback and no hydration errors. Native Save as PDF dialog still requires manual interaction.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
