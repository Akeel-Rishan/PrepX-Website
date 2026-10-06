# Phase 13, Step 13.1 verification

Implemented on 2026-10-06 against the repository's actual Next.js 15 App Router and existing search API. No schema, public request payload, StudentResult payload or publication behavior was replaced.

## Changes

- `src/lib/rate-limit.ts`: server-only configuration and provider initialization.
- `src/lib/rate-limit/{types,config,keys,memory-store,upstash-store,result-search,request-body}.ts`: provider interface, validated configuration, HMAC keys, trusted IP resolution, deterministic local store, atomic Upstash adapter, decisions/headers, bounded request parsing.
- `src/app/api/results/search/route.ts`: Node runtime, limiter before database access, generic 429s, headers on existing responses, removal of the raw-index success log.
- `src/lib/public-search.ts` and `src/lib/validations/search.ts`: shared existing trim/uppercase normalization.
- `scripts/test-result-search.cjs`: reusable route harness and privacy assertions.
- `scripts/test-rate-limit.cjs`: deterministic policy, security, adapter and API regression checks.
- `scripts/test-rate-limit-live.cjs`: read-only HTTP and Edge browser verification.
- `package.json`: rate-limit scripts and inclusion in `test:logic`; no dependency added.
- `.env.local.example`, both READMEs, `RATE-LIMITING.md`, and this report: setup and verification documentation.

## Policy and setup

Defaults are 20 attempts per IP and 5 per normalized identifier, each in a 300-second fixed window. Production uses Upstash Redis REST; required server-only variables are `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `RATE_LIMIT_HASH_SECRET`. Provider errors fail closed by default; explicit runtime fail-open is available, but invalid configuration always fails closed. See [configuration, proxy assumptions and operational limits](RATE-LIMITING.md).

## Automated checks executed

All passed:

- `npm.cmd run type-check`
- `npm.cmd run lint`
- `npm.cmd run test:results`
- `npm.cmd run test:rate-limit`
- `npm.cmd run test:logic` (complete existing suite plus limiter tests)
- `npm.cmd run build`
- `npm.cmd run test:rate-limit:live` against an isolated local development server

Deterministic tests cover concurrent requests, thresholds, exact expiry boundaries, shared-store behavior, independent IP/identifier quotas, HMAC privacy, normalized IPv6 aliases, trusted forwarding rules, invalid configuration, invalid/malformed/oversized/stalled bodies, unchanged success/not-found/not-published behavior, all response headers, and provider timeout/error/malformed-response handling. They assert denied requests never create a database client and provider details/private values do not leak into responses or logs. Upstash HTTP/EVAL invocation is mocked in ordinary tests.

## Live HTTP and browser results

- Production server with missing Upstash credentials: both valid and malformed POSTs returned the existing generic 500 error with no-store and no fabricated quota headers. No silent memory fallback occurred.
- Local server with 6 IP attempts / 10 seconds and 2 identifier attempts / 10 seconds: actual index and NIC searches returned matching safe result payloads; full NIC remained masked.
- Repeated normalized identifiers returned 429 with the generic body, Retry-After, limit, zero remaining and Unix reset headers.
- Invalid JSON consumed IP capacity. Changing untrusted forwarded headers did not bypass the local IP bucket; excess invalid requests returned 429.
- After waiting for the short window, a search succeeded with fresh capacity.
- Headless Microsoft Edge completed the public search-to-result flow, verified masked display and the visible Print / Save as PDF action, and displayed the existing retryable generic rate-limit message on a subsequent blocked search.

No database records were modified by these checks. The print dialog itself was outside this step's browser verification.

## Deployment checks and Phase 13.2

Real Upstash credentials were not available, so live Redis execution and a real multi-instance deployment were not exercised. Before release, configure the documented variables and verify shared quotas and outage behavior against the actual service. Confirm origin restrictions and forwarded-header behavior on the chosen host; non-Vercel defaults intentionally share an unknown-IP bucket until a trusted proxy is configured.

Phase 13.2 requirements have not been supplied. Potential follow-up security work includes deployment-level abuse monitoring, infrastructure log privacy, bot mitigation, and policy tuning for shared networks. These are not claims of completed Phase 13.2 work.
