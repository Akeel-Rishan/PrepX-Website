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
  moduleUnderTest.require = (name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, overrides);
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

const examId = '3a320000-0000-4000-8000-000000002027';

function harness({ adminId = 'admin-id', failingTable = null } = {}) {
  let clientCreated = 0;
  const started = new Set();
  const filters = [];
  let concurrentStartCount = 0;
  const data = {
    examinations: { id: examId, name: 'Exam', year: 2027, status: 'DRAFT' },
    subjects: [
      {
        id: 'subject',
        subject_name: 'Maths',
        subject_code: 'MAT',
        required: true,
        display_order: 1,
      },
    ],
    students: [
      {
        id: 'student',
        full_name: 'Student',
        index_number: 'OL1',
        nic_number: null,
        school_name: 'School',
      },
    ],
    student_results: [
      {
        student_id: 'student',
        subject_id: 'subject',
        grade: 'A',
        student: { examination_id: examId },
      },
    ],
  };
  const admin = {
    from(table) {
      const query = {
        select() {
          return query;
        },
        eq(column, value) {
          filters.push([table, column, value]);
          return query;
        },
        order() {
          return query;
        },
        range() {
          return query;
        },
        maybeSingle() {
          return delayed(table, data[table]);
        },
        then(resolve, reject) {
          return delayed(table, data[table]).then(resolve, reject);
        },
      };
      return query;
    },
  };
  function delayed(table, tableData) {
    started.add(table);
    return new Promise((resolve) =>
      setImmediate(() => {
        concurrentStartCount = Math.max(concurrentStartCount, started.size);
        resolve(
          failingTable === table
            ? { data: null, error: { message: 'raw database secret' } }
            : { data: tableData, error: null }
        );
      })
    );
  }
  const actions = load('src/app/admin/(protected)/publication/actions.ts', {
    '@/lib/auth/admin': { getAdminUserId: async () => adminId },
    '@/lib/supabase/server': {
      createAdminClient: () => {
        clientCreated += 1;
        return admin;
      },
    },
  });
  return {
    actions,
    clientCreated: () => clientCreated,
    concurrentStartCount: () => concurrentStartCount,
    filters,
  };
}

async function main() {
  const unauthorized = harness({ adminId: null });
  await assert.rejects(
    () => unauthorized.actions.runPublicationValidation(examId),
    /Authentication required/
  );
  assert.equal(unauthorized.clientCreated(), 0);

  const invalid = harness();
  await assert.rejects(
    () => invalid.actions.runPublicationValidation('not-a-uuid'),
    /valid examination/
  );
  assert.equal(invalid.clientCreated(), 0);

  const valid = harness();
  const result = await valid.actions.runPublicationValidation(examId);
  assert.equal(result.canPublish, true);
  assert.equal(result.totalStudents, 1);
  assert.equal(valid.clientCreated(), 1);
  assert.equal(valid.concurrentStartCount(), 4);
  assert.ok(
    valid.filters.some(
      ([table, column, value]) =>
        table === 'student_results' && column === 'student.examination_id' && value === examId
    )
  );

  const failed = harness({ failingTable: 'subjects' });
  await assert.rejects(
    () => failed.actions.runPublicationValidation(examId),
    (error) =>
      error.message === 'Publication validation could not be completed. Please try again.' &&
      !error.message.includes('raw database secret')
  );

  const stubs = harness({ adminId: null });
  await assert.rejects(() => stubs.actions.publishExamination(examId), /Authentication required/);
  await assert.rejects(() => stubs.actions.unpublishExamination(examId), /Authentication required/);

  console.log(
    'PASS: publication actions enforce auth/UUID checks, start four reads concurrently, scope results, and hide database errors.'
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
