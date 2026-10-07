// Launcher only: Node APIs never enter the k6 script bundle.
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { spawnSync } = require('node:child_process');
const { load } = require('./loader.cjs');
const root = path.resolve(__dirname, '../..');
try {
  const profile = process.argv[2];
  if (
    process.argv.length !== 3 ||
    !['smoke', 'load', 'stress', 'soak', 'rate-limit'].includes(profile)
  )
    throw new Error('Select one supported profile; extra CLI overrides are not accepted.');
  const file = path.join(root, '.env.load');
  let stored = {};
  try {
    if (fs.existsSync(file)) stored = parseEnv(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new Error('Unable to read .env.load; values were not logged.');
  }
  const supplied = { ...stored, ...process.env, K6_PROFILE: profile };
  load(path.join(__dirname, 'config.js')).readConfig(supplied);
  // Pass only approved load settings plus OS executable lookup requirements, not application secrets.
  const env = {};
  for (const [key, value] of Object.entries(supplied))
    if (
      key === 'BASE_URL' ||
      key === 'K6_PROFILE' ||
      key.startsWith('LOAD_TEST_') ||
      /^(PATH|Path|SystemRoot|SYSTEMROOT|WINDIR|TEMP|TMP|HOME|USERPROFILE|APPDATA|LOCALAPPDATA)$/.test(
        key
      )
    )
      env[key] = value;
  env.K6_NO_USAGE_REPORT = 'true';
  fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
  const args = ['run', '--no-usage-report', '--config', path.join(__dirname, 'k6.json')];
  if (supplied.LOAD_TEST_EXPORT === 'true')
    args.push('--out', 'json=tests/load/results/metrics.json');
  args.push('tests/load/search.js');
  const result = spawnSync('k6', args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
  if (result.error)
    throw new Error('k6 could not start. Install k6 and make it available on PATH.');
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
