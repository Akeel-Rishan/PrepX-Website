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

function queryHarness(response) {
  const calls = [];
  const responses = Array.isArray(response) ? response : [response];
  let responseIndex = 0;
  const client = {
    from(table) {
      calls.push(['from', table]);
      const query = {
        select(columns, options) {
          calls.push(['select', columns, options]);
          return query;
        },
        eq(column, value) {
          calls.push(['eq', column, value]);
          return query;
        },
        gte(column, value) {
          calls.push(['gte', column, value]);
          return query;
        },
        lte(column, value) {
          calls.push(['lte', column, value]);
          return query;
        },
        order(column, options) {
          calls.push(['order', column, options]);
          return query;
        },
        range(from, to) {
          calls.push(['range', from, to]);
          return query;
        },
        then(resolve, reject) {
          const current = responses[Math.min(responseIndex, responses.length - 1)];
          responseIndex += 1;
          return Promise.resolve(current).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { client, calls };
}

async function main() {
  const { AUDIT_ACTION_META, AUDIT_ACTION_GROUPS, getAuditSummary } = load(
    'src/lib/audit-actions.ts'
  );
  for (const action of [
    'EXAMINATION_PUBLISHED',
    'EXAMINATION_UNPUBLISHED',
    'STUDENT_DELETED',
    'SUBJECT_REORDERED',
    'RESULT_CREATED',
    'RESULT_UPDATED',
    'IMPORT_COMPLETED',
  ]) {
    assert.ok(AUDIT_ACTION_META[action], `${action} must have display metadata`);
    assert.ok(
      AUDIT_ACTION_GROUPS.some((group) => group.actions.includes(action)),
      `${action} must be filterable`
    );
  }
  assert.equal(
    getAuditSummary('EXAMINATION_PUBLISHED', { students: 60, complete: 57 }, null),
    '60 students • 57 complete'
  );
  assert.equal(getAuditSummary('STUDENT_DELETED', null, { full_name: 'M. Akeel' }), 'M. Akeel');
  assert.equal(
    getAuditSummary('IMPORT_COMPLETED', { rows_processed: 57, grades_written: 285 }, null),
    '57 rows • 285 grades'
  );
  assert.equal(getAuditSummary('RESULT_UPDATED', { grade: 'A' }, { grade: 'B' }), 'Grade B to A');

  const rows = Array.from({ length: 25 }, (_, index) => ({
    id: `event-${index}`,
    action: 'STUDENT_CREATED',
    created_at: '2026-09-27T10:00:00.000Z',
  }));
  const filtered = queryHarness({ data: rows, count: 142, error: null });
  const { getAuditLogs } = load('src/lib/data/audit-logs.ts', {
    '@/lib/supabase/server': { createAdminClient: () => filtered.client },
  });
  const result = await getAuditLogs({
    page: 2,
    action: ' STUDENT_CREATED ',
    entityType: ' student ',
    dateFrom: '2026-09-01',
    dateTo: '2026-09-27',
  });
  assert.equal(result.currentPage, 2);
  assert.equal(result.pageSize, 25);
  assert.equal(result.totalCount, 142);
  assert.equal(result.totalPages, 6);
  assert.deepEqual(
    filtered.calls.find((call) => call[0] === 'range'),
    ['range', 25, 49]
  );
  assert.ok(
    filtered.calls.some(
      (call) => call[0] === 'eq' && call[1] === 'action' && call[2] === 'STUDENT_CREATED'
    )
  );
  assert.ok(
    filtered.calls.some(
      (call) => call[0] === 'eq' && call[1] === 'entity_type' && call[2] === 'student'
    )
  );
  assert.ok(
    filtered.calls.some(
      (call) =>
        call[0] === 'gte' && call[1] === 'created_at' && call[2] === '2026-09-01T00:00:00.000Z'
    )
  );
  assert.ok(
    filtered.calls.some(
      (call) =>
        call[0] === 'lte' && call[1] === 'created_at' && call[2] === '2026-09-27T23:59:59.999Z'
    )
  );
  assert.deepEqual(
    filtered.calls.filter((call) => call[0] === 'order').map((call) => call[1]),
    ['created_at', 'id']
  );

  const retried = queryHarness([
    { data: null, count: null, error: { code: '', message: 'TypeError: fetch failed' } },
    { data: rows, count: 25, error: null },
  ]);
  const retryModule = load('src/lib/data/audit-logs.ts', {
    '@/lib/supabase/server': { createAdminClient: () => retried.client },
  });
  const retryResult = await retryModule.getAuditLogs();
  assert.equal(retryResult.logs.length, 25);
  assert.equal(retryResult.error, undefined);
  assert.equal(
    retried.calls.filter((call) => call[0] === 'range').length,
    2,
    'transient reads should retry once'
  );

  const failed = queryHarness({ data: null, count: null, error: { code: 'TEST' } });
  const failureModule = load('src/lib/data/audit-logs.ts', {
    '@/lib/supabase/server': { createAdminClient: () => failed.client },
  });
  const failure = await failureModule.getAuditLogs();
  assert.deepEqual(failure.logs, []);
  assert.equal(failure.totalCount, 0);
  assert.match(failure.error, /could not be loaded/i);

  console.log(
    'PASS: audit metadata, summaries, pagination, filters, transient retries, and safe query failures behave correctly.'
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
