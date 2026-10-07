const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { load } = require('../test-result-search.cjs');
const { root, configuration, installNetworkGuard } = require('./config.cjs');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function data(result) {
  assert.equal(
    result.error?.code ?? null,
    null,
    'Database operation failed (provider details suppressed)'
  );
  return result.data;
}
function form(values) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== null) result.set(key, String(value));
  return result;
}
async function action(promise) {
  try {
    return await promise;
  } catch (error) {
    if (error.integrationRedirect) return { redirect: error.integrationRedirect };
    throw error;
  }
}
function connect(config) {
  const fetch = installNetworkGuard(config.url);
  return (key) =>
    createClient(config.url, key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { fetch },
    });
}
async function cleanup(config, manifest) {
  assert(uuid.test(manifest.runId));
  const marker = `PREPX-INTEGRATION-${manifest.runId}`;
  const service = connect(config)(config.service);
  // Authenticate ownership before deleting any rows or users from a saved manifest.
  for (const id of manifest.users) {
    assert(uuid.test(id));
    const result = await service.auth.admin.getUserById(id);
    if (result.error?.status === 404) continue;
    assert(
      !result.error && result.data.user.app_metadata.prepx_test_run === manifest.runId,
      'Cleanup ownership check failed'
    );
  }
  data(await service.from('examinations').delete().eq('organization_name', marker));
  for (const id of manifest.users) {
    data(await service.from('audit_logs').delete().eq('admin_id', id));
    const result = await service.auth.admin.deleteUser(id);
    assert(!result.error || result.error.status === 404, 'Test user cleanup failed');
  }
  const leftover = data(
    await service.from('examinations').select('id').eq('organization_name', marker)
  );
  assert.equal(leftover.length, 0);
}
async function context() {
  const config = configuration();
  const client = connect(config);
  const db = client(config.service),
    anonymous = client(config.anon);
  // Probe before creating data, with a bounded local-only transport.
  data(await db.from('examinations').select('id').limit(1));
  const manifest = { runId: randomUUID(), users: [] };
  const directory = path.join(root, '.integration/runs');
  fs.mkdirSync(directory, { recursive: true });
  const filename = path.join(directory, manifest.runId + '.json');
  const persist = () => fs.writeFileSync(filename, JSON.stringify(manifest), { mode: 0o600 });
  persist();
  const marker = `PREPX-INTEGRATION-${manifest.runId}`;
  const c = { config, db, anonymous, manifest, marker, form, action, data, load };
  c.cleanup = async () => {
    await cleanup(config, manifest);
    fs.unlinkSync(filename);
  };
  try {
    for (const role of ['admin', 'member']) {
      const password = randomBytes(24).toString('base64url') + 'aA1!';
      const email = `${role}-${manifest.runId}@example.invalid`;
      const result = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { prepx_test_run: manifest.runId },
      });
      assert(!result.error && result.data.user, 'Test auth user creation failed');
      const id = result.data.user.id;
      manifest.users.push(id);
      persist();
      c[role + 'Id'] = id;
      if (role === 'admin') data(await db.from('admin_profiles').insert({ user_id: id }));
      const session = client(config.anon);
      const signed = await session.auth.signInWithPassword({ email, password });
      assert(!signed.error && signed.data.session, 'Test sign-in failed');
      c[role] = session;
    }
    c.as = (session) => {
      const overrides = {
        '@/lib/supabase/server': {
          createClient: async () => session,
          createAdminClient: () => db,
          createPublicClient: () => anonymous,
        },
        'next/cache': {
          revalidatePath() {},
          revalidateTag() {},
          unstable_noStore() {},
          unstable_cache: (fn) => fn,
        },
        'next/navigation': {
          redirect(url) {
            const error = new Error('Test redirect');
            error.integrationRedirect = url;
            throw error;
          },
        },
      };
      return (file) => load(file, overrides); // Actual authorization helpers, validators, audit and DB queries run.
    };
    c.app = c.as(c.admin);
    c.exam = async (name = 'Fake Examination') => {
      const result = await action(
        c
          .app('src/lib/actions/examinations.ts')
          .saveExaminationAction({}, form({ name, year: 2026, organization_name: marker }))
      );
      assert(result.redirect, 'Examination create did not redirect');
      const id = result.redirect.split('/').pop();
      return data(await db.from('examinations').select('*').eq('id', id).single());
    };
    c.subject = async (exam, name = 'Fake Subject', required = true) => {
      assert.equal(
        (
          await c
            .app('src/lib/actions/subjects.ts')
            .saveSubjectAction(
              {},
              form({
                examination_id: exam.id,
                subject_name: name,
                subject_code: name.replaceAll(' ', '').slice(-10),
                required: String(required),
              })
            )
        ).success,
        true
      );
      return data(
        await db
          .from('subjects')
          .select('*')
          .eq('examination_id', exam.id)
          .eq('subject_name', name)
          .single()
      );
    };
    c.student = async (exam, index = 'FAKE1', nic = '000000000000') => {
      const result = await action(
        c
          .app('src/lib/actions/students.ts')
          .saveStudentAction(
            {},
            form({
              examination_id: exam.id,
              index_number: index,
              nic_number: nic,
              full_name: 'Fictional Student',
              school_name: 'Fictional School',
            })
          )
      );
      assert(result.redirect, 'Student create did not redirect');
      return data(
        await db.from('students').select('*').eq('id', result.redirect.split('/').pop()).single()
      );
    };
    c.audit = async (type) =>
      data(await db.from('audit_logs').select('*').eq('admin_id', c.adminId).eq('action', type));
    c.searchRoute = (limit = 1000) => {
      const { MemoryRateLimitStore } = load('src/lib/rate-limit/memory-store.ts');
      const { readRateLimitConfig } = load('src/lib/rate-limit/config.ts');
      const { createResultSearchLimiter } = load('src/lib/rate-limit/result-search.ts');
      const clock = () => 1800000000000;
      const limiter = createResultSearchLimiter(
        readRateLimitConfig({
          NODE_ENV: 'test',
          RESULT_SEARCH_RATE_LIMIT: String(limit),
          RESULT_SEARCH_IDENTIFIER_LIMIT: String(limit),
        }),
        new MemoryRateLimitStore(clock),
        clock
      );
      return load('src/app/api/results/search/route.ts', {
        '@/lib/supabase/server': { createAdminClient: () => db },
        '@/lib/rate-limit': { checkResultSearchRateLimit: limiter },
      });
    };
    return c;
  } catch (error) {
    try {
      await c.cleanup();
    } catch {
      console.error('Fixture cleanup failed; retain .integration/runs manifest for teardown.');
    }
    throw error;
  }
}
module.exports = { context, cleanup, configuration, data, form, action, root };
