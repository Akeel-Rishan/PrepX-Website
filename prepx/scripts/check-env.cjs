const production = process.argv.includes('--production');
const errors = [];

function value(name) {
  return process.env[name]?.trim() ?? '';
}

function reject(name, reason) {
  errors.push(`${name}: ${reason}`);
}

function required(name) {
  const current = value(name);
  if (!current) reject(name, 'missing');
  else if (/replace|placeholder|your[_-]|example(?:\.|_)/i.test(current)) {
    reject(name, 'placeholder value');
  }
  return current;
}

function url(
  name,
  current,
  { httpsOnly = production, allowLocalhost = process.env.VERCEL !== '1' } = {}
) {
  if (!current) return;
  try {
    const parsed = new URL(current);
    if (parsed.username || parsed.password) reject(name, 'must not contain credentials');
    const localHttp =
      allowLocalhost &&
      parsed.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(parsed.hostname);
    if (httpsOnly && parsed.protocol !== 'https:' && !localHttp) reject(name, 'must use HTTPS');
    if (!httpsOnly && !['http:', 'https:'].includes(parsed.protocol)) {
      reject(name, 'must use HTTP or HTTPS');
    }
  } catch {
    reject(name, 'invalid URL');
  }
}

function integer(name, fallback, maximum) {
  const current = value(name);
  if (!current) return fallback;
  if (!/^[1-9][0-9]*$/.test(current) || Number(current) > maximum) {
    reject(name, `must be an integer between 1 and ${maximum}`);
  }
  return Number(current);
}

for (const name of Object.keys(process.env)) {
  if (
    name.startsWith('NEXT_PUBLIC_') &&
    /(SECRET|TOKEN|PASSWORD|PRIVATE|SERVICE_ROLE|REDIS|GEMINI|GOOGLE_API_KEY)/i.test(name)
  ) {
    reject(name, 'secret-looking variables must not use NEXT_PUBLIC_');
  }
}

const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL');
required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
required('SUPABASE_SECRET_KEY');
url('NEXT_PUBLIC_SUPABASE_URL', supabaseUrl);

const appUrl = value('NEXT_PUBLIC_APP_URL') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
if (production && !appUrl) reject('NEXT_PUBLIC_APP_URL', 'missing (or enable VERCEL_URL)');
if (appUrl) url('NEXT_PUBLIC_APP_URL', appUrl);

integer('RESULT_SEARCH_RATE_LIMIT', 20, 100_000);
integer('RESULT_SEARCH_RATE_WINDOW_SECONDS', 300, 86_400);
integer('RESULT_SEARCH_IDENTIFIER_LIMIT', 5, 100_000);
integer('RESULT_SEARCH_IDENTIFIER_WINDOW_SECONDS', 300, 86_400);
integer('RESULT_SEARCH_RATE_LIMIT_TIMEOUT_MS', 2000, 10_000);
integer('RESULT_SEARCH_TRUSTED_PROXY_HOPS', 1, 10);

const provider = value('RESULT_SEARCH_RATE_LIMIT_PROVIDER');
if (provider && !['memory', 'upstash'].includes(provider)) {
  reject('RESULT_SEARCH_RATE_LIMIT_PROVIDER', 'must be memory or upstash');
}
if (production && provider && provider !== 'upstash') {
  reject('RESULT_SEARCH_RATE_LIMIT_PROVIDER', 'production must use upstash');
}

const failureMode = value('RESULT_SEARCH_RATE_LIMIT_FAILURE_MODE');
if (failureMode && !['closed', 'open'].includes(failureMode)) {
  reject('RESULT_SEARCH_RATE_LIMIT_FAILURE_MODE', 'must be closed or open');
}
if (production && failureMode === 'open') {
  reject('RESULT_SEARCH_RATE_LIMIT_FAILURE_MODE', 'production deployment must fail closed');
}

const proxy = value('RESULT_SEARCH_TRUSTED_PROXY');
if (proxy && !['none', 'vercel', 'forwarded'].includes(proxy)) {
  reject('RESULT_SEARCH_TRUSTED_PROXY', 'must be none, vercel, or forwarded');
}
if (process.env.VERCEL === '1' && proxy && proxy !== 'vercel') {
  reject('RESULT_SEARCH_TRUSTED_PROXY', 'leave unset on Vercel or set to vercel');
}

for (const name of ['SECURITY_HTTPS_ONLY', 'SECURITY_HSTS_INCLUDE_SUBDOMAINS']) {
  const current = value(name);
  if (current && current !== 'true') reject(name, 'when set, the only accepted value is true');
}
if (process.env.VERCEL === '1' && value('SECURITY_HTTPS_ONLY')) {
  reject('SECURITY_HTTPS_ONLY', 'leave unset on Vercel; HTTPS is platform-managed');
}

const redisUrl = production ? required('UPSTASH_REDIS_REST_URL') : value('UPSTASH_REDIS_REST_URL');
const redisToken = production ? required('UPSTASH_REDIS_REST_TOKEN') : value('UPSTASH_REDIS_REST_TOKEN');
const hashSecret = production ? required('RATE_LIMIT_HASH_SECRET') : value('RATE_LIMIT_HASH_SECRET');
if (redisUrl && !/^https:\/\/[a-z0-9-]+\.upstash\.io\/?$/i.test(redisUrl)) {
  reject('UPSTASH_REDIS_REST_URL', 'must be an Upstash HTTPS REST endpoint');
}
if ((redisUrl && !redisToken) || (!redisUrl && redisToken)) {
  reject('UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN', 'configure both together');
}
if (hashSecret && (hashSecret.length < 32 || hashSecret !== process.env.RATE_LIMIT_HASH_SECRET)) {
  reject('RATE_LIMIT_HASH_SECRET', 'must be at least 32 characters with no surrounding whitespace');
}

for (const name of ['GEMINI_API_KEY', 'GOOGLE_API_KEY']) {
  const current = value(name);
  if (current && /replace|placeholder|your[_-]|example/i.test(current)) {
    reject(name, 'placeholder value');
  }
}

if (errors.length) {
  console.error(`Environment validation failed (${production ? 'production' : 'development'}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Environment validation passed (${production ? 'production' : 'development'}); values were not printed.`);
}
