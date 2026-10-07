const assert = require('node:assert/strict');
const { load } = require('./test-result-search.cjs');
const { gradeSchema, gradeOrNullSchema } = load('src/lib/validations/grade.ts');
const { GRADES, GRADE_LABELS, isExamEditable } = load('src/lib/constants.ts');
const { calculateResultStatus, getResultStatusStyle } = load('src/lib/result-utils.ts');
const { computeOverallStatus } = load('src/lib/publication-validator.ts');
const { isValidGrade } = load('src/lib/validations/import.ts');

const meanings = { A: 'Distinction', B: 'Very Good', C: 'Credit', S: 'Pass', W: 'Fail', AB: 'Absent' };
assert.deepEqual(GRADES, Object.keys(meanings));
assert.deepEqual(GRADE_LABELS, meanings);
for (const grade of Object.keys(meanings)) {
  for (const input of [grade, grade.toLowerCase(), ` ${grade.toLowerCase()} `, grade === 'AB' ? 'aB' : grade]) {
    assert.equal(gradeSchema.parse(input), grade);
    assert.equal(gradeOrNullSchema.parse(input), grade);
    assert.equal(isValidGrade(input), true);
  }
}
for (const value of ['', ' ', 'Z', 'AA', 'A B', 'A+', 'ABX', 'Absent', '1', 1, 0, NaN, true, null, undefined, [], {}, 'A\n', '\tA', 'A\0', '<b>A</b>', '=A', 'Ａ', 'a'.repeat(67)]) {
  assert.equal(gradeSchema.safeParse(value).success, false, `reject grade ${JSON.stringify(value)}`);
  assert.equal(isValidGrade(value), false);
  if (value !== null) assert.equal(gradeOrNullSchema.safeParse(value).success, false);
}
assert.equal(gradeOrNullSchema.parse(null), null); // Grade removal, not a valid entered grade.

// Explicit truth table: rows/columns A B C S W AB missing. Missing always wins;
// AB is Absent only when ALL required grades are AB. Optional grades do not decide status.
const values = ['A', 'B', 'C', 'S', 'W', 'AB', undefined];
const P = 'Passed', F = 'Not Passed', A = 'Absent', I = 'Incomplete';
const expected = [
  [P,P,P,P,F,P,I], [P,P,P,P,F,P,I], [P,P,P,P,F,P,I], [P,P,P,P,F,P,I],
  [F,F,F,F,F,F,I], [P,P,P,P,F,A,I], [I,I,I,I,I,I,I],
];
const adminStatus = { [P]: 'PASSED', [F]: 'NOT_PASSED', [A]: 'ABSENT', [I]: 'INCOMPLETE' };
values.forEach((first, row) => values.forEach((second, column) => {
  const entries = [['first', first], ['second', second]].filter(([, grade]) => grade !== undefined);
  for (const optional of values) {
    const grades = new Map([...entries, ...(optional ? [['optional', optional]] : [])]);
    const before = [...grades];
    const required = new Set(['first', 'second']);
    const message = `${first}/${second}; optional=${optional}`;
    assert.equal(calculateResultStatus(grades, required), expected[row][column], message);
    assert.equal(computeOverallStatus(Object.fromEntries(grades), [...required]), adminStatus[expected[row][column]], message);
    assert.deepEqual([...grades], before);
    assert.deepEqual([...required], ['first', 'second']);
  }
}));
for (const [entries, required, result] of [
  [[], [], I], [[['optional', 'W']], [], P], [[['optional', 'AB']], [], P],
  [[['first', 'A'], ['second', 'W']], ['first'], P],
  [[['first', 'A'], ['second', 'W']], ['second'], F],
  [[['first', '']], ['first'], I],
  [[['first', 'W'], ['first', 'A']], ['first', 'first'], P],
  [[['first', 'A'], ['first', 'W']], ['first'], F],
]) assert.equal(calculateResultStatus(new Map(entries), new Set(required)), result);
for (const [status, icon] of [[P,'check'],[F,'x'],[A,'clock'],[I,'alert']]) {
  assert.equal(getResultStatusStyle(status).label, status.toUpperCase());
  assert.equal(getResultStatusStyle(status).icon, icon);
}
for (const [status, editable] of [['DRAFT',true],['READY',true],['PUBLISHED',false],['ARCHIVED',false]]) assert.equal(isExamEditable(status), editable);
console.log('PASS: exact grade contract/meanings, 343 required/optional combinations, public/admin status parity, precedence, configurable requirements and duplicate-map semantics.');
