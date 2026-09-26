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

const { buildPublicationValidation, computeOverallStatus } = load(
  'src/lib/publication-validator.ts'
);

assert.equal(computeOverallStatus({ optional: 'AB' }, ['required']), 'ABSENT');
assert.equal(computeOverallStatus({ required: 'A' }, ['required', 'missing']), 'INCOMPLETE');
assert.equal(computeOverallStatus({ required: 'W' }, ['required']), 'NOT_PASSED');
assert.equal(computeOverallStatus({ required: 'A', optional: 'W' }, ['required']), 'PASSED');

const examination = { id: 'exam', name: 'Model Exam', year: 2027, status: 'DRAFT' };
const subjects = [
  {
    id: 'maths',
    subject_name: 'Mathematics',
    subject_code: 'MAT',
    required: true,
    display_order: 1,
  },
  { id: 'art', subject_name: 'Art', subject_code: 'ART', required: false, display_order: 2 },
];
const students = Array.from({ length: 10 }, (_, index) => ({
  id: `student-${index}`,
  full_name: `Student ${index}`,
  index_number: `OL${index}`,
  nic_number: `200000000${index}`,
  school_name: 'PrepX School',
}));
const completeResults = students.flatMap((student) => [
  { student_id: student.id, subject_id: 'maths', grade: 'A' },
  { student_id: student.id, subject_id: 'art', grade: 'B' },
]);

const ready = buildPublicationValidation({
  examination,
  subjects,
  students,
  results: completeResults,
  validatedAt: '2027-01-01T00:00:00.000Z',
});
assert.equal(ready.canPublish, true);
assert.equal(ready.blockingFailures, 0);
assert.equal(ready.completeStudents, 10);
assert.deepEqual(ready.statusDistribution, { passed: 10, notPassed: 0, absent: 0, incomplete: 0 });
assert.equal(ready.subjectCoverage[0].coveragePct, 100);

const oneMissing = buildPublicationValidation({
  examination,
  subjects,
  students,
  results: completeResults.filter(
    (row) => !(row.student_id === 'student-0' && row.subject_id === 'maths')
  ),
});
const completenessWarning = oneMissing.checks.find((check) => check.id === 'check_3_1');
assert.equal(completenessWarning.status, 'warn');
assert.equal(oneMissing.canPublish, true);

const twoMissing = buildPublicationValidation({
  examination,
  subjects,
  students,
  results: completeResults.filter(
    (row) => !(['student-0', 'student-1'].includes(row.student_id) && row.subject_id === 'maths')
  ),
});
assert.equal(twoMissing.checks.find((check) => check.id === 'check_3_1').status, 'fail');
assert.equal(twoMissing.canPublish, false);

const zeroRequiredCoverage = buildPublicationValidation({
  examination,
  subjects,
  students,
  results: completeResults.filter((row) => row.subject_id !== 'maths'),
});
assert.equal(zeroRequiredCoverage.checks.find((check) => check.id === 'check_4_2').status, 'warn');
assert.equal(zeroRequiredCoverage.checks.find((check) => check.id === 'check_4_3').status, 'warn');

const corrupted = buildPublicationValidation({
  examination,
  subjects,
  students: [
    { ...students[0], index_number: 'SAME', nic_number: '1234' },
    { ...students[1], index_number: ' same ', nic_number: '1234' },
  ],
  results: [{ student_id: 'student-0', subject_id: 'maths', grade: 'INVALID' }],
});
assert.equal(corrupted.checks.find((check) => check.id === 'check_2_2').status, 'fail');
assert.equal(corrupted.checks.find((check) => check.id === 'check_2_3').status, 'fail');
assert.equal(corrupted.checks.find((check) => check.id === 'check_3_3').status, 'fail');

const archived = buildPublicationValidation({
  examination: { ...examination, status: 'ARCHIVED' },
  subjects,
  students,
  results: completeResults,
});
assert.equal(archived.checks.find((check) => check.id === 'check_1_1').status, 'fail');
assert.equal(archived.canPublish, false);

console.log(
  'PASS: publication status precedence, readiness rules, thresholds, duplicates, corruption checks, and archive blocking.'
);
