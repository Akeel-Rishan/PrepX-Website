# PrepX deployment on Vercel

This guide covers configuration only. Do not deploy until the Preview checklist passes. Never commit `.env.local`, `.env.production`, `.env.test`, `.env.load`, `.vercel/`, database credentials, or downloaded Vercel environment files.

Use [`../pre-launch-checklist.md`](../pre-launch-checklist.md) as the release record. It separates automated evidence from manual, blocked, operational, and post-deployment gates.

## Project settings

| Setting | Value |
| --- | --- |
| Framework preset | Next.js (auto-detected) |
| Root Directory | `prepx` |
| Node.js | `22.x` (pinned in `package.json`) |
| Package manager | npm 10.9.4 with committed `package-lock.json` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | Next.js default; do not override |
| Automatically expose System Environment Variables | Enabled (`VERCEL`, `VERCEL_ENV`, and `VERCEL_URL` are used) |

No `vercel.json` is required. Next.js creates the functions, middleware, static assets, and route manifest. The two API routes explicitly use the Node.js runtime; middleware remains Edge-compatible. There are no cron jobs, workers, WebSockets, long-running servers, or runtime filesystem persistence requirements.

The 4,000,000-byte import limit and 4.2 MiB Server Action envelope remain below [Vercel's 4.5 MB Function request ceiling](https://vercel.com/docs/functions/limitations#request-body-size). Larger uploads require a direct storage-backed client upload rather than a larger Function body limit. Vercel currently supports the pinned [Node.js 22 runtime](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## Environment variables

Use `.env.example` as the canonical template. `npm run env:check` validates local configuration without printing values. `npm run build` automatically runs the stricter production validation first.

### Application runtime

| Variable | Classification | Development | Preview | Production |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public, build/runtime | Development project URL | Dedicated staging project URL | Production project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public, build/runtime | Development publishable key | Staging publishable key | Production publishable key |
| `SUPABASE_SECRET_KEY` | Server-only secret | Development secret key | Staging secret key | Production secret key |
| `NEXT_PUBLIC_APP_NAME` | Public build-time config | Optional; defaults to `PrepX` | Optional | Optional |
| `NEXT_PUBLIC_APP_URL` | Public build-time config | `http://localhost:3000` | Optional; metadata falls back to Vercel's deployment URL | Canonical HTTPS URL |
| `UPSTASH_REDIS_REST_URL` | Server-only provider config | Optional when using memory | Required; staging Redis | Required; production Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only secret | Required with Upstash URL | Required | Required |
| `RATE_LIMIT_HASH_SECRET` | Server-only HMAC secret | Optional with memory | Required, 32+ random characters | Required, separate 32+ random characters |
| `RESULT_SEARCH_RATE_LIMIT` | Optional server config | Default `20` | Default or tuned | Default or tuned |
| `RESULT_SEARCH_RATE_WINDOW_SECONDS` | Optional server config | Default `300` | Default or tuned | Default or tuned |
| `RESULT_SEARCH_IDENTIFIER_LIMIT` | Optional server config | Default `5` | Default or tuned | Default or tuned |
| `RESULT_SEARCH_IDENTIFIER_WINDOW_SECONDS` | Optional server config | Default `300` | Default or tuned | Default or tuned |
| `RESULT_SEARCH_RATE_LIMIT_PROVIDER` | Optional server config | Defaults to `memory` | Leave unset or `upstash` | Leave unset or `upstash` |
| `RESULT_SEARCH_RATE_LIMIT_FAILURE_MODE` | Optional server config | Defaults to `closed` | Leave unset or `closed` | Leave unset or `closed` |
| `RESULT_SEARCH_RATE_LIMIT_TIMEOUT_MS` | Optional server config | Default `2000` | Default or tuned | Default or tuned |
| `RESULT_SEARCH_TRUSTED_PROXY` | Optional server config | Leave unset | Leave unset on Vercel | Leave unset on Vercel |
| `RESULT_SEARCH_TRUSTED_PROXY_HOPS` | Optional server config | Leave unset | Leave unset on Vercel | Leave unset on Vercel |
| `SECURITY_HTTPS_ONLY` | Optional server config | Leave unset | Leave unset on Vercel | Leave unset on Vercel |
| `SECURITY_HSTS_INCLUDE_SUBDOMAINS` | Optional server config | Leave unset | Leave unset | Leave unset unless every subdomain is HTTPS-only |
| `GEMINI_API_KEY` | Optional server-only secret | Optional | Optional | Optional |
| `GOOGLE_API_KEY` | Optional server-only secret alias | Use instead of Gemini key | Optional | Optional |
| `GEMINI_IMPORT_MODEL` | Optional server config | Defaults to documented model | Optional | Optional |

Do not create any `NEXT_PUBLIC_` secret, Redis, token, service-role, Gemini, or HMAC variable. Values with `NEXT_PUBLIC_` are intentionally embedded into browser JavaScript.

Vercel provides `VERCEL`, `VERCEL_ENV`, and deployment URL variables. Do not add them manually. Leave `RESULT_SEARCH_TRUSTED_PROXY`, `RESULT_SEARCH_TRUSTED_PROXY_HOPS`, `SECURITY_HTTPS_ONLY`, and `SECURITY_HSTS_INCLUDE_SUBDOMAINS` unset on Vercel. The application automatically selects Vercel's trusted forwarding headers and enables HSTS only in its production runtime. The subdomain HSTS option should remain off unless every subdomain is permanently HTTPS-only.

Use separate Supabase projects and Upstash databases for Preview and Production whenever possible. At minimum, use separate HMAC secrets so identifiers cannot be correlated across environments.

Current cost exception (approved 2026-10-15): PrepX uses separate staging and Production Supabase projects but shares one free Upstash database. Preview and Production have distinct private `RATE_LIMIT_HASH_SECRET` values, so their identifier/IP limiter keys do not overlap. Keep the secrets in their respective Vercel scopes, monitor the combined free quota, and never run staging load or abuse tests while Production is serving traffic. Move Production to a separate Upstash database when budget permits.

No analytics, email, object-storage, payment, or separate health-check credential is read by the application. Supabase Auth email/SMTP settings, if enabled later, are configured in the Supabase dashboard rather than as PrepX/Vercel variables.

### Development and test-only variables

- `.env.test.example` documents the isolated local Supabase integration stack. The runner rejects hosted projects and never loads `.env.local`.
- `.env.load.example` documents approved load-test targets and explicit production/stress opt-ins.
- `TEST_BASE_URL`, `PLAYWRIGHT_MODULE`, `EDGE_PATH`, `TEST_DEVELOPMENT`, `PREPX_SCREENSHOT_DIR`, and `PREPX_PRINT_ARTIFACTS` are local/browser-test controls, not Vercel variables.
- `NODE_ENV` and Vercel system variables are tool/platform managed.

## Supabase production setup

1. Create or select the intended Production project and a separate Preview/staging project.
2. Apply migrations `001` through `006` in order. Migration `006` is required before deploying the examination delete control. Do not run repository seed scripts against Preview or Production; they are synthetic local-development fixtures only.
3. Create Supabase Auth users deliberately and add only approved user UUIDs to `admin_profiles`.
4. Disable public Auth sign-up in the hosted Production project unless a reviewed enrollment workflow is intentionally introduced.
5. In Authentication > URL Configuration, set Site URL to the exact canonical production HTTPS origin.
6. If email links, password recovery, or OAuth are enabled later, allow the exact production callback path. For intended Vercel previews, [Supabase documents](https://supabase.com/docs/guides/auth/redirect-urls#vercel-preview-urls) `https://*-<team-or-account-slug>.vercel.app/**`; keep production paths exact and avoid broader wildcards.

The current admin login uses email/password directly and does not require an OAuth callback route. Internal `redirectTo` values are restricted to literal `/admin` paths. Session cookies are refreshed by middleware, protected pages re-check the signed claims and `admin_profiles`, and auth responses are private/no-store.

The browser/session client uses the publishable key and RLS. The secret key is imported only through `server-only` modules. It bypasses RLS for trusted actions and the public search endpoint, where code independently requires a `PUBLISHED` examination and returns an allowlisted result shape.

To confirm project identity without exposing credentials, compare the project reference in `NEXT_PUBLIC_SUPABASE_URL` with the intended Supabase dashboard project, run `npm run test:db` from an approved environment, and run `npx supabase migration list --linked` before release.

## Preview deployment

1. Commit and push the audited changes to a non-production branch.
2. Import the repository into Vercel and set Root Directory to `prepx`.
3. Set all required Preview variables using staging-only Supabase and Upstash resources.
4. Deploy the branch or run `vercel deploy` from `prepx`; do not use `--prod`.
5. Confirm `GET /api/health` returns HTTP 200 with only `status`, `service`, and `timestamp`.
6. Verify CSP, HSTS, cache-control, `X-Robots-Tag`, anonymous admin redirects, login/logout, imports up to 4 MB, public search, and rate-limit 429/reset behavior.
7. Use one approved fictional published examination and complete the admin workflow: create/configure, import, grade, review, publish, public lookup, unpublish, and audit review.
8. Inspect Function logs for fixed diagnostic messages only; no NIC, index number, token, provider response, or credential should appear.

## Production promotion and rollback

Before production, repeat `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run audit:deployment`, and `npm run build`. Back up the database and confirm the rollback owner and incident contact.

Promote only a verified deployment using the Vercel dashboard or the team's controlled production-branch workflow. [Preview and Production variables are separate](https://vercel.com/docs/environment-variables); promoting causes a production build with Production values.

For an application regression, use [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback) to a previously served production deployment. A rollback reuses that deployment's old build-time environment values, so environment or credential changes require a new build rather than relying on rollback. Database migrations in this phase are additive and are not reversed automatically by Vercel; use a separately reviewed database recovery plan.

## Secret rotation

1. Create the replacement in Supabase, Upstash, or Gemini without deleting the active credential.
2. Update the correct Vercel environment scope without printing the value in logs or pull requests.
3. Redeploy and verify health, authentication, result search, rate limiting, and imports.
4. Revoke the old credential after verification.
5. Rotating `RATE_LIMIT_HASH_SECRET` starts new limiter buckets; deploy consistently to avoid mixed keys.

If a secret is ever committed, rotate it immediately, remove it from Git history through the repository's incident process, and redeploy. Deleting the visible line alone is not sufficient.
