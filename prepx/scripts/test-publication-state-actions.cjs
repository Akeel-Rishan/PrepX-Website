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

function harness({
  adminId = 'admin-id',
  status = 'DRAFT',
  examinationExists = true,
  fetchError = false,
  updateError = false,
  conflict = false,
  auditError = false,
  rollbackError = false,
  validation = 'valid',
} = {}) {
  let clientCount = 0;
  let validationCalls = 0;
  let updateCalls = 0;
  let timestamp = 0;
  const auditEntries = [];
  const paths = [];
  const tags = [];
  let examination = examinationExists
    ? {
        id: examId,
        name: 'PrepX Model Exam',
        year: 2027,
        status,
        publication_date: status === 'PUBLISHED' ? '2027-09-01T00:00:00.000Z' : null,
        updated_at: '2027-09-01T00:00:00.000Z',
      }
    : null;

  const admin = {
    from(table) {
      assert.equal(table, 'examinations');
      let mutation = null;
      const filters = [];
      const query = {
        select() {
          return query;
        },
        update(values) {
          mutation = values;
          return query;
        },
        eq(column, value) {
          filters.push([column, value]);
          return query;
        },
        async maybeSingle() {
          if (!mutation) {
            if (fetchError) return { data: null, error: { code: 'DB_FETCH' } };
            return { data: examination ? { ...examination } : null, error: null };
          }

          updateCalls += 1;
          if (updateCalls === 1 && updateError) {
            return { data: null, error: { code: 'DB_UPDATE' } };
          }
          if (updateCalls === 1 && conflict) return { data: null, error: null };
          if (updateCalls > 1 && rollbackError) {
            return { data: null, error: { code: 'DB_ROLLBACK' } };
          }
          if (!examination) return { data: null, error: null };
          const matches = filters.every(([column, value]) => examination[column] === value);
          if (!matches) return { data: null, error: null };

          timestamp += 1;
          examination = {
            ...examination,
            ...mutation,
            updated_at: `2027-09-01T00:00:0${timestamp}.000Z`,
          };
          return { data: { id: examination.id, updated_at: examination.updated_at }, error: null };
        },
      };
      return query;
    },
  };

  const actions = load('src/lib/actions/publication.ts', {
    'next/cache': {
      revalidatePath: (value) => paths.push(value),
      revalidateTag: (value) => tags.push(value),
    },
    '@/lib/auth/admin': { getAdminUserId: async () => adminId },
    '@/lib/supabase/server': {
      createAdminClient: () => {
        clientCount += 1;
        return admin;
      },
    },
    '@/lib/data/publication': {
      getPublicationValidation: async () => {
        validationCalls += 1;
        if (validation === 'error') throw new Error('database secret');
        if (validation === 'missing') return null;
        if (validation === 'blocked') {
          return {
            canPublish: false,
            blockingErrors: ['No students found.'],
            stats: { totalStudents: 0, completeStudents: 0 },
          };
        }
        return {
          canPublish: true,
          blockingErrors: [],
          stats: { totalStudents: 60, completeStudents: 58 },
        };
      },
    },
    '@/lib/audit': {
      createAuditLog: async (entry) => {
        if (auditError) throw new Error('audit failed');
        auditEntries.push(entry);
      },
    },
  });

  return {
    actions,
    examination: () => examination,
    clientCount: () => clientCount,
    validationCalls: () => validationCalls,
    updateCalls: () => updateCalls,
    auditEntries,
    paths,
    tags,
  };
}

async function main() {
  const unauthorized = harness({ adminId: null });
  assert.deepEqual(await unauthorized.actions.publishExaminationAction(examId), {
    error: 'Authentication required.',
  });
  assert.equal(unauthorized.clientCount(), 0);

  const invalid = harness();
  assert.deepEqual(await invalid.actions.publishExaminationAction('not-a-uuid'), {
    error: 'Invalid examination ID.',
  });
  assert.equal(invalid.clientCount(), 0);

  const missing = harness({ examinationExists: false });
  assert.match((await missing.actions.publishExaminationAction(examId)).error, /not found/i);

  const archived = harness({ status: 'ARCHIVED' });
  assert.match((await archived.actions.publishExaminationAction(examId)).error, /Archived/);
  assert.equal(archived.validationCalls(), 0);

  const alreadyPublished = harness({ status: 'PUBLISHED' });
  assert.match(
    (await alreadyPublished.actions.publishExaminationAction(examId)).error,
    /already published/
  );

  const blocked = harness({ validation: 'blocked' });
  assert.match((await blocked.actions.publishExaminationAction(examId)).error, /No students/);
  assert.equal(blocked.updateCalls(), 0);

  const validationError = harness({ validation: 'error' });
  assert.equal(
    (await validationError.actions.publishExaminationAction(examId)).error,
    'Could not validate the examination. Please try again.'
  );

  const published = harness();
  assert.deepEqual(await published.actions.publishExaminationAction(examId), {});
  assert.equal(published.examination().status, 'PUBLISHED');
  assert.ok(published.examination().publication_date);
  assert.equal(published.auditEntries[0].action, 'EXAMINATION_PUBLISHED');
  assert.equal(published.auditEntries[0].new_value.students, 60);
  assert.ok(published.tags.includes('examinations'));
  assert.ok(published.tags.includes('dashboard'));
  assert.ok(published.paths.includes('/admin/publication'));
  assert.ok(published.paths.includes('/results'));

  const stale = harness({ conflict: true });
  assert.match((await stale.actions.publishExaminationAction(examId)).error, /changed/);
  assert.equal(stale.auditEntries.length, 0);

  const publishAuditFailure = harness({ auditError: true });
  assert.match(
    (await publishAuditFailure.actions.publishExaminationAction(examId)).error,
    /cancelled/
  );
  assert.equal(publishAuditFailure.examination().status, 'DRAFT');
  assert.equal(publishAuditFailure.updateCalls(), 2);

  const publishRollbackFailure = harness({ auditError: true, rollbackError: true });
  assert.match(
    (await publishRollbackFailure.actions.publishExaminationAction(examId)).error,
    /were published/
  );
  assert.equal(publishRollbackFailure.examination().status, 'PUBLISHED');

  const notPublished = harness({ status: 'READY' });
  assert.match(
    (await notPublished.actions.unpublishExaminationAction(examId)).error,
    /Only published/
  );

  const unpublished = harness({ status: 'PUBLISHED' });
  assert.deepEqual(await unpublished.actions.unpublishExaminationAction(examId), {});
  assert.equal(unpublished.examination().status, 'DRAFT');
  assert.equal(unpublished.examination().publication_date, null);
  assert.equal(unpublished.auditEntries[0].action, 'EXAMINATION_UNPUBLISHED');
  assert.equal(unpublished.auditEntries[0].old_value.status, 'PUBLISHED');
  assert.equal(unpublished.auditEntries[0].new_value.status, 'DRAFT');

  const unpublishAuditFailure = harness({ status: 'PUBLISHED', auditError: true });
  assert.match(
    (await unpublishAuditFailure.actions.unpublishExaminationAction(examId)).error,
    /cancelled/
  );
  assert.equal(unpublishAuditFailure.examination().status, 'PUBLISHED');

  const databaseFailure = harness({ updateError: true });
  assert.equal(
    (await databaseFailure.actions.publishExaminationAction(examId)).error,
    'Failed to publish. Please try again.'
  );

  console.log(
    'PASS: publication state actions enforce auth, UUIDs, validation, status guards, optimistic concurrency, audit rollback, cache refresh, publish, and unpublish transitions.'
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
