// Run with: node scripts/test-students.cjs
// Uses the configured Supabase database and the Step 5.1 development seed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createClient } = require('@supabase/supabase-js');
require('@next/env').loadEnvConfig(process.cwd());
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
function load(relative) {
  const filename = path.resolve(relative);
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = module.paths;
  m.require = (name) => {
    if (name === 'server-only') return {};
    if (name === 'next/cache') return { unstable_noStore() {} };
    if (name === '@/lib/supabase/server') return { createAdminClient: () => client };
    if (name === '@/lib/utils') return load('src/lib/utils.ts');
    if (name === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
    return require(name);
  };
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return m.exports;
}
async function main() {
  const data = load('src/lib/data/students.ts');
  const pages = await Promise.all([1, 2, 3].map(page => data.getStudentsWithPagination({ page })));
  assert.deepEqual(pages.map(p => p.students.length), [25, 25, 10]);
  assert.equal(pages[0].totalCount, 60);
  assert.equal((await data.getStudentsWithPagination({ page: 999 })).currentPage, 3);
  assert.equal(new Set(pages.flatMap(p => p.students.map(s => s.id))).size, 60);
  const examId = pages[0].students[0].examination_id;
  const filtered = await data.getStudentsWithPagination({ search: 'Zahira' });
  assert.ok(filtered.students.length > 0);
  assert.ok(filtered.students.every(s => s.school_name.includes('Zahira')));
  const byName = await data.getStudentsWithPagination({ search: 'Mohamed Akeel' });
  assert.equal(byName.totalCount, 1);
  const combined = await data.getStudentsWithPagination({ search: 'OL2026', examinationId: examId, school: 'Royal College' });
  assert.ok(combined.students.length > 0);
  assert.ok(combined.students.every(s => s.examination_id === examId && s.school_name === 'Royal College'));
  const schools = await data.getDistinctSchools(examId);
  assert.equal(schools.length, 5);
  assert.deepEqual(schools, [...schools].sort());
  const empty = await data.getStudentsWithPagination({ search: 'nonexistent-student' });
  assert.equal(empty.totalCount, 0);
  for (const search of ['%', '_', 'a,b)', '"', '\\']) {
    assert.equal((await data.getStudentsWithPagination({ search })).totalCount, 0);
  }
  assert.equal((await data.getStudentById(pages[0].students[0].id)).id, pages[0].students[0].id);
  assert.equal(await data.getStudentById('invalid'), null);
  const pagination = load('src/components/admin/pagination.tsx');
  assert.deepEqual(pagination.getPaginationRange(5, 10), [1, '…', 3, 4, 5, 6, 7, '…', 10]);
  const url = new URL(pagination.buildPageUrl(2, '/admin/students', { search: 'A & B', examId }), 'https://example.test');
  assert.equal(url.searchParams.get('search'), 'A & B');
  assert.equal(url.searchParams.get('page'), '2');
  const { StudentsTable } = load('src/app/admin/(protected)/students/_components/students-table.tsx');
  const html = renderToStaticMarkup(React.createElement(StudentsTable, { students: pages[0].students }));
  for (const student of pages[0].students) {
    assert.ok(!html.includes(student.nic_number));
    assert.ok(html.includes('/admin/students/' + student.id));
  }
  const emptyHtml = renderToStaticMarkup(React.createElement(StudentsTable, { students: [] }));
  assert.ok(emptyHtml.includes('No students found'));
  assert.ok(emptyHtml.includes('/admin/students/new'));
  for (let i = 0; i < pages.length; i++) {
    const summary = renderToStaticMarkup(React.createElement(pagination.Pagination, { ...pages[i], basePath: '/admin/students', currentParams: {} }));
    assert.ok(summary.includes(['Showing 1–25 of 60', 'Showing 26–50 of 60', 'Showing 51–60 of 60'][i]));
  }
  console.log('PASS: 25/25/10 pages; distinct rows; name/index/school and combined filters; schools; empty/special-character searches; detail lookup; pagination links/summaries; masked NIC HTML; Add/Manage links.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
