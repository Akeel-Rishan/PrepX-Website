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

const examinationId = '3a320000-0000-4000-8000-000000002026';
const valid = {
  name: 'PrepX Mock Examination',
  year: '2028',
  organization_name: 'PrepX Institute',
  result_notice: '',
};

function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function harness({ user = true, profile = true, status = 'DRAFT', exists = true } = {}) {
  let version = 1;
  let examination = exists ? {
    id: examinationId,
    name: 'Existing Examination',
    year: 2026,
    organization_name: 'PrepX',
    result_notice: null,
    status,
    publication_date: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: 'v1',
  } : null;
  const audits = [];

  const session = {
    auth: { getUser: async () => ({ data: { user: user ? { id: 'admin-id' } : null }, error: null }) },
    from(table) {
      const query = {
        select() { return query; },
        eq() { return query; },
        async maybeSingle() {
          if (table === 'admin_profiles') return { data: profile ? { id: 'profile-id' } : null, error: null };
          return { data: null, error: null };
        },
      };
      return query;
    },
  };

  const admin = {
    from(table) {
      let operation = 'select';
      let payload;
      const filters = {};
      const query = {
        select() { return query; },
        eq(column, value) { filters[column] = value; return query; },
        insert(value) { operation = 'insert'; payload = value; return query; },
        update(value) { operation = 'update'; payload = value; return query; },
        delete() { operation = 'delete'; return query; },
        async maybeSingle() { return execute(false); },
        async single() { return execute(true); },
        then(resolve) { return Promise.resolve(execute(false)).then(resolve); },
      };

      function execute(requireRow) {
        if (table !== 'examinations') return { data: null, error: null };
        if (operation === 'select') return { data: examination, error: null };
        if (operation === 'insert') {
          examination = {
            id: examinationId,
            ...payload,
            status: 'DRAFT',
            publication_date: null,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: 'v1',
          };
          return { data: { id: examinationId }, error: null };
        }
        if (!examination) return { data: null, error: requireRow ? { code: 'PGRST116' } : null };
        if (filters.status && examination.status !== filters.status) return { data: null, error: null };
        if (filters.updated_at && examination.updated_at !== filters.updated_at) return { data: null, error: null };
        if (operation === 'update') {
          version += 1;
          examination = { ...examination, ...payload, updated_at: `v${version}` };
          return { data: { id: examination.id, updated_at: examination.updated_at }, error: null };
        }
        if (operation === 'delete') {
          examination = null;
          return { data: null, error: null };
        }
        return { data: null, error: null };
      }
      return query;
    },
  };

  const actions = load('src/lib/actions/examinations.ts', {
    '@/lib/supabase/server': { createClient: async () => session, createAdminClient: () => admin },
    '@/lib/audit': { createAuditLog: async entry => audits.push(entry) },
    'next/cache': { revalidatePath() {}, revalidateTag() {} },
    'next/navigation': {
      redirect(destination) { throw Object.assign(new Error('REDIRECT'), { destination }); },
    },
  });
  return { ...actions, audits, examination: () => examination };
}

async function main() {
  const { examinationSchema } = load('src/lib/validations/examination.ts');
  assert.equal(examinationSchema.safeParse({ ...valid, name: 'a' }).success, false);
  assert.equal(examinationSchema.safeParse({ ...valid, year: 'abc' }).success, false);
  assert.equal(examinationSchema.safeParse({ ...valid, year: '1999' }).success, false);
  assert.equal(examinationSchema.parse(valid).result_notice, null);

  for (const options of [{ user: false }, { profile: false }]) {
    const actions = harness(options);
    assert.equal((await actions.saveExaminationAction({}, form(valid))).error, 'Authentication required.');
    assert.equal((await actions.archiveExaminationAction(examinationId)).error, 'Authentication required.');
  }

  const invalid = harness();
  assert.equal(
    (await invalid.saveExaminationAction({}, form({ ...valid, id: 'invalid' }))).error,
    'Invalid examination ID.'
  );
  assert.equal((await invalid.archiveExaminationAction('invalid')).error, 'Invalid examination ID.');

  const create = harness({ exists: false });
  await assert.rejects(
    create.saveExaminationAction({}, form(valid)),
    error => error.destination === `/admin/examinations/${examinationId}`
  );
  assert.equal(create.audits[0].action, 'EXAMINATION_CREATED');

  const publishedEdit = harness({ status: 'PUBLISHED' });
  const editResult = await publishedEdit.saveExaminationAction(
    {},
    form({ ...valid, id: examinationId, name: 'Updated Published Examination' })
  );
  assert.equal(editResult.success, true);
  assert.equal(publishedEdit.examination().name, 'Updated Published Examination');
  assert.equal(publishedEdit.audits[0].action, 'EXAMINATION_UPDATED');
  assert.match((await publishedEdit.archiveExaminationAction(examinationId)).error, /cannot be archived/);

  const archive = harness({ status: 'READY' });
  await assert.rejects(
    archive.archiveExaminationAction(examinationId),
    error => error.destination === '/admin/examinations'
  );
  assert.equal(archive.examination().status, 'ARCHIVED');
  assert.equal(archive.audits[0].action, 'EXAMINATION_ARCHIVED');
  assert.deepEqual(await archive.unarchiveExaminationAction(examinationId), {});
  assert.equal(archive.examination().status, 'DRAFT');
  assert.equal(archive.audits[1].action, 'EXAMINATION_UNARCHIVED');

  console.log('PASS: examination validation, authorization, UUID checks, create/edit auditing, published archive protection, archive, restore, and redirects.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
