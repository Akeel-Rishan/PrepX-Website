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
const request = {
  examinationId,
  sourceColumns: ['Candidate ID', 'Candidate', 'Institution', 'Mathematical Studies'],
  detectedBaseColumns: [],
  detectedSubjects: [],
  missingRequiredColumns: ['index_number', 'full_name', 'school_name'],
  issueSummaries: ['Index number is required.'],
};

function harness({ adminId = 'admin-id', status = 'DRAFT', aiError = null } = {}) {
  const aiInputs = [];
  let clientCreated = 0;
  const client = {
    from(table) {
      const query = {
        select() { return query; },
        eq() { return query; },
        order() { return query; },
        maybeSingle: async () => ({
          data: table === 'examinations' ? { status } : null,
          error: null,
        }),
        then(resolve) {
          return resolve({
            data: table === 'subjects'
              ? [{ subject_name: 'Mathematics', subject_code: 'MAT' }]
              : [],
            error: null,
          });
        },
      };
      return query;
    },
  };
  const actions = load('src/lib/actions/import-ai.ts', {
    '@/lib/auth/admin': { getAdminUserId: async () => adminId },
    '@/lib/supabase/server': {
      createAdminClient: () => {
        clientCreated += 1;
        return client;
      },
    },
    '@/lib/ai/import-assistant': {
      requestImportAssistantSuggestions: async input => {
        aiInputs.push(input);
        if (aiError) throw new Error(aiError);
        return {
          headline: 'Column matches found',
          summary: 'Review the suggested mappings.',
          mappings: [
            {
              source: 'Candidate ID',
              target: 'index_number',
              confidence: 'high',
              reason: 'Candidate ID identifies the result record.',
            },
          ],
          guidance: ['Apply the mapping and run validation again.'],
        };
      },
    },
  });
  return { ...actions, aiInputs, clientCreated: () => clientCreated };
}

async function main() {
  const previousGeminiKey = process.env.GEMINI_API_KEY;
  const previousGoogleKey = process.env.GOOGLE_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key';
  delete process.env.GOOGLE_API_KEY;
  try {
    const unauthorized = harness({ adminId: null });
    assert.match((await unauthorized.getImportAiSuggestionsAction(request)).error, /Authentication/);
    assert.equal(unauthorized.clientCreated(), 0);

    const invalid = harness();
    assert.match(
      (await invalid.getImportAiSuggestionsAction({ ...request, examinationId: 'invalid' })).error,
      /Invalid assistant request/
    );
    assert.equal(invalid.clientCreated(), 0);

    const published = harness({ status: 'PUBLISHED' });
    assert.match(
      (await published.getImportAiSuggestionsAction(request)).error,
      /read-only/
    );
    assert.equal(published.aiInputs.length, 0);

    const valid = harness();
    const result = await valid.getImportAiSuggestionsAction(request);
    assert.equal(result.success, true);
    assert.equal(valid.aiInputs.length, 1);
    assert.deepEqual(valid.aiInputs[0].expectedSubjects, [
      { name: 'Mathematics', code: 'MAT' },
    ]);
    assert.equal(JSON.stringify(valid.aiInputs[0]).includes('nic_number'), false);
    assert.equal(JSON.stringify(valid.aiInputs[0]).includes('full_name'), true);

    const failed = harness({ aiError: 'provider-secret' });
    const failedResult = await failed.getImportAiSuggestionsAction(request);
    assert.equal(failedResult.success, false);
    assert.match(failedResult.error, /temporarily unavailable/);
    assert.equal(failedResult.error.includes('provider-secret'), false);

    delete process.env.GEMINI_API_KEY;
    const unconfigured = harness();
    assert.match(
      (await unconfigured.getImportAiSuggestionsAction(request)).error,
      /not configured/
    );
    assert.equal(unconfigured.clientCreated(), 0);
  } finally {
    if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousGeminiKey;
    if (previousGoogleKey === undefined) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = previousGoogleKey;
  }
  console.log('PASS: AI import assistant auth, validation, exam locks, subject scoping, privacy boundary, safe failures, and configuration guard.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
