const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const root = path.resolve(__dirname, '../..');
const URL_ONLY = 'http://127.0.0.1:55321';
function validate(config) {
  if (
    config.PREPX_TEST_CONFIRM !== 'LOCAL_TEST_DATABASE_ONLY' ||
    config.PREPX_TEST_SUPABASE_URL !== URL_ONLY
  ) {
    throw new Error('Integration safety check failed: use the dedicated local test stack.');
  }
  for (const [name, role] of [
    ['PREPX_TEST_ANON_KEY', 'anon'],
    ['PREPX_TEST_SERVICE_ROLE_KEY', 'service_role'],
  ]) {
    let payload;
    try {
      payload = JSON.parse(Buffer.from(config[name].split('.')[1], 'base64url'));
    } catch {
      /* Reject below. */
    }
    if (payload?.iss !== 'supabase-demo' || payload?.role !== role)
      throw new Error('Integration safety check failed: local legacy JWT keys required.');
  }
  return {
    url: URL_ONLY,
    anon: config.PREPX_TEST_ANON_KEY,
    service: config.PREPX_TEST_SERVICE_ROLE_KEY,
  };
}
function configuration() {
  const file = path.join(root, '.env.test');
  if (!fs.existsSync(file))
    throw new Error(
      'Integration setup unavailable: create .env.test using test:integration:setup; Docker and local Supabase are required.'
    );
  let config;
  try {
    config = parseEnv(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new Error('Unable to read test configuration; no values were logged.');
  }
  return validate(config); // Never falls back to process.env/.env.local.
}
function installNetworkGuard(url) {
  const original = globalThis.fetch;
  return async (input, init = {}) => {
    const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (target.origin !== url)
      throw new Error('Integration request blocked: non-test destination.');
    return original(input, {
      ...init,
      redirect: 'error',
      signal: init.signal ?? AbortSignal.timeout(10000),
    });
  };
}
module.exports = { root, validate, configuration, installNetworkGuard };
