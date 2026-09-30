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

console.log(
  'PASS: public result search validates, normalizes, and safely maps untrusted API errors.'
);
