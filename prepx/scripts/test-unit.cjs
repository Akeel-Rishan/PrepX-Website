// Keep the existing npm test:logic chain; isolate it from deployment settings.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const env = { ...process.env, NODE_ENV: 'test' };
for (const key of Object.keys(env)) {
  if (/SUPABASE|UPSTASH|REDIS|RATE_LIMIT|RESULT_SEARCH_|^VERCEL|^GEMINI/.test(key)) delete env[key];
}
// Propagate the guard to every Node process in the existing test command chain.
env.NODE_OPTIONS = `--require "${path.join(__dirname, 'helpers/offline.cjs').replaceAll('\\', '/')}"`;
const result = spawnSync(process.execPath, [process.env.npm_execpath, 'run', 'test:logic'], {
  cwd: path.resolve(__dirname, '..'), env, stdio: 'inherit', windowsHide: true,
});
if (result.error) console.error('Could not start the unit-test command.');
process.exitCode = result.status ?? 1;
