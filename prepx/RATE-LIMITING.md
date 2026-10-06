# Public result search rate limiting

`POST /api/results/search` uses the existing `{ examinationId, indexNumber?, nicNumber? }` contract. The Node.js route applies both quotas before creating a Supabase client. No database migration or new package is required.

## Policy

| Bucket | Default | Scope |
| --- | --- | --- |
| Client IP | 20 attempts / 300 seconds | All searches from one normalized address |
| Identifier | 5 attempts / 300 seconds | One trimmed, uppercase index or NIC across IPs and examinations |

Each fixed window starts at the first attempt. Expiry is not extended by later attempts, including denials. A new window permits a new quota; this is not a rolling-window algorithm. IP checks run first, so an IP denial does not consume identifier capacity. Every POST consumes IP capacity, including malformed JSON, invalid input, successful searches, unavailable results and database failures. A usable identifier string also consumes identifier capacity even when validation fails. Requests without one only consume IP capacity. Bodies are bounded to 8 KiB and a two-second read deadline.

Blocked requests return the existing error shape with status 429, `RATE_LIMITED`, and the generic message `Too many search attempts. Please try again later.` They include `Retry-After` in seconds, `X-RateLimit-Limit`, `X-RateLimit-Remaining: 0`, and `X-RateLimit-Reset` as a Unix timestamp. All search responses retain `Cache-Control: no-store, no-cache, must-revalidate`. Allowed responses describe whichever checked bucket has fewer remaining attempts (identifier wins ties); blocked responses describe the blocking bucket.

## Production setup

Configure these server-only variables in every production instance and Vercel deployment, including previews:

| Variable | Required value |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Database HTTPS REST endpoint, `https://<database>.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | REST token permitting the limiter's Redis commands |
| `RATE_LIMIT_HASH_SECRET` | Random secret, at least 32 characters, without surrounding whitespace |

Generate a secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Never prefix these variables with `NEXT_PUBLIC_`, commit their values, or print them in application logs. Use separate Redis databases or secrets for independent environments. All replicas within one environment must share the same database, secret and quota settings.

The adapter uses the [Upstash REST command API](https://upstash.com/docs/redis/features/restapi) with a single [Redis EVAL script](https://redis.io/docs/latest/develop/programmability/eval-intro/) per bucket to atomically increment, establish expiry and return remaining capacity. Redis server time determines reset timestamps. Counters stop incrementing at limit + 1. IP and identifier checks are sequential, not one transaction; if the second check fails, the first attempt remains counted. Requests are not retried automatically because an interrupted response may already have incremented a counter.

Production defaults to Upstash and rejects the memory provider. Missing or invalid configuration returns the existing generic 500 error before database access, even with fail-open selected. Configuration initializes lazily so builds do not require live credentials. A successful build alone does not verify deployment configuration.

## Configuration

| Variable | Default | Accepted values |
| --- | --- | --- |
| `RESULT_SEARCH_RATE_LIMIT` | 20 | Integer 1–100000 |
| `RESULT_SEARCH_RATE_WINDOW_SECONDS` | 300 | Integer 1–86400 |
| `RESULT_SEARCH_IDENTIFIER_LIMIT` | 5 | Integer 1–100000 |
| `RESULT_SEARCH_IDENTIFIER_WINDOW_SECONDS` | 300 | Integer 1–86400 |
| `RESULT_SEARCH_RATE_LIMIT_PROVIDER` | `upstash` in production/Vercel; otherwise `memory` | `upstash`, `memory` (local only) |
| `RESULT_SEARCH_RATE_LIMIT_FAILURE_MODE` | `closed` | `closed`, `open` |
| `RESULT_SEARCH_RATE_LIMIT_TIMEOUT_MS` | 2000 | Integer 1–10000, per provider request |
| `RESULT_SEARCH_TRUSTED_PROXY` | `vercel` when `VERCEL=1`; otherwise `none` | `none`, `vercel`, `forwarded` |
| `RESULT_SEARCH_TRUSTED_PROXY_HOPS` | 1 | Integer 1–10, for forwarded mode |

Runtime provider failures default to fail-closed: generic 500, no database lookup, fixed server log message without provider details. Explicit `open` allows the search when a provider operation fails and emits a fixed warning; it weakens abuse protection and should be an intentional operational decision. A known quota denial still returns 429. Failed checks produce no invented rate-limit headers. There is no production fallback to local memory.

Change limits uniformly across replicas and redeploy. Quota and window settings are included in bucket keys, so changing either starts fresh buckets. Secret rotation also resets quotas; old buckets expire normally. Avoid mixed configuration during rollout and monitor provider availability and request volume. Provider timeouts can add up across the two sequential checks.

## Trusted client addresses and privacy

Vercel mode requires the server-controlled `VERCEL=1` environment flag and relies on [Vercel's overwritten forwarding headers](https://vercel.com/docs/headers/request-headers). It prefers `x-vercel-forwarded-for`, then `x-forwarded-for`, then `x-real-ip`. It accepts one valid IP, not an arbitrary client-supplied list. A third-party proxy in front of Vercel can result in that proxy's address being counted.

Other deployments default to `none`: forwarding headers are ignored, and all clients share a conservative unknown-IP bucket. Local development similarly shares one local bucket. For actual per-IP limiting on another host, select `forwarded` only when the origin is restricted to trusted proxies. They must append one address per hop to `X-Forwarded-For` and overwrite `X-Real-IP`. Configure the exact trusted hop count; the selected address is counted from the right. `X-Real-IP` is used only when XFF is absent. Missing, short or malformed headers share the unknown bucket. Incorrect proxy trust can permit spoofing or group unrelated users together.

IPv6 representations are canonicalized, including IPv4-mapped aliases. Both address and identifier keys use domain-separated HMAC-SHA-256. Index and NIC fingerprints are distinct; raw NICs, identifiers and IPs are neither stored in limiter keys nor logged by this implementation. The existing success log containing the index was removed. Provider errors and secrets are not returned to clients. No limiter state is stored in browser storage, and the public result fields and NIC masking are unchanged.

Shared networks can share a quota; rotating IPs and IPv6 addresses remain possible. An attacker can exhaust a known identifier's quota. Rate limiting reduces enumeration and database load but does not eliminate bot traffic. Infrastructure access logging and retention must be reviewed separately.

## Local development and tests

Local development/tests default to an in-memory store and a fixed local-only HMAC secret. Its state is process-local and resets on restart. It uses an injectable clock in unit tests, expires buckets lazily, and fails rather than evicting live buckets at its 10000-bucket capacity. Never use it for production protection.

From this directory, run:

```powershell
npm.cmd run test:rate-limit
npm.cmd run test:logic
npm.cmd run type-check
npm.cmd run lint
npm.cmd run build
```

Ordinary tests use no Redis or database. The Upstash transport is mocked, including timeouts and malformed responses. For a read-only local HTTP/browser check, use an existing published examination with a student having a NIC, configured Supabase variables, Microsoft Edge, and an installed `playwright-core` module. This test reads existing fixture data without logging identifiers and consumes search quotas. Start an isolated development server in one PowerShell terminal:

```powershell
$env:RESULT_SEARCH_RATE_LIMIT='6'
$env:RESULT_SEARCH_RATE_WINDOW_SECONDS='10'
$env:RESULT_SEARCH_IDENTIFIER_LIMIT='2'
$env:RESULT_SEARCH_IDENTIFIER_WINDOW_SECONDS='10'
npm.cmd run dev -- --port 3002
```

Leave provider/proxy overrides unset so this local check uses memory and ignores spoofed forwarding headers. In another terminal:

```powershell
$env:TEST_BASE_URL='http://127.0.0.1:3002'
# If playwright-core is installed outside this project:
$env:PLAYWRIGHT_MODULE='C:/path/to/node_modules/playwright-core'
npm.cmd run test:rate-limit:live
```

The check covers index/NIC success, identifier/IP thresholds, invalid JSON, generic 429s, response headers, reset after Retry-After, masked result display and retryable browser feedback. It verifies the print action remains visible; it does not open the browser print dialog. Restart the isolated server for a fresh run and close the test terminals to discard short-window overrides.

Before deployment, configure real Upstash credentials and verify two application instances share quotas, real provider outage behavior, and the deployment's proxy headers. See [Step 13.1 verification](STEP-13.1-VERIFICATION.md) for what was actually exercised locally.
