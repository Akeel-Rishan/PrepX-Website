const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file, overrides = {}) {
  const filename = path.resolve(file);
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = module.paths;
  m.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts', overrides);
    return require(name);
  };
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return m.exports;
}

const examId = '3a320000-0000-4000-8000-000000002026';
const studentId = '3a320000-0000-4000-8000-000000000099';
const subjectId = '3a320000-0000-4000-8000-000000000199';

function harness({ status = 'DRAFT', subjectActive = true } = {}) {
  let writes = 0;
  const audits = [];
  const upserts = [];
  const session = {
    auth: { getClaims: async () => ({ data: { claims: { sub: 'admin-id' } }, error: null }) },
    from() {
      const q = { select() { return q; }, eq() { return q; }, async maybeSingle() { return { data: { id: 'profile-id' }, error: null }; } };
      return q;
    },
  };
  const admin = {
    from(table) {
      let deleting = false;
      const filters = {};
      const q = {
        select() { return q; }, eq(column, value) { filters[column] = value; return q; }, in() { return q; },
        async maybeSingle() {
          if (table === 'examinations') return { data: { status }, error: null };
          return { data: null, error: null };
        },
        async upsert(rows) { writes += 1; upserts.push(...rows); return { error: null }; },
        delete() { deleting = true; return q; },
        then(resolve) {
          if (deleting) { writes += 1; return resolve({ error: null }); }
          if (table === 'students') return resolve({ data: [{ id: studentId }], error: null });
          if (table === 'subjects') {
            const visible = subjectActive || filters.active !== true;
            return resolve({ data: visible ? [{ id: subjectId }] : [], error: null });
          }
          return resolve({ data: [], error: null });
        },
      };
      return q;
    },
  };
  const actions = load('src/lib/actions/grades.ts', {
    '@/lib/supabase/server': { createClient: async () => session, createAdminClient: () => admin },
    '@/lib/audit': { createAuditLog: async entry => audits.push(entry) },
    'next/cache': { revalidatePath() {}, revalidateTag() {} },
  });
  return { ...actions, writes: () => writes, audits, upserts };
}

async function main() {
  const baseChange = { studentId, subjectId, grade: 'A' };
  for (const changes of [[], null, 'A', Array(1001).fill(baseChange),
    [{ ...baseChange, studentId: 'bad' }], [{ ...baseChange, subjectId: 'bad' }],
    ...['', ' ', 'Z', 1, 'A\n', '<b>A</b>'].map(grade => [{ ...baseChange, grade }])]) {
    const invalid = harness();
    assert.ok((await invalid.saveGradesAction(examId, changes)).error);
    assert.equal(invalid.writes(), 0);
  }
  for (const [grade, expected] of [[' a ', 'A'], ['aB', 'AB'], [null, null]]) {
    const normalized = harness();
    assert.equal((await normalized.saveGradesAction(examId, [{ ...baseChange, grade }])).savedCount, 1);
    assert.equal(normalized.writes(), 1);
    if (expected === null) assert.equal(normalized.upserts.length, 0);
    else assert.equal(normalized.upserts[0].grade, expected);
  }
  const duplicate = harness();
  assert.equal((await duplicate.saveGradesAction(examId, [baseChange, { ...baseChange, grade: 'W' }])).savedCount, 1);
  assert.equal(duplicate.upserts.length, 1);
  assert.equal(duplicate.upserts[0].grade, 'W');
  const boundary = harness();
  assert.equal((await boundary.saveGradesAction(examId, Array(1000).fill(baseChange))).savedCount, 1);
  for (const malformed of [null, undefined, 1, 'A', {}, { studentId: studentId, subjectId: subjectId, grade: {} }]) {
    const invalid = harness();
    assert.ok((await invalid.saveGradesAction(examId, [malformed])).error);
    assert.equal(invalid.writes(), 0);
  }
  const change = [{ studentId, subjectId, grade: 'A' }];
  for (const status of ['PUBLISHED', 'ARCHIVED']) {
    const locked = harness({ status });
    assert.match((await locked.saveGradesAction(examId, change)).error, /read-only/);
    assert.equal(locked.writes(), 0);
  }
  const inactive = harness({ subjectActive: false });
  assert.match((await inactive.saveGradesAction(examId, change)).error, /active subjects/);
  assert.equal(inactive.writes(), 0);
  const valid = harness();
  assert.equal((await valid.saveGradesAction(examId, change)).savedCount, 1);
  assert.equal(valid.writes(), 1);
  assert.equal(valid.audits[0].action, 'GRADES_UPDATED');
  console.log('PASS: archived/published grade locks, inactive-subject rejection, valid writes, and auditing.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
