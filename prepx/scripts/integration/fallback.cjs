// Explicit fallback, NOT evidence of real database constraints, RLS or RPC atomicity.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const env = { ...process.env, NODE_ENV: 'test' };
for (const key of Object.keys(env))
  if (/SUPABASE|UPSTASH|REDIS|RATE_LIMIT|RESULT_SEARCH_|^VERCEL|^GEMINI|^NODE_OPTIONS$/.test(key))
    delete env[key];
console.log('MOCKED FALLBACK ONLY: real Supabase integration is NOT being executed.');
for (const file of [
  'integration/test-safety.cjs',
  'test-public-result-rules.cjs',
  'test-examination-actions.cjs',
  'test-student-actions.cjs',
  'test-grade-actions.cjs',
  'test-import-action.cjs',
  'test-publication-state-actions.cjs',
  'test-auth-session.cjs',
  'test-rate-limit.cjs',
  'test-health-errors.cjs',
]) {
  const result = spawnSync(
    process.execPath,
    ['--require', path.join(__dirname, '../helpers/offline.cjs'), path.join(__dirname, '..', file)],
    { env, stdio: 'inherit', windowsHide: true, cwd: path.join(__dirname, '../..') }
  );
  if (result.status !== 0) {
    process.exitCode = 1;
    break;
  }
}
