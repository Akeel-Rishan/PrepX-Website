const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { load } = require('./loader.cjs');
const configModule = load(path.join(__dirname, 'config.js'));
const checks = load(path.join(__dirname, 'checks.js'));
const env = {
  BASE_URL: 'http://127.0.0.1:3015',
  LOAD_TEST_FIXTURE_CONFIRMED: 'true',
  LOAD_TEST_EXAMINATION_ID: '00000000-0000-4000-8000-000000000001',
  LOAD_TEST_INDEX_NUMBER: 'LOADTEST001',
  LOAD_TEST_NIC: '0'.repeat(12),
};
const json = (value) => JSON.parse(JSON.stringify(value));
const read = (patch) => configModule.readConfig({ ...env, ...patch });
for (const patch of [
  { BASE_URL: '' },
  { BASE_URL: 'https://user:secret@example.invalid' },
  { BASE_URL: 'https://example.invalid/?token=secret' },
  { BASE_URL: 'https://example.invalid' },
  { LOAD_TEST_FIXTURE_CONFIRMED: '' },
  { LOAD_TEST_EXAMINATION_ID: 'bad' },
  { LOAD_TEST_INDEX_NUMBER: 'ACTUAL001' },
  { LOAD_TEST_NIC: '9'.repeat(12) },
  { LOAD_TEST_SEARCH_PATH: '/api/admin/import' },
  { LOAD_TEST_HEALTH_PATH: 'https://example.invalid' },
  { K6_PROFILE: 'stress' },
  { LOAD_TEST_VUS: '1001' },
  { LOAD_TEST_DURATION_SECONDS: '999999' },
  { LOAD_TEST_PAUSE_SECONDS: '0' },
  { K6_HTTP_DEBUG: 'full' },
  { K6_VUS: '500' },
  { LOAD_TEST_AUTH_HEADER: 'Bearer secret\r\nUnsafe: header' },
  { LOAD_TEST_P95_MS: '3000', LOAD_TEST_P99_MS: '2000' },
  { LOAD_TEST_TARGET_ENV: 'production' },
])
  assert.throws(() => read(patch));
const remote = {
  BASE_URL: 'https://performance.example.invalid',
  LOAD_TEST_TARGET_ENV: 'staging',
  LOAD_TEST_APPROVED: 'true',
  LOAD_TEST_APPROVED_HOST: 'performance.example.invalid',
};
assert.equal(read(remote).host, 'performance.example.invalid');
assert.throws(() => read({ ...remote, LOAD_TEST_APPROVED_HOST: 'wrong.example.invalid' }));
assert.throws(() => read({ ...remote, LOAD_TEST_TARGET_ENV: 'production' }));
const production = {
  ...remote,
  LOAD_TEST_TARGET_ENV: 'production',
  LOAD_TEST_ALLOW_PRODUCTION: 'true',
  K6_PROFILE: 'stress',
  LOAD_TEST_ALLOW_HIGH_LOAD: 'true',
};
assert.throws(() => read(production));
assert.equal(read({ ...production, LOAD_TEST_ALLOW_PRODUCTION_STRESS: 'true' }).vus, 500);
for (const profile of ['smoke', 'load', 'stress', 'soak', 'rate-limit']) {
  const c = read({ ...remote, K6_PROFILE: profile, LOAD_TEST_ALLOW_HIGH_LOAD: 'true' });
  const options = json(configModule.buildOptions(c));
  assert.equal(options.maxRedirects, 0);
  assert(!options.systemTags.includes('url') && !options.systemTags.includes('error'));
  assert.equal(options.scenarios.search.exec, 'search');
  assert(options.thresholds.search_successes);
  if (profile === 'stress') {
    assert.equal(Math.max(...options.scenarios.search.stages.map((s) => s.target)), 500);
    assert.equal(options.scenarios.search.startVUs, 0);
    assert.equal(options.scenarios.search.stages[0].target, 50);
  }
  if (profile !== 'rate-limit')
    assert.equal(options.thresholds.search_rate_limited[0].abortOnFail, true);
}
const c = read({});
assert.deepEqual(json(configModule.searchBody(c, 0)), {
  examinationId: env.LOAD_TEST_EXAMINATION_ID,
  indexNumber: env.LOAD_TEST_INDEX_NUMBER,
});
assert.deepEqual(json(configModule.searchBody(c, 1)), {
  examinationId: env.LOAD_TEST_EXAMINATION_ID,
  nicNumber: env.LOAD_TEST_NIC,
});
assert.equal(
  configModule.searchBody(read({ LOAD_TEST_INDEX_NUMBER: '' }), 0).nicNumber,
  env.LOAD_TEST_NIC
);
const payload = {
  studentName: 'Fictional Student',
  indexNumber: 'LOADTEST001',
  maskedNic: '********0000',
  schoolName: 'Fictional School',
  examinationCenter: null,
  examinationName: 'Fictional Performance Exam',
  examinationYear: 2026,
  overallStatus: 'Passed',
  grades: [{ subjectName: 'Fictional Subject', subjectCode: null, displayOrder: 1, grade: 'A' }],
};
const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};
const response = (status, body, extra = {}) => ({
  status,
  body: typeof body === 'string' ? body : JSON.stringify(body),
  headers: { ...headers, ...extra },
  timings: { duration: 100, waiting: 80 },
});
assert(checks.publicResult(payload, c));
for (const body of [
  { ...payload, nicNumber: env.LOAD_TEST_NIC },
  { ...payload, maskedNic: env.LOAD_TEST_NIC },
  { ...payload, overallStatus: 'UNKNOWN' },
  { ...payload, grades: [{ ...payload.grades[0], marks: 99 }] },
  { ...payload, indexNumber: 'DIFFERENT' },
  { ...payload, grades: [{ ...payload.grades[0], grade: 'Z' }] },
])
  assert.equal(checks.publicResult(body, c), false);
assert.equal(
  checks.privateDataAbsent(response(200, { ...payload, nicNumber: env.LOAD_TEST_NIC }), c),
  false
);
assert.equal(checks.privateDataAbsent(response(500, 'postgres://secret'), c), false);
assert.equal(checks.privateDataAbsent(response(500, '{"stack":"private"}'), c), false);
assert.equal(checks.parseJson(response(500, 'not json')), null);
assert.equal(
  checks.securityHeaders(response(200, payload, { 'X-Content-Type-Options': '' })),
  false
);

// Execute actual k6 exports with in-memory transport/metrics; no network is possible.
let next = response(200, payload),
  requests = [],
  logs = [],
  metrics = {};
class Metric {
  constructor(name) {
    this.name = name;
    metrics[name] = [];
  }
  add(value) {
    metrics[this.name].push(value);
  }
}
const http = {
  expectedStatuses: (...statuses) => statuses,
  get: (url, params) => {
    requests.push({ method: 'GET', url, params });
    return response(200, { status: 'ok', service: 'prepx', timestamp: '2026-01-01T00:00:00.000Z' });
  },
  post: (url, body, params) => {
    requests.push({ method: 'POST', url, body, params });
    return next;
  },
};
const bundle = load(
  path.join(__dirname, 'search.js'),
  { __ENV: env, __ITER: 0, console: { log: (message) => logs.push(message) } },
  {
    'k6/http': { default: http },
    'k6/execution': {
      default: {
        test: {
          abort() {
            throw new Error('SAFE_ABORT');
          },
        },
      },
    },
    k6: {
      check: (value, checks) => Object.values(checks).every((fn) => fn(value)),
      sleep: () => {},
    },
    'k6/metrics': { Counter: Metric, Rate: Metric, Trend: Metric },
  }
);
bundle.setup();
assert.equal(requests.length, 3);
assert.equal(logs.length, 1);
for (const value of [env.LOAD_TEST_NIC, env.LOAD_TEST_INDEX_NUMBER, env.LOAD_TEST_EXAMINATION_ID])
  assert(!logs[0].includes(value));
assert(requests.every((r) => r.params.redirects === 0));
bundle.search();
assert.equal(metrics.search_successes[0], 1);
assert.equal(metrics.search_errors[0], false);
next = response(
  429,
  { error: 'RATE_LIMITED', message: 'Too many search attempts. Please try again later.' },
  {
    'Retry-After': '30',
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Limit': '5',
    'X-RateLimit-Reset': '1800000000',
  }
);
bundle.search();
assert.equal(metrics.search_rate_limited.at(-1), true);
assert.equal(metrics.search_errors.at(-1), false);
assert.equal(metrics.search_success_duration.length, 1);
next = response(500, { error: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
bundle.search();
assert.equal(metrics.search_errors.at(-1), true);
next = response(200, { ...payload, nicNumber: env.LOAD_TEST_NIC });
assert.throws(() => bundle.search(), /SAFE_ABORT/);
bundle.health();
assert.equal(metrics.health_errors.at(-1), false);
const report = bundle.handleSummary({
  metrics: { search_requests: { type: 'counter', values: { count: 4, rate: 1 }, thresholds: {} } },
});
assert(report.stdout.includes('search_requests'));
assert(!report.stdout.includes(env.LOAD_TEST_NIC));
next = response(403, { error: 'NOT_PUBLISHED' });
assert.throws(() => bundle.setup(), /SAFE_ABORT/);
console.log(
  'PASS: offline k6 syntax, profiles/limits, target guards, schemas/privacy, preflight, 429 separation, metrics and summary. No requests sent.'
);
// inspect evaluates init/options only; never setup or VU code. Uses fictional local settings.
const native = spawnSync('k6', ['inspect', 'tests/load/search.js'], {
  cwd: path.resolve(__dirname, '../..'),
  env: {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([key]) =>
        /^(PATH|Path|SystemRoot|SYSTEMROOT|WINDIR|TEMP|TMP|HOME|USERPROFILE|APPDATA|LOCALAPPDATA)$/.test(
          key
        )
      )
    ),
    ...env,
    K6_NO_USAGE_REPORT: 'true',
  },
  encoding: 'utf8',
  windowsHide: true,
});
if (native.error?.code === 'ENOENT')
  console.log('SKIP: native k6 inspect; k6 is not installed. Offline validation passed.');
else {
  assert.equal(
    native.status,
    0,
    'Native k6 inspect failed; inspect locally without printing secrets.'
  );
  console.log('PASS: native k6 inspect (no HTTP traffic).');
}
