// Run against a running app with PLAYWRIGHT_MODULE pointing to playwright-core.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const fixture = {
  studentName: 'Print Test Student', indexNumber: 'PRINT2026001', maskedNic: '********5678',
  schoolName: 'Print Test School', examinationCenter: null,
  examinationName: 'O/L Model Examination Results', examinationYear: 2026, overallStatus: 'Passed',
  grades: ['A', 'B', 'C', 'S', 'W', 'AB', null, 'A'].map((grade, i) => ({
    subjectId: String(i), subjectName: ['Tamil', 'English', 'Mathematics', 'Science', 'History', 'Religion', 'ICT', 'Commerce'][i],
    subjectCode: null, displayOrder: i, grade,
  })),
};
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(base + '/results');
    await page.getByText('Search for your result', { exact: true }).waitFor();
    await page.evaluate(data => sessionStorage.setItem('prepx_result', JSON.stringify(data)), fixture);
    await page.reload();
    await page.getByText(fixture.studentName, { exact: true }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 8);
    for (const name of ['Print Result', 'Download PDF']) assert(await page.getByRole('button', { name }).isVisible());
    assert(await page.getByRole('link', { name: 'Search Again' }).isVisible());
    assert.equal(await page.locator('.print-doc-header').isVisible(), false);
    assert.equal(await page.getByRole('status').count(), 0);
    await page.evaluate(() => { window.printCalls = 0; window.print = () => { window.printCalls++; window.dispatchEvent(new Event('beforeprint')); window.dispatchEvent(new Event('afterprint')); }; });
    await page.getByRole('button', { name: 'Download PDF' }).click();
    assert(await page.getByRole('status').isVisible());
    assert.equal(await page.evaluate(() => window.printCalls), 0);
    await page.waitForFunction(() => window.printCalls === 1);
    await page.getByRole('status').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Print Result' }).click();
    assert.equal(await page.evaluate(() => window.printCalls), 2);
    for (const dark of [false, true]) {
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
      await page.emulateMedia({ media: 'print' });
      assert(await page.locator('.print-doc-header').isVisible());
      assert.match(await page.locator('#print-date-stamp').innerText(), /^Printed: /);
      for (const element of await page.locator('.no-print').all()) assert.equal(await element.isVisible(), false);
      for (const [grade, color] of [['A', 'rgb(220, 252, 231)'], ['W', 'rgb(254, 226, 226)'], ['AB', 'rgb(243, 244, 246)']]) {
        assert.equal(await page.locator('.print-grade-' + grade).first().evaluate(el => getComputedStyle(el).backgroundColor), color);
      }
      assert.equal(await page.locator('.print-doc-footer').evaluate(el => getComputedStyle(el).display), 'flex');
      assert(await page.locator('.print-notice').isVisible());
      assert.equal(await page.locator('tbody td').first().evaluate(el => getComputedStyle(el).borderTopStyle), 'solid');
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
      const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
      assert.equal(pageCount, 1, 'Eight subjects fit one A4 page');
    }
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 375, height: 812 });
    assert(await page.getByRole('button', { name: 'Download PDF' }).isVisible());
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    console.log('PASS: screen/mobile, missing result, PDF tip timing, both print handlers, print header/date, hidden chrome, grade colors, table borders, footer/notice, dark mode and single-page A4 PDF. Native dialogs/keyboard Save as PDF require manual verification.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
