const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const fixture = require('./fixtures/public-result.cjs');

function load(file, overrides = {}) {
  const filename = path.resolve(file);
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = module.paths;
  m.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('@/') || name.startsWith('.')) {
      const target = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(filename), name);
      return load(fs.existsSync(target + '.tsx') ? target + '.tsx' : target + '.ts', overrides);
    }
    return require(name);
  };
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return m.exports;
}

const { publicResultSchema } = load('src/lib/validations/public-result.ts');
function render(result, ready = true) {
  const Page = load('src/app/(public)/results/page.tsx', {
    '@/components/public/result-provider': { usePublicResult: () => ({ result, ready }) },
  }).default;
  return renderToStaticMarkup(React.createElement(Page));
}
const valid = publicResultSchema.parse(fixture);
let html = render(valid);
for (const text of [fixture.studentName, fixture.indexNumber, fixture.maskedNic, fixture.schoolName, fixture.examinationName, '2026']) assert(html.includes(text));
for (const meaning of ['Distinction', 'Very Good', 'Credit', 'Pass', 'Fail', 'Absent', 'Not available']) assert(html.includes(meaning));
assert.equal((html.match(/scope="row"/g) || []).length, 8);
assert.equal((html.match(/scope="col"/g) || []).length, 3);
assert(html.includes('<caption'));
assert(html.includes('Your examination result is ready.'));
assert(!html.includes('Examination center'));
assert(render({ ...valid, examinationCenter: 'Centre A' }).includes('Centre A'));
for (const overallStatus of ['Passed', 'Not Passed', 'Absent', 'Incomplete']) {
  // The same grades intentionally produce different displayed server statuses.
  assert(render({ ...valid, overallStatus }).includes(`aria-label="Overall result: ${overallStatus}"`));
}
for (const grade of [null, undefined]) {
  const result = publicResultSchema.parse({ ...fixture, grades: [{ ...fixture.grades[0], grade }] });
  assert(render(result).includes('Grade not available'));
}
assert(render({ ...valid, grades: [] }).includes('Subject grades are not available'));
assert(render(null).includes('Search for your result'));
assert(render(null, false).includes('Loading result'));
for (const maskedNic of ['200312345678', '991234567V', '********12345']) {
  assert.equal(publicResultSchema.safeParse({ ...fixture, maskedNic }).success, false);
}
for (const invalid of [null, {}, { ...fixture, overallStatus: 'Unknown' }, { ...fixture, grades: null }, { ...fixture, grades: [{ ...fixture.grades[0], grade: 'Z' }] }]) {
  assert.equal(publicResultSchema.safeParse(invalid).success, false);
}
const contaminated = { ...fixture, nicNumber: '200312345678', marks: 9876, total: 8765, average: 7654, rank: 6543, id: 'PRIVATE-STUDENT-ID', audit: 'PRIVATE-AUDIT', grades: fixture.grades.map(g => ({ ...g, subjectId: 'PRIVATE-SUBJECT-ID', score: 5432 })) };
const sanitized = publicResultSchema.parse(contaminated);
html = render(sanitized);
for (const secret of ['200312345678', '9876', '8765', '7654', '6543', 'PRIVATE-STUDENT-ID', 'PRIVATE-SUBJECT-ID', 'PRIVATE-AUDIT', '5432']) {
  assert(!JSON.stringify(sanitized).includes(secret));
  assert(!html.includes(secret));
}
for (const [route, title] of [['not-found', 'Result Not Found'], ['not-published', 'Results Not Yet Published']]) {
  const Page = load(`src/app/(public)/results/${route}/page.tsx`).default;
  assert(renderToStaticMarkup(React.createElement(Page)).includes(title));
}
console.log('PASS: result contract, all grades/statuses, optional center, masked NIC, missing/empty/malformed results, sensitive-field exclusion, accessible table/status, loading and feedback routes.');
