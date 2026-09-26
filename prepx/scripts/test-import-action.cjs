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
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText, filename);
  return m.exports;
}

const examinationId = '3a320000-0000-4000-8000-000000002027';
const subjectId = '3a320000-0000-4000-8000-000000000101';
const baseRow = {
  index_number: ' ol2027001 ',
  nic_number: '200312345678',
  full_name: ' Test Student ',
  school_name: ' Test School ',
  examination_center: ' Center A ',
  grades: { [subjectId]: ' a ' },
};

function harness({
  adminId = 'admin-user-id',
  status = 'DRAFT',
  subjectIds = [subjectId],
  rpcData = { rows_processed: 1, grades_written: 1 },
  rpcError = null,
} = {}) {
  const rpcCalls = [];
  const refreshed = [];
  const admin = {
    from(table) {
      const filters = {};
      const query = {
        select() { return query; },
        eq(column, value) { filters[column] = value; return query; },
        in() { return query; },
        async maybeSingle() {
          if (table === 'examinations') return { data: { status }, error: null };
          return { data: null, error: null };
        },
        then(resolve) {
          if (table === 'subjects') {
            return resolve({ data: subjectIds.map(id => ({ id })), error: null });
          }
          return resolve({ data: [], error: null });
        },
      };
      return query;
    },
    async rpc(name, args) {
      rpcCalls.push({ name, args });
      return { data: rpcData, error: rpcError };
    },
  };
  const actions = load('src/lib/actions/import.ts', {
    '@/lib/auth/admin': {
      getAdminUserId: async () => adminId,
      isAdmin: async () => Boolean(adminId),
    },
    '@/lib/supabase/server': { createAdminClient: () => admin },
    'next/cache': {
      revalidatePath: value => refreshed.push(`path:${value}`),
      revalidateTag: value => refreshed.push(`tag:${value}`),
    },
  });
  return { ...actions, rpcCalls, refreshed };
}

async function main() {
  const unauthenticated = harness({ adminId: null });
  assert.match((await unauthenticated.runImportAction({ examinationId, rows: [baseRow] })).error, /Authentication/);
  assert.equal(unauthenticated.rpcCalls.length, 0);

  const published = harness({ status: 'PUBLISHED' });
  assert.match((await published.runImportAction({ examinationId, rows: [baseRow] })).error, /read-only/);
  assert.equal(published.rpcCalls.length, 0);

  const wrongSubject = harness({ subjectIds: [] });
  assert.match((await wrongSubject.runImportAction({ examinationId, rows: [baseRow] })).error, /subjects/);
  assert.equal(wrongSubject.rpcCalls.length, 0);

  const duplicate = harness();
  const duplicateResult = await duplicate.runImportAction({
    examinationId,
    rows: [baseRow, { ...baseRow, full_name: 'Another Student' }],
  });
  assert.match(duplicateResult.error, /Duplicate index/);
  assert.equal(duplicate.rpcCalls.length, 0);

  const invalidGrade = harness();
  const invalidGradeResult = await invalidGrade.runImportAction({
    examinationId,
    rows: [{ ...baseRow, grades: { [subjectId]: 'Z' } }],
  });
  assert.match(invalidGradeResult.error, /invalid grade/);
  assert.equal(invalidGrade.rpcCalls.length, 0);

  const valid = harness();
  assert.deepEqual(await valid.runImportAction({ examinationId, rows: [baseRow] }), {
    success: true,
    stats: { rowsProcessed: 1, gradesWritten: 1 },
  });
  assert.equal(valid.rpcCalls.length, 1);
  assert.equal(valid.rpcCalls[0].name, 'import_exam_results');
  assert.equal(valid.rpcCalls[0].args.p_admin_id, 'admin-user-id');
  assert.deepEqual(valid.rpcCalls[0].args.p_rows[0], {
    index_number: 'OL2027001',
    nic_number: '200312345678',
    full_name: 'Test Student',
    school_name: 'Test School',
    examination_center: 'Center A',
    grades: { [subjectId]: 'A' },
  });
  assert.ok(valid.refreshed.includes('tag:results'));
  assert.ok(valid.refreshed.includes('path:/admin/review'));

  const nicConflict = harness({
    rpcData: null,
    rpcError: { code: '23505', message: 'duplicate key value violates idx_students_exam_nic_unique' },
  });
  assert.match(
    (await nicConflict.runImportAction({ examinationId, rows: [baseRow] })).error,
    /NIC number.*different student/
  );

  const missingFunction = harness({
    rpcData: null,
    rpcError: { code: 'PGRST202', message: 'function not found' },
  });
  assert.match(
    (await missingFunction.runImportAction({ examinationId, rows: [baseRow] })).error,
    /latest Supabase migrations/
  );

  console.log('PASS: import action authorization, validation, exam locks, subject ownership, normalization, RPC handling, and cache refresh.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
