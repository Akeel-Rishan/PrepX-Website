# PrepX Pre-Deployment Audit

Audit date: 2026-10-10

## Status

The application code builds and its deterministic security, validation, business-logic, and integration-safety suites pass. It is **not ready for a production launch yet** because the production rate limiter is not configured and the final staging/browser checks need an approved published-result fixture.

## Required before deployment (P0)

- [ ] Configure `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and a random `RATE_LIMIT_HASH_SECRET` of at least 32 characters in every preview and production environment. Keep `RATE_LIMIT_PROVIDER=upstash` and fail-closed behavior for production.
- [ ] Configure the production Supabase URL, publishable key, and secret key in the hosting platform. Never expose the secret key to client code.
- [ ] Confirm migrations `001` through `005` are recorded and applied on the production Supabase project. The linked migration-history check could not complete because the direct PostgreSQL connection was terminated. Migration `006_public_result_rate_limits.sql` was removed because the active design uses Upstash and did not use that table/RPC.
- [ ] Deploy to a preview environment and require `/api/health` to return HTTP 200. It correctly returns HTTP 503 locally while the required production rate-limit credentials are absent.
- [ ] Create dedicated, non-production staging data with one approved `PUBLISHED` examination, then run the live public-search, browser-security, result-navigation, and print/PDF tests. The current linked data has no published examination, so these tests cannot exercise the result form without changing real data.
- [ ] Smoke-test the complete authenticated admin flow on staging: login, examination setup, subjects, student create/edit, import, grade entry, review, publish, public lookup, unpublish, and audit logs.

## Required operational checks (P1)

- [ ] Verify HTTPS, domain redirects, HSTS, CSP nonces, `noindex` on admin/error pages, and trusted-proxy settings on the deployed host.
- [ ] Verify Upstash quotas across multiple application instances and confirm provider outages fail closed without exposing whether an identifier exists.
- [ ] Confirm the hosting request-body limit supports the documented import size. If it does not, move large imports to a storage-backed upload flow.
- [ ] Run smoke and stress load profiles against isolated staging. The load definitions pass offline validation, but native `k6` is not installed locally.
- [ ] Test database backup and restore, monitoring, alerting, log retention/redaction, admin account recovery, and incident ownership.
- [ ] Manually verify the browser's native Print / Save as PDF output, including multi-page result tables.

## Recommended follow-up (P2)

- [ ] Migrate Tailwind CSS 3 and its development toolchain to a supported release. Full `npm audit` reports 9 development-only transitive advisories; the production dependency audit reports 0 vulnerabilities. Avoid `npm audit fix --force` without a planned Tailwind migration.
- [ ] Run capacity tests with the largest expected examination, student, subject, and audit-log volumes.
- [ ] Configure the optional Gemini import assistant only if that feature will be enabled in production, and document its data-handling policy.

## Corrections made during this audit

- Restored the privacy-preserving in-memory public-result handoff and removed student-result persistence from `sessionStorage`.
- Restored accessible result rendering, status/table semantics, no-JavaScript fallback, and print/PDF controls.
- Made public-search request validation strict, rejected unknown properties and ambiguous dual-identifier searches, and rejected unsafe control characters.
- Fixed untrusted error-code handling so inherited JavaScript property names cannot be accepted as API error codes.
- Consolidated the public-search rate limiter around the hardened Upstash production implementation and removed an unused database/memory limiter, migration, and types.
- Corrected the environment template to document all production limiter, proxy, and security settings.
- Removed obsolete duplicate publication UI/actions and empty placeholder components while retaining the real validation and state-transition implementation.
- Updated vulnerable production dependencies (`next`, `sharp`, and `source-map-js`) and added the missing `playwright-core` test dependency.

## Verification completed

- `npm run lint` — pass
- `npm run type-check` — pass
- `npm run test:logic` — pass
- `npm run test:integration:safety` — pass
- `npm run load:validate` — pass (native k6 check skipped because k6 is not installed)
- `npm run test:db` — pass against the currently linked project
- `npm audit --omit=dev --audit-level=moderate` — 0 vulnerabilities
- `npm run build` — pass with Next.js 15.5.27
- Production HTTP/header/error-path smoke tests — pass; health intentionally returns 503 until the P0 limiter credentials are supplied

