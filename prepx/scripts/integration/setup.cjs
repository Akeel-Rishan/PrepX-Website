const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, validate } = require('./config.cjs');
let stage = 'Docker preflight';
function command(args) {
  const env = { ...process.env };
  for (const key of Object.keys(env))
    if (/^SUPABASE_|^PG|^DATABASE_URL$/.test(key)) delete env[key];
  env.SUPABASE_EXPERIMENTAL_STACK = '0';
  const result = spawnSync(
    process.execPath,
    [process.env.npm_execpath, 'exec', '--no', '--', 'supabase', ...args],
    { cwd: root, env, encoding: 'utf8', windowsHide: true }
  );
  if (result.status !== 0)
    throw new Error(
      'Local Supabase command failed. Install the declared Supabase CLI and start Docker; no credentials were logged.'
    );
  return result.stdout;
}
try {
  if (spawnSync('docker', ['info'], { stdio: 'ignore', windowsHide: true }).status !== 0)
    throw new Error(
      'Docker is unavailable. Install/start Docker Desktop, then rerun test:integration:setup.'
    );
  const work = path.join(root, '.integration', 'local');
  stage = 'local stack configuration';
  const folder = path.join(work, 'supabase');
  fs.mkdirSync(path.join(folder, 'migrations'), { recursive: true });
  fs.writeFileSync(
    path.join(folder, 'config.toml'),
    `project_id = "prepx-integration"
[api]
enabled = true
port = 55321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
[db]
port = 55322
shadow_port = 55320
major_version = 17
[db.seed]
enabled = false
[studio]
enabled = false
[analytics]
enabled = false
[local_smtp]
enabled = false
[auth]
enabled = true
site_url = "http://127.0.0.1:3015"
[auth.email]
enable_signup = true
enable_confirmations = false
[storage]
enabled = false
[edge_runtime]
enabled = false
`
  );
  for (const file of fs
    .readdirSync(path.join(root, 'supabase/migrations'))
    .filter((f) => f.endsWith('.sql')))
    fs.copyFileSync(
      path.join(root, 'supabase/migrations', file),
      path.join(folder, 'migrations', file)
    );
  stage = 'starting dedicated local stack';
  command(['start', '--workdir', work]);
  stage = 'applying local migrations';
  command(['migration', 'up', '--local', '--workdir', work]);
  stage = 'reading local legacy credentials';
  const state = JSON.parse(command(['status', '--output', 'json', '--workdir', work]));
  const config = {
    PREPX_TEST_CONFIRM: 'LOCAL_TEST_DATABASE_ONLY',
    PREPX_TEST_SUPABASE_URL: state.API_URL,
    PREPX_TEST_ANON_KEY: state.ANON_KEY,
    PREPX_TEST_SERVICE_ROLE_KEY: state.SERVICE_ROLE_KEY,
  };
  validate(config);
  const file = path.join(root, '.env.test');
  if (!fs.existsSync(file))
    fs.writeFileSync(
      file,
      Object.entries(config)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n') + '\n',
      { mode: 0o600, flag: 'wx' }
    );
  console.log(
    'Dedicated local stack started; repository migrations applied without reset. .env.test created if absent. Keys are never printed.'
  );
} catch {
  console.error(
    `Integration setup failed at ${stage}. Install/start Docker and the declared Supabase CLI. No raw command output or credentials were logged.`
  );
  process.exitCode = 1;
}
