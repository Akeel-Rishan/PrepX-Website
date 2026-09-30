const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const examId = '3a320000-0000-4000-8000-000000002026';

function harness() {
  const modules = new Map();
  const cached = new Map();
  const calls = [];
  let fail = false;
  const students = Array.from({ length: 1005 }, (_, i) => ({
    id: 'student-' + i, full_name: 'Student ' + i,
    index_number: String(i).padStart(5, '0'), school_name: 'School',
  }));
  const subjects = [
    { id: 'a', subject_name: 'Maths', required: true, active: true, display_order: 0 },
    { id: 'b', subject_name: 'Science', required: true, active: true, display_order: 1 },
    { id: 'inactive', subject_name: 'Hidden', required: true, active: false, display_order: 2 },
  ];
  const grades = students.flatMap((student, i) => [
    ...(i < 700 ? [{ student_id: student.id, subject_id: 'a', grade: 'A' }] : []),
    ...(i < 400 ? [{ student_id: student.id, subject_id: 'b', grade: 'S' }] : []),
    { student_id: student.id, subject_id: 'inactive', grade: 'W' },
  ]);
  const overrides = {
    'server-only': {},
    'next/cache': {
      unstable_noStore() {},
      unstable_cache(fn, keys, options) {
        assert.deepEqual(options.tags, ['results', 'students', 'subjects']);
        return async (...args) => {
          const key = JSON.stringify([keys, args]);
          if (cached.has(key)) return cached.get(key);
          const result = await fn(...args);
          cached.set(key, result);
          return result;
        };
      },
    },
    '@/lib/supabase/server': { createAdminClient() { return { from(table) {
      const filters = {};
      let range = [0, 999];
      const q = {
        select() { return q; }, eq(key, value) { filters[key] = value; return q; },
        order() { return q; }, range(from, to) { range = [from, to]; return q; },
        then(resolve) {
          calls.push({ table, filters: { ...filters }, range });
          const rows = table === 'students' ? students : table === 'subjects'
            ? subjects.filter(subject => subject.active) : grades;
          return Promise.resolve().then(() => resolve(fail ? { data: null, error: { code: 'FAIL' } }
            : { data: rows.slice(range[0], range[1] + 1), error: null }));
        },
      };
      return q;
    } }; } },
  };
  function load(file) {
    const filename = path.resolve(file);
    if (modules.has(filename)) return modules.get(filename).exports;
    const m = new Module(filename, module);
    modules.set(filename, m);
    m.filename = filename;
    m.paths = module.paths;
    m.require = name => Object.hasOwn(overrides, name) ? overrides[name]
      : name.startsWith('@/') ? load('src/' + name.slice(2) + '.ts') : require(name);
    m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText, filename);
    return m.exports;
  }
  return { load, calls, clear: () => cached.clear(), fail: value => { fail = value; } };
}

async function main() {
  const h = harness();
  const { getGradeGridData } = h.load('src/lib/data/grades.ts');
  const { getReviewData } = h.load('src/lib/data/review.ts');
  const grid = await getGradeGridData({ examinationId: examId });
  assert.equal(grid.error, undefined);
  assert.equal(grid.totalCount, 1005);
  assert.equal(grid.totalPages, 41);
  assert.deepEqual(grid.completeSummary, { complete: 400, incomplete: 300, empty: 305 });
  assert.deepEqual(grid.students[0].grades.map(g => g.subject_id), ['a', 'b']);
  assert.equal(h.calls.length, 6); // 2 student + 1 subject + 3 result pages.
  assert.deepEqual(h.calls.slice(0, 3).map(c => c.table), ['students', 'subjects', 'student_results']);
  for (const call of h.calls) assert.equal(call.filters[call.table === 'student_results' ? 'student.examination_id' : 'examination_id'], examId);
  const count = h.calls.length;
  const second = await getGradeGridData({ examinationId: examId, page: 2 });
  assert.equal(second.students[0].index_number, '00025');
  const filtered = await getGradeGridData({ examinationId: examId, search: '00042' });
  assert.equal(filtered.totalCount, 1);
  const review = await getReviewData({ examinationId: examId, statusFilter: 'needs_attention' });
  assert.equal(review.totalFiltered, 605);
  assert.deepEqual(review.summary, { total: 1005, complete: 400, incomplete: 300, empty: 305, completionPercent: 40 });
  assert.equal(h.calls.length, count, 'Pagination, search and review reuse the examination snapshot');
  for (const page of [NaN, Infinity, -1, 1.5]) {
    const result = await getGradeGridData({ examinationId: examId, page, pageSize: NaN });
    assert.equal(result.currentPage, 1);
    assert.equal(result.pageSize, 25);
  }
  assert.equal((await getGradeGridData({ examinationId: examId, page: 999 })).currentPage, 41);
  h.clear();
  h.fail(true);
  assert.ok((await getGradeGridData({ examinationId: examId })).error);
  await assert.rejects(getReviewData({ examinationId: examId }));
  h.fail(false);
  assert.equal((await getGradeGridData({ examinationId: examId })).totalCount, 1005, 'Failed snapshot must not be cached as empty');
  const { maskNIC } = h.load('src/lib/utils.ts');
  for (const value of ['1', '1234', '12345', '200312345678']) assert.notEqual(maskNIC(value), value);
  console.log('PASS: >1000-row coverage, parallel reads, exam scoping, shared cache, pagination, completion, failures and masking.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
