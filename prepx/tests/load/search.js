/* global __ENV, __ITER */
import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter, Rate, Trend } from 'k6/metrics';
import { readConfig, searchBody, buildOptions } from './config.js';
import {
  parseJson,
  securityHeaders,
  publicResult,
  privateDataAbsent,
  limitedResponse,
  healthResponse,
} from './checks.js';
const config = readConfig(__ENV);
export const options = buildOptions(config);
const requests = new Counter('search_requests');
const successes = new Counter('search_successes');
const errors = new Rate('search_errors');
const abortErrors = new Rate('search_abort_errors');
const throttled = new Rate('search_rate_limited');
const failedChecks = new Rate('search_check_failures');
const duration = new Trend('search_success_duration', true);
const ttfb = new Trend('search_ttfb', true);
const healthErrors = new Rate('health_errors');
const healthDuration = new Trend('health_duration', true);
function params(endpoint) {
  return {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(config.authorization ? { Authorization: config.authorization } : {}),
    },
    tags: { name: endpoint === 'search' ? 'POST results/search' : 'GET health', endpoint },
    redirects: 0,
    timeout: `${config.timeout}s`,
    responseType: 'text',
    responseCallback: http.expectedStatuses(...(endpoint === 'search' ? [200, 429] : [200])),
  };
}
export function setup() {
  console.log(
    `Target: ${config.host}; profile: ${config.profile}; duration: ${config.duration}s; VUs: ${config.flat ? config.vus : 0}-${config.vus}${config.health ? ' (+1 health)' : ''}`
  );
  const health = http.get(config.base + config.healthPath, params('preflight'));
  if (
    health.status !== 200 ||
    !healthResponse(parseJson(health)) ||
    !securityHeaders(health) ||
    !privateDataAbsent(health, config)
  )
    exec.test.abort('Health preflight failed; no response details logged.');
  // Validate each configured lookup resolves before starting sustained traffic.
  for (let i = 0; i < (config.index && config.nic ? 2 : 1); i++) {
    const response = http.post(
      config.base + config.searchPath,
      JSON.stringify(searchBody(config, i)),
      params('preflight')
    );
    if (
      response.status !== 200 ||
      !publicResult(parseJson(response), config) ||
      !securityHeaders(response) ||
      !privateDataAbsent(response, config)
    )
      exec.test.abort(
        'Fixture preflight failed. Check publication, fixture and quota; no response details logged.'
      );
  }
}
export function search() {
  const response = http.post(
    config.base + config.searchPath,
    JSON.stringify(searchBody(config, __ITER)),
    params('search')
  );
  const body = parseJson(response);
  const limited = response.status === 429;
  const shape = limited
    ? limitedResponse(body, response)
    : response.status === 200 && publicResult(body, config);
  const privacy = privateDataAbsent(response, config);
  const headers = securityHeaders(response);
  const passed = check(
    response,
    {
      'expected search status': (r) => r.status === 200 || r.status === 429,
      'valid JSON': () => body !== null,
      'public-safe response': () => shape && privacy,
      'no-store and security headers': () => headers,
    },
    { endpoint: 'search' }
  );
  requests.add(1);
  throttled.add(limited);
  failedChecks.add(!passed);
  const error = !shape || !privacy || !headers;
  errors.add(error);
  abortErrors.add(error);
  ttfb.add(response.timings.waiting);
  if (response.status === 200 && !error) {
    successes.add(1);
    duration.add(response.timings.duration);
  }
  if (!privacy) exec.test.abort('Response privacy check failed; no response content logged.');
  sleep(config.pause);
}
export function health() {
  const response = http.get(config.base + config.healthPath, params('health'));
  const good =
    response.status === 200 &&
    healthResponse(parseJson(response)) &&
    securityHeaders(response) &&
    privateDataAbsent(response, config);
  check(response, { 'healthy and safe': () => good }, { endpoint: 'health' });
  healthErrors.add(!good);
  healthDuration.add(response.timings.duration);
}
export function handleSummary(data) {
  // Only numeric aggregate metrics and threshold results; no request/response data or environment.
  const metrics = {};
  for (const [name, metric] of Object.entries(data.metrics))
    metrics[name] = { type: metric.type, values: metric.values, thresholds: metric.thresholds };
  const report = JSON.stringify({ profile: config.profile, metrics }, null, 2);
  return { stdout: report + '\n', 'tests/load/results/summary.json': report };
}
