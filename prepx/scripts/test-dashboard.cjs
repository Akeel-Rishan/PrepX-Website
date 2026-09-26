const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file, overrides = {}) {
  const filename = path.resolve(file);
  const moduleUnderTest = new Module(filename, module);
  moduleUnderTest.filename = filename;
  moduleUnderTest.paths = module.paths;
  moduleUnderTest.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, overrides);
    return require(name);
  };
  moduleUnderTest._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText, filename);
  return moduleUnderTest.exports;
}

const examinations = [
  { id: 'exam-2025', name: 'Exam 2025', year: 2025, organization_name: 'PrepX', status: 'ARCHIVED', publication_date: null, created_at: '2025-01-01' },
  { id: 'exam-2026', name: 'Exam 2026', year: 2026, organization_name: 'PrepX', status: 'PUBLISHED', publication_date: '2026-01-01', created_at: '2026-01-01' },
  { id: 'exam-2027', name: 'Exam 2027', year: 2027, organization_name: 'PrepX', status: 'DRAFT', publication_date: null, created_at: '2027-01-01' },
];
const studentCounts = { 'exam-2025': 10, 'exam-2026': 20, 'exam-2027': 30 };

function createAdminClient() {
  return {
    from(table) {
      const filters = {};
      let head = false;
      const query = {
        select(_columns, options) { head = Boolean(options?.head); return query; },
        eq(column, value) { filters[column] = value; return query; },
        in(column, values) { filters[column] = values; return query; },
        order() { return query; },
        range() { return query; },
        limit() { return query; },
        then(resolve) {
          if (table === 'examinations') {
            const rows = filters.year
              ? examinations.filter(exam => exam.year === filters.year)
              : examinations;
            return Promise.resolve({ data: rows, count: null, error: null, status: 200 }).then(resolve);
          }
          if (table === 'students' && head) {
            const ids = filters.examination_id ?? [];
            const count = ids.reduce((sum, id) => sum + (studentCounts[id] ?? 0), 0);
            return Promise.resolve({ data: null, count, error: null, status: 200 }).then(resolve);
          }
          return Promise.resolve({ data: [], count: 0, error: null, status: 200 }).then(resolve);
        },
      };
      return query;
    },
  };
}

async function main() {
  const { getDashboardData } = load('src/lib/data/dashboard.ts', {
    '@/lib/supabase/server': { createAdminClient },
    'next/cache': { unstable_noStore() {} },
  });

  const data2027 = await getDashboardData('2027');
  assert.equal(data2027.selectedYear, 2027);
  assert.deepEqual(data2027.availableYears, [2027, 2026, 2025]);
  assert.equal(data2027.stats.totalExaminations, 1);
  assert.equal(data2027.stats.totalStudents, 30);
  assert.equal(data2027.stats.draftExaminations, 1);
  assert.equal(data2027.stats.publishedExaminations, 0);
  assert.deepEqual(data2027.recentExaminations.map(exam => exam.year), [2027]);

  const data2026 = await getDashboardData('2026');
  assert.equal(data2026.stats.totalStudents, 20);
  assert.equal(data2026.stats.publishedExaminations, 1);
  assert.equal(data2026.stats.draftExaminations, 0);

  const fallback = await getDashboardData('invalid');
  assert.equal(fallback.selectedYear, 2027);

  console.log('PASS: dashboard year selection isolates examination, student, status, and table data by year.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
