# Phase 14.1: Health and application errors

## Health policy

`GET /api/health` is an uncached, unauthenticated liveness check with local production configuration validation. It never calls Supabase, Redis, authentication or the result-search limiter. Its stable JSON contains only `status`, `service: "prepx"` and an ISO timestamp.

- Local development/test: 200, `status: "ok"`; missing configuration is permitted. This does not assert that result search is usable.
- `NODE_ENV=production` or `VERCEL=1`: require a valid HTTPS Supabase URL without embedded credentials, nonblank public publishable and server secret keys, and valid existing `readRateLimitConfig()` settings. This includes the production Upstash provider, URL/token and hashing secret. Missing/invalid configuration: 503, `status: "unavailable"`.
- No credential validity, network reachability, schema or provider availability checks. A configured deployment can return 200 during a provider outage. Use separate authenticated operational checks for dependency readiness.
- Optional AI settings and public app naming/URL settings are not required. No new environment variables.
- POST, PUT, PATCH, DELETE, OPTIONS and HEAD return 405 with `Allow: GET` and a generic ApiResponse error. HTTP suppresses the response body for HEAD.
- Every response has `Cache-Control: no-store, no-cache, must-revalidate`, `Pragma: no-cache` and `X-Content-Type-Options: nosniff`. Existing middleware retains CSP and other security headers plus API noindex. No permissive CORS.
- Failed configuration checks log a fixed server-side event only. No raw exceptions or environment values are logged or returned, following the existing privacy-safe logging convention.

## Error architecture

The existing Next.js App Router is preserved. Root `not-found.tsx` now renders the existing PublicStatusPage with generic route wording, home/search links and noindex metadata. Search links target the existing home search section.

Root and `(public)` error boundaries share `components/application-error.tsx`, reusing PublicStatusPage and Button. Public segment errors retain the existing header/footer. `admin/(protected)/error.tsx` retains the authenticated shell for child failures; `admin/error.tsx` also catches protected-layout failures. Return to admin goes through `/admin`, where existing middleware/layout checks select the dashboard or login. Boundaries never inspect or serialize error properties and do not authorize any access.

`global-error.tsx` supplies its own html/body, inline styles, title, noindex, native retry button and full-document home link. It imports no runtime shared UI, layout, provider or font dependencies. Native focus outlines remain enabled. Other boundaries use existing visible focus styles. All retry actions call Next's reset callback; persistent faults can recur until the underlying cause is fixed.

The result-specific not-found and not-published pages, API behavior, authentication, database schema, limiter and reduced-motion rules remain unchanged. Existing admin/results no-store and noindex headers remain active. Generic errors add noindex metadata without changing home indexing. No dependencies were added.

## Repeatable verification

- `npm.cmd run test:health-errors`: deterministic response/configuration/privacy/method/header checks, rendered boundaries and real retry callback invocation, home/admin links, metadata and distinct result states.
- `npm.cmd run test:logic`: all existing ordinary regression tests plus the new tests; no real provider required.
- `npm.cmd run lint`, `npm.cmd run type-check`, `npm.cmd run build`.

Deployment checks: open health, POST health, open an unknown route, verify public navigation and both result states. With a dedicated test admin, verify login and protected navigation. Simulate component/layout faults only in an isolated local copy, then retry and return home. Do not ship fault-injection routes. Configure required production variables and verify Vercel HTTPS headers after deployment.

## Results for this implementation

Passed: lint, TypeScript, full `test:logic` suite, production build and `git diff --check`. The initial lint finding on the global fallback's native home link was resolved with a documented, single-line exception: full-document navigation is intentional when the root layout/router may be broken.

Production HTTP smoke (`npm.cmd run test:health-errors:live` on port 3014): exact health no-cache headers and safe JSON; expected 503; POST/PUT/PATCH/DELETE/OPTIONS/HEAD 405 with Allow; custom route 404; home and result pages; both distinct result status pages; anonymous admin redirect and privacy headers. The local environment lacks RATE_LIMIT_HASH_SECRET, UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. No secrets were printed. Healthy 200, development without configuration, and all required missing-production cases passed deterministic tests.

Headless Edge (`npm.cmd run test:health-errors:browser`): mobile width 390 with no horizontal overflow; generic 404; Return home navigation; simulated error in the existing public React boundary; no private sentinel/digest displayed; focusable retry button; Enter-key activation restores the home content. Simulation modifies browser memory only, not source or shipped routes. Edge required execution outside the sandbox. An initial synthetic-key timeout was resolved by bringing the tab forward and sending a complete Enter event.

All root/public/admin/global boundary renderings and reset callbacks passed deterministic tests. Root-layout failure and authenticated admin fault recovery were not induced in a live browser. Real student searches, authenticated admin workflows and provider outage checks were not performed during this step; their ordinary regression coverage passed. No database records were modified. Browser checks are optional and require Windows Edge (or EDGE_PATH) and Node with native WebSocket; ordinary unit tests have no browser/service requirements.

Remaining operations: provision the three missing production limiter variables, verify deployed Vercel health/HTTPS responses, and run authenticated admin and real result-search checks with approved test data. Health does not certify provider connectivity or credential validity.
