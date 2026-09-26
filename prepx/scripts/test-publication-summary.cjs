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

function harness({ status = 'DRAFT', subjects, students, grades, examination = true } = {}) {
  let clientCount = 0;
  const data = {
    examinations: examination
      ? {
          id: examId,
          name: 'PrepX Model Exam',
          year: 2027,
          organization_name: 'PrepX',
          status,
          publication_date: null,
          result_notice: null,
          created_at: '2027-01-01T00:00:00.000Z',
          updated_at: '2027-01-01T00:00:00.000Z',
        }
      : null,
    subjects: subjects ?? [
      { id: 'required', required: true, active: true },
      { id: 'optional', required: false, active: true },
      { id: 'inactive', required: true, active: false },
    ],
    students: students ?? [{ id: 'complete' }, { id: 'partial' }, { id: 'empty' }],
    student_results: grades ?? [
      { student_id: 'complete', subject_id: 'required' },
      { student_id: 'partial', subject_id: 'optional' },
      { student_id: 'complete', subject_id: 'inactive' },
    ],
  };
  const client = {
    from(table) {
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        order() {
          return query;
        },
        range() {
          return query;
        },
        maybeSingle() {
          return Promise.resolve({ data: data[table], error: null });
        },
        then(resolve, reject) {
          return Promise.resolve({ data: data[table], error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const publication = load('src/lib/data/publication.ts', {
    '@/lib/supabase/server': {
      createAdminClient: () => {
        clientCount += 1;
        return client;
      },
    },
  });
  return { publication, clientCount: () => clientCount };
}

async function main() {
  const invalid = harness();
  assert.equal(await invalid.publication.getPublicationValidation('not-a-uuid'), null);
  assert.equal(invalid.clientCount(), 0);

  const missing = harness({ examination: false });
  assert.equal(await missing.publication.getPublicationValidation(examId), null);

  const mixed = harness();
  const result = await mixed.publication.getPublicationValidation(examId);
  assert.deepEqual(result.stats, {
    totalStudents: 3,
    completeStudents: 1,
    incompleteStudents: 1,
    emptyStudents: 1,
    totalSubjects: 3,
    activeSubjects: 2,
    requiredSubjects: 1,
  });
  assert.equal(result.canPublish, true);
  assert.equal(result.blockingErrors.length, 0);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /^2 students/);

  const noSubjects = harness({ subjects: [], grades: [] });
  const blocked = await noSubjects.publication.getPublicationValidation(examId);
  assert.equal(blocked.canPublish, false);
  assert.equal(blocked.blockingErrors.length, 2);
  assert.equal(blocked.stats.completeStudents, 3);

  const archived = harness({ status: 'ARCHIVED' });
  assert.equal((await archived.publication.getPublicationValidation(examId)).canPublish, false);

  console.log(
    'PASS: publication summary handles invalid/missing exams, active-subject coverage, warnings, blocking setup issues, and archived exams.'
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
