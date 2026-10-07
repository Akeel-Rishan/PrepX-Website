// Pure, dependency-free configuration shared by k6 and offline validation.
function requireValue(condition, message) {
  if (!condition) throw new Error(message); // Never interpolate environment values.
}
function number(env, key, fallback, min, max, integer = true) {
  const raw = env[key] === undefined || env[key] === '' ? String(fallback) : env[key];
  const value = Number(raw);
  requireValue(
    /^\d+(?:\.\d+)?$/.test(raw) &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max &&
      (!integer || Number.isInteger(value)),
    `Invalid ${key}.`
  );
  return value;
}
export function readConfig(env) {
  const match = /^(https?):\/\/([a-zA-Z0-9.-]+)(?::([0-9]{1,5}))?\/?$/.exec(env.BASE_URL || '');
  requireValue(
    match && (!match[3] || (Number(match[3]) > 0 && Number(match[3]) <= 65535)),
    'BASE_URL must be an explicit HTTP(S) origin without credentials, paths, query or fragment.'
  );
  const host = match[2].toLowerCase();
  requireValue(
    !host.startsWith('.') && !host.endsWith('.') && !host.includes('..'),
    'Invalid target hostname.'
  );
  const local = host === 'localhost' || host === '127.0.0.1';
  const target = env.LOAD_TEST_TARGET_ENV || (local ? 'local' : '');
  requireValue(
    ['local', 'staging', 'performance', 'production'].includes(target) &&
      (target !== 'local' || local),
    'Declare LOAD_TEST_TARGET_ENV for remote targets.'
  );
  requireValue(local || match[1] === 'https', 'Remote targets require HTTPS.');
  requireValue(
    local || (env.LOAD_TEST_APPROVED === 'true' && env.LOAD_TEST_APPROVED_HOST === host),
    'Remote tests require approval and an exact approved hostname.'
  );
  requireValue(
    target !== 'production' || env.LOAD_TEST_ALLOW_PRODUCTION === 'true',
    'Production requires explicit LOAD_TEST_ALLOW_PRODUCTION approval.'
  );
  const profile = env.K6_PROFILE || 'smoke';
  requireValue(
    ['smoke', 'load', 'stress', 'soak', 'rate-limit'].includes(profile),
    'Unknown K6_PROFILE.'
  );
  requireValue(
    profile !== 'stress' ||
      (env.LOAD_TEST_ALLOW_HIGH_LOAD === 'true' &&
        ['staging', 'performance', 'production'].includes(target)),
    'Stress requires an approved performance target and LOAD_TEST_ALLOW_HIGH_LOAD.'
  );
  requireValue(
    !(target === 'production' && profile === 'stress') ||
      env.LOAD_TEST_ALLOW_PRODUCTION_STRESS === 'true',
    'Production stress requires separate LOAD_TEST_ALLOW_PRODUCTION_STRESS approval.'
  );
  requireValue(
    !env.K6_HTTP_DEBUG || env.K6_HTTP_DEBUG === 'false',
    'HTTP debug logging is forbidden.'
  );
  for (const key of [
    'K6_VUS',
    'K6_DURATION',
    'K6_STAGES',
    'K6_ITERATIONS',
    'K6_SCENARIOS',
    'K6_INSECURE_SKIP_TLS_VERIFY',
  ])
    requireValue(!env[key], 'Use LOAD_TEST settings, not k6 execution/TLS overrides.');
  requireValue(
    env.LOAD_TEST_FIXTURE_CONFIRMED === 'true',
    'Confirm use of a dedicated fictional published fixture.'
  );
  const examinationId = env.LOAD_TEST_EXAMINATION_ID || '';
  requireValue(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      examinationId
    ),
    'LOAD_TEST_EXAMINATION_ID must be a UUID.'
  );
  const index = (env.LOAD_TEST_INDEX_NUMBER || '').trim().toUpperCase();
  const nic = (env.LOAD_TEST_NIC || '').trim().toUpperCase();
  requireValue(index || nic, 'Provide a dedicated index number or NIC-like fixture identifier.');
  requireValue(
    !index || /^LOADTEST[A-Z0-9]{1,42}$/.test(index),
    'Fixture index must start LOADTEST and contain only letters and digits (maximum 50).'
  );
  requireValue(
    !nic || /^(?:0{12}|0{9}[VX])$/.test(nic),
    'Only zero-filled fictional NIC-like fixture values are permitted.'
  );
  const searchPath = env.LOAD_TEST_SEARCH_PATH || '/api/results/search';
  const healthPath = env.LOAD_TEST_HEALTH_PATH || '/api/health';
  requireValue(
    searchPath === '/api/results/search' && healthPath === '/api/health',
    'Only the verified read-only public paths are allowed.'
  );
  const authorization = env.LOAD_TEST_AUTH_HEADER || '';
  requireValue(
    !/[\r\n]/.test(authorization) && authorization.length <= 4096,
    'Invalid optional Authorization header.'
  );
  const defaults = {
    smoke: [1, 5],
    load: [25, 120],
    stress: [500, 120],
    soak: [10, 1800],
    'rate-limit': [1, 20],
  };
  const vus = number(
    env,
    'LOAD_TEST_VUS',
    defaults[profile][0],
    1,
    profile === 'smoke' || profile === 'rate-limit' ? 2 : profile === 'stress' ? 1000 : 100
  );
  const steady = number(
    env,
    'LOAD_TEST_DURATION_SECONDS',
    defaults[profile][1],
    1,
    profile === 'smoke' || profile === 'rate-limit' ? 60 : 7200
  );
  const ramp = number(env, 'LOAD_TEST_RAMP_SECONDS', profile === 'stress' ? 120 : 30, 10, 600);
  const stages =
    profile === 'stress'
      ? [
          { duration: `${ramp}s`, target: Math.max(1, Math.floor(vus * 0.1)) },
          { duration: `${ramp}s`, target: Math.max(1, Math.floor(vus * 0.5)) },
          { duration: `${ramp}s`, target: vus },
          { duration: `${steady}s`, target: vus },
          { duration: `${ramp}s`, target: 0 },
        ]
      : [
          { duration: `${ramp}s`, target: vus },
          { duration: `${steady}s`, target: vus },
          { duration: `${ramp}s`, target: 0 },
        ];
  const flat = profile === 'smoke' || profile === 'rate-limit';
  const duration = flat ? steady : steady + ramp * (profile === 'stress' ? 4 : 2);
  const p95 = number(env, 'LOAD_TEST_P95_MS', 1000, 50, 30000);
  const p99 = number(env, 'LOAD_TEST_P99_MS', 2000, p95, 60000);
  return {
    base: env.BASE_URL.replace(/\/$/, ''),
    host,
    target,
    profile,
    examinationId,
    index,
    nic,
    searchPath,
    healthPath,
    authorization,
    vus,
    stages,
    flat,
    duration,
    steady,
    pause: number(env, 'LOAD_TEST_PAUSE_SECONDS', profile === 'rate-limit' ? 1 : 2, 0.2, 60, false),
    timeout: number(env, 'LOAD_TEST_TIMEOUT_SECONDS', 10, 1, 30),
    health: env.LOAD_TEST_HEALTH_SCENARIO === 'true',
    p95,
    p99,
    errorRate: number(env, 'LOAD_TEST_ERROR_RATE', 0.01, 0, 0.5, false),
    checkFailure: number(env, 'LOAD_TEST_CHECK_FAILURE_RATE', 0.01, 0, 0.5, false),
    abortRate: number(env, 'LOAD_TEST_ABORT_ERROR_RATE', 0.1, 0.01, 0.5, false),
    abortAfter: number(env, 'LOAD_TEST_ABORT_AFTER_SECONDS', 30, 5, 120),
  };
}
export function searchBody(config, iteration) {
  const useNic = config.nic && (!config.index || iteration % 2 === 1);
  return {
    examinationId: config.examinationId,
    ...(useNic ? { nicNumber: config.nic } : { indexNumber: config.index }),
  };
}
export function buildOptions(c) {
  const abort = [
    { threshold: `rate<${c.abortRate}`, abortOnFail: true, delayAbortEval: `${c.abortAfter}s` },
  ];
  const thresholds = {
    search_errors: [`rate<=${c.errorRate}`],
    search_abort_errors: abort,
    search_check_failures: [`rate<=${c.checkFailure}`],
    search_success_duration: [`p(95)<${c.p95}`, `p(99)<${c.p99}`],
    search_successes: ['count>0'],
    search_rate_limited:
      c.profile === 'rate-limit'
        ? ['rate>0']
        : [{ threshold: 'rate==0', abortOnFail: true, delayAbortEval: '5s' }],
    'http_req_failed{endpoint:search}': [`rate<=${c.errorRate}`],
    'checks{endpoint:search}': [`rate>=${1 - c.checkFailure}`],
  };
  if (c.health)
    Object.assign(thresholds, {
      health_errors: [`rate<=${c.errorRate}`],
      health_duration: ['p(95)<500', 'p(99)<1000'],
    });
  const scenarios = {
    search: {
      exec: 'search',
      ...(c.flat
        ? { executor: 'constant-vus', vus: c.vus, duration: `${c.steady}s` }
        : { executor: 'ramping-vus', startVUs: 0, stages: c.stages }),
      gracefulStop: '5s',
      tags: { endpoint: 'search' },
    },
  };
  if (c.health)
    scenarios.health = {
      exec: 'health',
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: '10s',
      duration: `${c.duration}s`,
      preAllocatedVUs: 1,
      maxVUs: 1,
      tags: { endpoint: 'health' },
    };
  return {
    scenarios,
    thresholds,
    maxRedirects: 0,
    setupTimeout: '45s',
    noCookiesReset: false,
    systemTags: ['status', 'method', 'name', 'scenario', 'check', 'expected_response'],
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)'],
  };
}
