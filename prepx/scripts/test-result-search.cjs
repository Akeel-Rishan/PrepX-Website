const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { NextRequest } = require('next/server');

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
const nic = '200312345678';
const valid = { examinationId: examId, indexNumber: 'OL2026001' };
function harness(options = {}) {
  const calls = [];
  let clientCount = 0;
  const subjects = options.subjects ?? [
    { id: 's1', subject_name: 'Maths', subject_code: 'MAT', display_order: 1, required: true, active: true },
    { id: 's2', subject_name: 'Science', subject_code: 'SCI', display_order: 2, required: false, active: true },
    { id: 'hidden', subject_name: 'Inactive', subject_code: null, display_order: 3, required: true, active: false },
  ];
  const db = {
    examinations: options.missingExam ? null : { id: examId, name: 'Exam', year: 2026, status: options.status ?? 'PUBLISHED' },
    students: options.missingStudent ? null : {
      id: 'student-id', full_name: 'Test Student', index_number: options.index ?? valid.indexNumber,
      nic_number: options.nic === undefined ? nic : options.nic, school_name: 'School', examination_center: null,
      ...options.studentFields,
    },
    subjects,
    student_results: options.grades ?? [{ subject_id: 's1', grade: 'A' }, { subject_id: 'hidden', grade: 'W' }],
  };
  const route = load('src/app/api/results/search/route.ts', {
    ...(options.limiter ? { '@/lib/rate-limit': { checkResultSearchRateLimit: options.limiter } } : {}),
    '@/lib/supabase/server': { createAdminClient() {
      clientCount++;
      if (options.throwClient) throw new Error(nic);
      return { from(table) {
        const call = { table, filters: {}, columns: null, order: null };
        calls.push(call);
        const result = () => {
          if (options.throwTable === table) throw new Error(nic);
          if (options.errorTable === table) return { data: null, error: { message: nic } };
          const published = db.examinations && db.examinations.status === call.filters.status;
          if (!published) return { data: null, error: null };
          const studentMatches = db.students &&
            (call.filters['students.index_number'] === undefined || db.students.index_number === call.filters['students.index_number']) &&
            (call.filters['students.nic_number'] === undefined || db.students.nic_number === call.filters['students.nic_number']);
          const matchingStudents = studentMatches
            ? [{ ...db.students, student_results: db.student_results }]
            : [];
          if (options.duplicateStudent && matchingStudents.length) matchingStudents.push({ ...matchingStudents[0], id: 'duplicate-student' });
          const data = {
            ...db.examinations,
            subjects: subjects.filter(s => call.filters['subjects.active'] !== true || s.active),
            students: matchingStudents,
          };
          return { data, error: null };
        };
        const query = {
          select(columns) { call.columns = columns; return query; },
          eq(column, value) { call.filters[column] = value; return query; },
          order(column, config) { call.order = { column, ...config }; return query; },
          async maybeSingle() { return result(); },
        };
        return query;
      } };
    } },
  });
  return { route, calls, clientCount: () => clientCount };
}

async function search(h, body = valid, headers = {}) {
  const request = new NextRequest('http://localhost/api/results/search', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  const response = await h.route.POST(request);
  assert.equal(response.headers.get('cache-control'), 'no-store, no-cache, must-revalidate');
  assert.equal(response.headers.get('pragma'), 'no-cache');
  return { status: response.status, body: await response.json(), headers: response.headers };
}

async function main() {
  const { calculateResultStatus: status } = load('src/lib/result-utils.ts');
  const required = new Set(['a', 'b']);
  for (const [grades, expected] of [
    [[], 'Incomplete'], [[['a', 'W']], 'Incomplete'],
    [[['a', 'AB'], ['b', 'AB']], 'Absent'], [[['a', 'W'], ['b', 'AB']], 'Not Passed'],
    [[['a', 'AB'], ['b', 'S']], 'Passed'], [[['a', 'A'], ['b', 'C'], ['optional', 'W']], 'Passed'],
  ]) assert.equal(status(new Map(grades), required), expected);
  assert.equal(status(new Map(), new Set()), 'Incomplete');
  assert.equal(status(new Map([['optional', 'W']]), new Set()), 'Passed');
  for (const grade of ['A', 'B', 'C', 'S']) {
    assert.equal(status(new Map([['a', grade], ['b', grade]]), required), 'Passed');
  }
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    const h = harness();
    const response = await search(h);
    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(response.body).sort(), [
      'studentName', 'indexNumber', 'maskedNic', 'schoolName', 'examinationCenter',
      'examinationName', 'examinationYear', 'grades', 'overallStatus',
    ].sort());
    assert.equal(response.body.maskedNic, '********5678');
    assert.equal(response.body.overallStatus, 'Passed');
    assert.deepEqual(response.body.grades.map(g => [g.subjectName, g.grade]), [['Maths', 'A'], ['Science', null]]);
    for (const grade of response.body.grades) {
      assert.deepEqual(Object.keys(grade).sort(), ['subjectName', 'subjectCode', 'displayOrder', 'grade'].sort());
    }
    assert.ok(!JSON.stringify(response.body).includes('student-id'));
    assert.ok(!JSON.stringify(response.body).includes(nic));
    assert.deepEqual(h.calls.map(c => c.table), ['examinations']);
    assert.equal(h.calls[0].filters.id, examId);
    assert.equal(h.calls[0].filters.status, 'PUBLISHED');
    assert.equal(h.calls[0].filters['students.index_number'], valid.indexNumber);
    assert.equal(h.calls[0].filters['subjects.active'], true);
    assert.deepEqual(h.calls[0].order, { column: 'display_order', referencedTable: 'subjects', ascending: true });
    assert.match(h.calls[0].columns, /student_results!student_results_student_id_fkey/);
    originalLog('PASS 1: one-request index lookup, response allowlist, active subjects and grades');

    for (const input of [nic, '991234567v']) {
      const byNic = harness({ nic: input.toUpperCase() });
      const found = await search(byNic, { examinationId: examId, nicNumber: input });
      assert.equal(found.status, 200);
      assert.equal(byNic.calls[0].filters['students.nic_number'], input.toUpperCase());
      assert.ok(!JSON.stringify(found.body).includes(input.toUpperCase()));
    }
    assert.equal((await search(harness({ nic: null }))).body.maskedNic, null);
    originalLog('PASS 2: modern/old NIC lookup and masking');

    assert.equal((await search(harness({ missingStudent: true }))).body.error, 'NOT_FOUND');
    assert.equal((await search(harness({ missingStudent: true }))).status, 404);
    originalLog('PASS 3: generic 404');
    for (const options of [{ missingExam: true }, ...['DRAFT', 'READY', 'ARCHIVED'].map(status => ({ status }))]) {
      const locked = harness(options);
      const result = await search(locked);
      assert.equal(result.status, 403);
      assert.equal(result.body.error, 'NOT_PUBLISHED');
      assert.equal(locked.calls.length, 1);
    }
    originalLog('PASS 4: unpublished/missing exams stop before student access');
    for (const input of ['{', null, [], {}, { ...valid, indexNumber: ' ' },
      { ...valid, nicNumber: '12345' }, { ...valid, examinationId: 'bad' },
      { indexNumber: 'OL2026001' }, { ...valid, indexNumber: 123 },
      { ...valid, nicNumber: nic },
      { examinationId: examId, nicNumber: '200312345678v' }]) {
      const invalid = harness();
      const result = await search(invalid, input);
      assert.equal(result.status, 400);
      assert.equal(result.body.error, 'VALIDATION_ERROR');
      assert.equal(invalid.calls.length, 0);
    }
    originalLog('PASS 5: malformed JSON, identifiers and UUIDs');
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const blocked = await h.route[method]();
      assert.equal(blocked.status, 405);
      assert.equal(blocked.headers.get('allow'), 'POST');
    }
    originalLog('PASS 6: GET/PUT/DELETE blocked');
    const normalized = harness();
    await search(normalized, { ...valid, indexNumber: ' ol2026001 ' });
    assert.equal(normalized.calls[0].filters['students.index_number'], valid.indexNumber);
    assert.ok(!Object.hasOwn(normalized.calls[0].filters, 'students.nic_number'));
    originalLog('PASS 7: whitespace/case normalization and unambiguous lookup');
    originalLog('PASS 8: status precedence, optional subjects and empty-required edge cases');
    originalLog('PASS 9: no-cache headers on success and errors');
    for (const kind of ['errorTable', 'throwTable']) {
      const failed = await search(harness({ [kind]: 'examinations' }));
      assert.equal(failed.status, 500);
      assert.deepEqual(failed.body, { error: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
    }
    assert.equal((await search(harness({ duplicateStudent: true }))).status, 500);
    assert.equal((await search(harness({ throwClient: true }))).status, 500);
    assert.ok(logs.every(log => !log.includes(nic) && !log.includes('991234567V') && !log.includes(valid.indexNumber)));
    originalLog('PASS 11: no raw NIC in response/logs; database failures fail closed');
  } finally { console.log = originalLog; }
}

module.exports = { load, harness, search, valid };
if (require.main === module) {
  const timeout = setTimeout(() => { console.error('FAIL: query concurrency timeout'); process.exit(1); }, 20000);
  main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(timeout));
}
