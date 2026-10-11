const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const failures = [];
const repositoryRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();
const applicationRoot = path.join(repositoryRoot, 'prepx');
const tracked = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' }
)
  .split('\0')
  .filter(Boolean)
  .filter((file) => file === 'prepx' || file.startsWith('prepx/'));

const trackedEnvironmentFiles = tracked.filter((file) => /(^|\/)\.env(?:\.|$)/.test(file));
for (const file of trackedEnvironmentFiles) {
  if (!file.endsWith('.example')) failures.push(`tracked non-example environment file: ${file}`);
}

const textFiles = tracked.filter((file) => {
  try {
    const bytes = fs.readFileSync(path.join(repositoryRoot, file));
    return !bytes.includes(0) && bytes.length <= 2_000_000;
  } catch {
    return false;
  }
});

const secretPatterns = [
  ['Supabase secret key', /sb_secret_[A-Za-z0-9_-]{24,}/g],
  ['Google API key', /AIza[0-9A-Za-z_-]{30,}/g],
  ['JWT-like credential', /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g],
];

for (const file of textFiles) {
  const content = fs.readFileSync(path.join(repositoryRoot, file), 'utf8');
  for (const [label, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) failures.push(`${label} pattern in ${file}`);
  }
  const publicSecret = content.match(/NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE|SERVICE_ROLE|REDIS|GEMINI)[A-Z0-9_]*/g);
  if (publicSecret) failures.push(`secret-looking public variable name in ${file}`);
}

for (const required of [
  'prepx/.env.example',
  'prepx/.gitignore',
  'prepx/package-lock.json',
  'prepx/docs/deployment/vercel.md',
]) {
  if (!tracked.includes(required) && !fs.existsSync(path.join(repositoryRoot, required))) {
    failures.push(`missing deployment file: ${required}`);
  }
}

const health = fs.readFileSync(path.join(applicationRoot, 'src/app/api/health/route.ts'), 'utf8');
if (/process\.env[^\n]*(?:json|body|message)/i.test(health)) {
  failures.push('health endpoint may serialize environment data');
}
if (!/status.*service.*timestamp/s.test(health)) failures.push('health response allowlist changed');

for (const relative of [
  'supabase/seeds/dashboard.sql',
  'supabase/seeds/students.sql',
  'scripts/seed-dashboard.ts',
  'scripts/seed-students.ts',
  'public/test-data/valid-import.csv',
  'public/test-data/errors-import.csv',
]) {
  const content = fs.readFileSync(path.join(applicationRoot, relative), 'utf8');
  if (!/(?:Fictional|Example)/.test(content)) {
    failures.push(`fixture is not clearly marked synthetic: ${relative}`);
  }
  const identifiers = content.match(/\b(?:[0-9]{12}|[0-9]{9}[VX])\b/gi) ?? [];
  if (identifiers.some((identifier) => !identifier.startsWith('0'))) {
    failures.push(`fixture contains a non-zero realistic NIC-shaped value: ${relative}`);
  }
}

const staticRoot = path.join(applicationRoot, '.next', 'static');
if (fs.existsSync(staticRoot)) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (/\.(?:js|json)$/.test(entry.name)) files.push(target);
    }
  };
  visit(staticRoot);
  const forbiddenNames = [
    'SUPABASE_SECRET_KEY',
    'UPSTASH_REDIS_REST_TOKEN',
    'RATE_LIMIT_HASH_SECRET',
    'GEMINI_API_KEY',
    'GOOGLE_API_KEY',
  ];
  const secretValues = forbiddenNames
    .map((name) => [name, process.env[name]])
    .filter(([, current]) => typeof current === 'string' && current.length >= 12);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const name of forbiddenNames) {
      if (content.includes(name)) failures.push(`server-only variable name in browser bundle: ${name}`);
    }
    for (const [name, current] of secretValues) {
      if (content.includes(current)) failures.push(`server-only value in browser bundle: ${name}`);
    }
  }
}

if (failures.length) {
  console.error('Deployment static audit failed:');
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('PASS: env files, credential patterns, public variable names, synthetic fixtures, browser bundles, deployment files, and health output were audited without printing secrets.');
}
