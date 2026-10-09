const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file) {
  const filename = path.resolve(file);
  const moduleUnderTest = new Module(filename, module);
  moduleUnderTest.filename = filename;
  moduleUnderTest.paths = module.paths;
  moduleUnderTest.require = (name) => {
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    return require(name);
  };
  moduleUnderTest._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    filename
  );
  return moduleUnderTest.exports;
}

const { getPublicSearchErrorMessage, preparePublicSearch, PUBLIC_SEARCH_ERROR_MESSAGES } = load(
  'src/lib/public-search.ts'
);
const { buildPublicStudentResult, isPublicStudentResult } = load('src/lib/public-result.ts');
const { consumeMemoryRateLimit } = load('src/lib/rate-limit.ts');

const empty = preparePublicSearch('  ', '');
for (const inherited of ['toString', '__proto__', 'constructor', 'hasOwnProperty']) {
  assert.equal(getPublicSearchErrorMessage(inherited), PUBLIC_SEARCH_ERROR_MESSAGES.SERVER_ERROR);
}
assert.equal(empty.ok, false);
assert.equal(empty.message, PUBLIC_SEARCH_ERROR_MESSAGES.VALIDATION_ERROR);

for (const invalidNic of ['12345', '991234567A', '2003123456789']) {
  const invalid = preparePublicSearch('', invalidNic);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.message, PUBLIC_SEARCH_ERROR_MESSAGES.INVALID_NIC);
}

assert.deepEqual(preparePublicSearch(' ol2026001 ', ''), {
  ok: true,
  indexNumber: 'OL2026001',
  nicNumber: undefined,
});
assert.deepEqual(preparePublicSearch('', ' 991234567v '), {
  ok: true,
  indexNumber: undefined,
  nicNumber: '991234567V',
});
assert.equal(preparePublicSearch('OL2026001', '991234567V').ok, false);
assert.equal(preparePublicSearch('OL-2026-001', '').ok, false);
assert.equal(preparePublicSearch('', '200312345678').ok, true);
assert.equal(
  getPublicSearchErrorMessage('RATE_LIMITED'),
  PUBLIC_SEARCH_ERROR_MESSAGES.RATE_LIMITED
);
assert.equal(
  getPublicSearchErrorMessage('UNTRUSTED_ERROR_CODE'),
  PUBLIC_SEARCH_ERROR_MESSAGES.SERVER_ERROR
);
assert.equal(
  getPublicSearchErrorMessage({ error: 'NOT_FOUND' }),
  PUBLIC_SEARCH_ERROR_MESSAGES.SERVER_ERROR
);

const publicResult = buildPublicStudentResult({
  examination: { name: 'PrepX O/L Model Exam', year: 2027 },
  student: {
    full_name: 'Test Student',
    index_number: 'OL2027001',
    nic_number: '200312345678',
    school_name: 'Test School',
    examination_center: null,
  },
  subjects: [
    {
      id: 'subject-1',
      subject_name: 'Mathematics',
      subject_code: 'MAT',
      display_order: 1,
      required: true,
    },
    {
      id: 'subject-2',
      subject_name: 'English',
      subject_code: 'ENG',
      display_order: 2,
      required: true,
    },
  ],
  results: [{ subject_id: 'subject-1', grade: 'A' }],
});
assert.equal(publicResult.maskedNic, '********5678');
assert.equal(publicResult.overallStatus, 'Incomplete');
assert.deepEqual(
  publicResult.grades.map((entry) => entry.grade),
  ['A', null]
);
assert.equal(isPublicStudentResult(publicResult), true);
assert.equal(isPublicStudentResult({ ...publicResult, maskedNic: 1234 }), false);
assert.equal(isPublicStudentResult({ ...publicResult, grades: [{ grade: 'Z' }] }), false);

const resultWithInactiveGrade = buildPublicStudentResult({
  examination: { name: 'PrepX O/L Model Exam', year: 2027 },
  student: {
    full_name: 'Test Student',
    index_number: 'OL2027001',
    nic_number: null,
    school_name: 'Test School',
    examination_center: null,
  },
  subjects: [
    {
      id: 'active-subject',
      subject_name: 'Mathematics',
      subject_code: null,
      display_order: 1,
      required: true,
    },
  ],
  results: [{ subject_id: 'inactive-subject', grade: 'AB' }],
});
assert.equal(resultWithInactiveGrade.overallStatus, 'Incomplete');

const limitKey = 'test-public-search-rate-limit';
assert.equal(consumeMemoryRateLimit(limitKey, 1_000, 2, 60).allowed, true);
assert.equal(consumeMemoryRateLimit(limitKey, 1_001, 2, 60).allowed, true);
const limited = consumeMemoryRateLimit(limitKey, 1_002, 2, 60);
assert.equal(limited.allowed, false);
assert.equal(limited.retryAfterSeconds, 60);
assert.equal(consumeMemoryRateLimit(limitKey, 61_001, 2, 60).allowed, true);

console.log(
  'PASS: public result search validates input, masks private data, builds safe results, validates stored data, maps API errors, and rate limits repeated attempts.'
);
