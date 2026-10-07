# PrepX public API load tests

Only `GET /api/health` and `POST /api/results/search` are exercised. Search is read-only with respect to examination data, but requests consume limiter capacity and hosting/database resources. Scripts never create fixtures, mutate admin data, import, publish, delete or reset anything. Node launcher/validation files are separate from the k6-compatible JavaScript bundle.

## Install and prepare

Install k6 separately; it is not an npm dependency. On Windows: `winget install k6 --source winget`. On macOS: `brew install k6`. See [official installation instructions](https://grafana.com/docs/k6/latest/set-up/install-k6/). Node 22+ runs the optional npm launcher and offline validator.

Create a dedicated fictional record **before** testing, using the existing admin workflow in an isolated local/staging Supabase environment: a test examination with at least one active subject, a fictional student with an index beginning `LOADTEST` (letters/digits only), and grades. If testing NIC lookup, use a format-only NIC consisting of twelve zeros or nine zeros followed by V/X. Publish the test examination using existing authorization and validation. Record its UUID. Use no real student data. Both configured identifiers must belong to this same record. The load suite does not seed or publish it. Integration-test fixtures are automatically cleaned, so they are not persistent load fixtures.

Copy `.env.load.example` to ignored `.env.load` in `prepx` and fill in the settings below. The npm launcher reads only that file plus shell variables (shell takes precedence); it never reads application `.env.local` or passes Supabase/Redis secrets. Do not commit `.env.load`, output artifacts or gateway credentials.

| Variable | Purpose |
| --- | --- |
| `BASE_URL` | Required exact origin, including port locally; no path/query/credentials. No default. |
| `LOAD_TEST_EXAMINATION_ID` | Required UUID; search API requires this in addition to the lookup identifier. |
| `LOAD_TEST_INDEX_NUMBER` | Fictional index starting `LOADTEST`, at most 50 alphanumeric characters. |
| `LOAD_TEST_NIC` | Optional zero-filled format-only NIC as described above. At least one lookup identifier is required. |
| `LOAD_TEST_FIXTURE_CONFIRMED=true` | Explicit confirmation that this is a dedicated published fictional record. |
| `LOAD_TEST_SEARCH_PATH`, `LOAD_TEST_HEALTH_PATH` | Default to the verified API paths above. Other paths are refused to prevent accidental admin/mutation traffic. |
| `LOAD_TEST_AUTH_HEADER` | Optional full Authorization value only for a staging gateway that requires it. Public PrepX endpoints require no auth. No cookies are supplied. |
| `K6_PROFILE` | smoke, load, stress, soak or rate-limit; npm commands choose their named profile. Direct k6 defaults to smoke. |
| `LOAD_TEST_TARGET_ENV` | local (loopback only), staging, performance or production. Required remotely. |
| `LOAD_TEST_APPROVED=true`, `LOAD_TEST_APPROVED_HOST` | Required remotely; hostname must match exactly, without scheme/port. Remote targets require HTTPS. |
| `LOAD_TEST_ALLOW_HIGH_LOAD=true` | Required for stress; target must be staging/performance, or separately approved production. |
| `LOAD_TEST_ALLOW_PRODUCTION=true` | Required for every declared production run, including smoke. |
| `LOAD_TEST_ALLOW_PRODUCTION_STRESS=true` | Additional explicit production stress authorization. |
| `LOAD_TEST_HEALTH_SCENARIO=true` | Optional one health request every ten seconds in a separate, single-VU scenario. Disabled by default. |
| `LOAD_TEST_EXPORT=true` | Write local time-series metrics as well as the aggregate summary. |

Approval variables record operator authorization; they do not obtain it. Hostnames cannot prove whether a deployment is production: verify the URL, environment and database independently. Do not label production as staging. Do not use redirects/proxies to production. Do not run production tests without authorization, a monitored window and an operator ready to stop them. An isolated local performance target may use `LOAD_TEST_TARGET_ENV=performance` for stress only after reviewing local resource capacity.

## Run profiles

From `prepx` (use `npm.cmd` in PowerShell):

```text
npm run load:validate
npm run load:smoke
npm run load:normal
npm run load:stress
npm run load:soak
npm run load:rate-limit
```

**Run smoke first. Do not start stress until the target, quota configuration and baseline have been reviewed.** The above commands are alternatives, not a sequence to paste and run unattended.

| Profile | Default VUs | Scheduled duration | Shape |
| --- | --- | --- | --- |
| smoke | 1 | 5 seconds | Short constant load; normally three paced searches plus preflight. |
| load | 25 | 180 seconds | 30s ramp, 120s steady, 30s down. |
| stress | 500 | 600 seconds | 120s to 50, 120s to 250, 120s to 500, 120s steady, 120s down. Explicit opt-in. |
| soak | 10 | 1,860 seconds | 30s ramp, 30-minute steady period, 30s down. |
| rate-limit | 1 | 20 seconds | Small paced test expecting eventual 429; not a capacity measurement. |

For an approved 500+ VU environment, set `LOAD_TEST_ALLOW_HIGH_LOAD=true`, `LOAD_TEST_TARGET_ENV=performance`, the exact remote approval settings above, and optionally `LOAD_TEST_VUS=600`, then run `npm run load:stress`. Never do this automatically in normal CI. No spike profile is included.

Configurable settings (blank means default): `LOAD_TEST_VUS` (smoke/rate-limit 1–2, load/soak 1–100, stress 1–1000), `LOAD_TEST_DURATION_SECONDS` (steady period; 1–60 for smoke/rate-limit, up to 7200 otherwise), `LOAD_TEST_RAMP_SECONDS` (10–600), `LOAD_TEST_PAUSE_SECONDS` (0.2–60, default 2; rate-limit default 1), and `LOAD_TEST_TIMEOUT_SECONDS` (1–30, default 10). Scheduled duration excludes preflight and graceful shutdown. VUs are simulated concurrent sessions, **not** simultaneous database requests or a guarantee of throughput. One VU sends one request then waits; approximate upper request rate is VUs / (response time + pause). At 500 VUs and the default pause, the rough ceiling is 250 searches/sec.

The launcher rejects extra CLI arguments, strips inherited k6 execution/export/debug settings and supplies a minimal config. Native k6 execution is possible with settings exported into the environment, but does not load `.env.load`; use the npm commands to retain launcher protections. Never use HTTP debug logging, disable thresholds, skip preflight, override stages externally, export environment dumps, or use cloud output. Redirects are disabled; TLS verification stays enabled. Telemetry is disabled by the launcher/config ([k6 usage reporting](https://grafana.com/docs/k6/latest/set-up/usage-collection/)). Startup output from the script contains only hostname, profile, scheduled duration and VU range.

## Rate limits versus capacity

Existing defaults are **20 requests/IP and 5 requests/identifier per 300 seconds**. Index and NIC have distinct identifier buckets, but all virtual users share the same fixture and often the same outbound IP. Alternating the two identifiers is normal lookup coverage, not a rate-limit bypass. No forwarded IP spoofing or random identifiers are used. Preflight consumes one request for each supplied identifier. Repeated smoke runs may hit existing quotas; wait for expiry or restart only an isolated development test instance.

For application-capacity runs, an operator must configure suitable limits **on the isolated target**, using existing `RESULT_SEARCH_RATE_LIMIT`, `RESULT_SEARCH_IDENTIFIER_LIMIT` and their window variables. For example, a staging-only one-second window with quotas above the planned paced request rate can retain quota enforcement while allowing the experiment. Both IP and identifier quotas must accommodate the run, and all replicas must agree. Keep existing Upstash/production configuration and fail-closed behavior; do not switch production to memory or enable fail-open. The suite never changes server configuration. See [RATE-LIMITING.md](../../RATE-LIMITING.md).

200 and valid 429 are expected transport statuses. Application errors, unsafe responses and malformed throttling responses count as `search_errors`; 429s separately count in `search_rate_limited`. Capacity profiles require zero throttling and abort on it after five seconds of threshold evaluation. The rate-limit profile instead requires at least one 429. Successful-response latency excludes 429s so fast rejections cannot make capacity appear healthy. Preflight requires a real 200 for each lookup, even in rate-limit mode; start with quota available. See [k6 expected statuses](https://grafana.com/docs/k6/latest/javascript-api/k6-http/expected-statuses/) and [threshold abort behavior](https://grafana.com/docs/k6/latest/using-k6/thresholds/).

## Metrics and initial budgets

No measured staging baseline or latency SLO was found in the repository. These are **initial experiment budgets**, not proven service guarantees; calibrate against an approved staging baseline and record the environment, dataset, limits and profile when comparing runs. The limiter can spend up to its configured timeout per provider call, so failure latency can exceed the success budget.

| Metric / setting | Default budget |
| --- | --- |
| `search_errors`, search-only `http_req_failed`; `LOAD_TEST_ERROR_RATE` | <=1% |
| `search_success_duration`; `LOAD_TEST_P95_MS`, `LOAD_TEST_P99_MS` | p95 <1000 ms; p99 <2000 ms |
| `search_check_failures`; `LOAD_TEST_CHECK_FAILURE_RATE` | <=1% of responses failing any check; also >=99% individual search checks pass |
| `search_abort_errors`; `LOAD_TEST_ABORT_ERROR_RATE` | Stop when errors reach 10%, after `LOAD_TEST_ABORT_AFTER_SECONDS` (default 30) |
| Optional `health_errors`, `health_duration` | <=1% errors; p95 <500 ms, p99 <1000 ms |

Threshold evaluation is periodic, not instantaneous; timeout and pacing further bound outstanding work. Ctrl+C remains the operator stop mechanism. Privacy failures abort immediately. A 403/404 during preflight means the fixture/examination is wrong or unpublished, not a capacity result. A 503 health response can mean required production configuration is missing; health does not probe provider connectivity.

Built-in metrics include HTTP counts/rates, duration percentiles, failed requests and checks. `search_requests` and `search_successes` provide offered versus valid-result throughput; `search_ttfb` measures response waiting/time to first byte. Search durations, check failures, application errors and throttling have separate custom metrics. Health has its own scenario/tags/metrics; preflight has a separate tag. Do not use aggregate HTTP latency as search latency when health is enabled. p95 means 95% of sampled requests were faster; p99 describes the slowest tail more closely. Smoke has too few samples for meaningful percentile claims.

Checks require JSON, expected status, exact public field allowlists (including nested grades), valid grades/status/year, matching fictional index/masked NIC where supplied, no raw configured NIC/credentials or obvious internal details, and JSON/no-store/nosniff/frame/noindex headers. Health has its own strict contract. A privacy check is defense in depth, not proof that arbitrary server text can never contain a secret.

## Artifacts and CI

Each npm run writes ignored `tests/load/results/summary.json` and numeric aggregate metrics to stdout. With `LOAD_TEST_EXPORT=true`, it also writes `tests/load/results/metrics.json` (k6 JSON time series). Copy/rename these after a run before comparing another one. Metrics have constant endpoint names, and URL/error-detail tags are disabled; identifiers are never metric labels. Bodies, authorization values and cookies are not printed or exported. Keep artifacts private and review any added exporters.

`npm run load:validate` is the CI-safe default: it parses all k6 JS, validates guards/profiles/bounds, and exercises exports using in-memory HTTP/metric stubs. It reads no `.env.load` and sends **zero requests**. If k6 is installed it additionally runs `k6 inspect` using fictional local settings (init/options only); otherwise it reports the native check as skipped. This validates configuration and script behavior, not performance or real endpoint correctness. No load profile is part of `npm test`, build, or normal CI.

## Verification for this change

Offline validation passed without HTTP traffic. k6 is not installed in this workspace, so native inspect and actual smoke/load execution remain pending. Install k6, provision the fictional published fixture on an approved target, configure `.env.load`, validate, and run smoke before considering a larger run. No real stress test was executed and no production service was contacted.
