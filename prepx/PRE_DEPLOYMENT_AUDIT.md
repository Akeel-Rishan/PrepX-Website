# PrepX Pre-Deployment Audit

Audit date: 2026-10-11; deep-audit update: 2026-10-12

## Status

The repository is **ready to move to Vercel project and environment configuration**. The production build, deterministic suites, live database checks, linked migration history, and a Vercel-mode Upstash smoke test pass. Local secrets are configured and ignored by Git; their values were not printed or committed.

Phase 16.1 configuration and verification details are recorded in `STEP-16.1-VERIFICATION.md`; operational instructions are in `docs/deployment/vercel.md`.

Phase 16.2's evidence-backed release gate, ownership record, operating procedures, and post-deployment checks are in `docs/pre-launch-checklist.md`.

This is not yet approval for a public production launch. A Vercel preview deployment, a dedicated published staging fixture, and operational checks remain.

## Completed before Vercel configuration

- [x] Required local Supabase, Upstash, rate-limit secret, application, and optional Gemini settings are present; values remain hidden.
- [x] `.env.local`, `.env.test`, `.env.load`, and `.vercel` are ignored; no real environment file appears in Git history.
- [x] Linked Supabase migrations `001` through `005` exactly match the repository.
- [x] All six tables are reachable; `import_exam_results` is installed and rejects unknown administrators.
- [x] Production dependencies report 0 vulnerabilities.
- [x] Node.js is pinned to `22.x`, matching the verified local build and an available Vercel runtime.
- [x] Direct import uploads now fit Vercel's 4.5 MB request ceiling: 4,000,000-byte file cap and 4.2 MiB Server Action envelope.
- [x] Obsolete empty `/api/admin/import` and `/api/admin/students` route stubs were removed.
- [x] Vercel-mode local smoke test: health 200, home 200, live Upstash-backed invalid search 400, HSTS/CSP/no-store headers present.

## Required in Vercel and staging (P0)

- [ ] Commit and push the audit fixes listed below.
- [ ] Create/import the Vercel project with **Root Directory** set to `prepx`. Keep framework detection and the default build command (`npm run build`).
- [ ] Add the production Supabase and Upstash settings to Vercel Preview and Production. Use distinct rate-limit storage/secrets between environments when possible. Never expose `SUPABASE_SECRET_KEY`, Upstash token, Gemini key, or rate-limit secret with a `NEXT_PUBLIC_` prefix.
- [ ] Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS production domain (and an appropriate preview value if the application begins consuming it). Leave Vercel proxy and HSTS override variables unset.
- [ ] Deploy a preview and require `/api/health` to return HTTP 200.
- [ ] Create dedicated non-production staging data with one approved `PUBLISHED` examination, then rerun live public-search, browser-security, result-navigation, and print/PDF tests against Preview. Local production browser suites pass against the currently configured fictional published fixture; this does not replace isolated staging evidence.
- [ ] Smoke-test the authenticated admin flow on staging: login, examination setup, subjects, student create/edit, import, grade entry, review, publish, public lookup, unpublish, and audit logs.

## Required operational checks (P1)

- [ ] Verify HTTPS, domain redirects, HSTS, CSP nonces, `noindex` on admin/error pages, and trusted-proxy settings on the deployed host.
- [ ] Verify Upstash quotas across multiple application instances and confirm provider outages fail closed without exposing whether an identifier exists.
- [ ] Run smoke and stress load profiles against isolated staging. The load definitions pass offline validation, but native `k6` is not installed locally.
- [ ] Test database backup and restore, monitoring, alerting, log retention/redaction, admin account recovery, and incident ownership.
- [ ] Manually verify the browser's native Print / Save as PDF output, including multi-page result tables.

## Recommended follow-up (P2)

- [ ] Migrate Tailwind CSS 3 and its development toolchain to a supported release. Full `npm audit` reports 9 development-only transitive advisories; the production dependency audit reports 0 vulnerabilities. Avoid `npm audit fix --force` without a planned Tailwind migration.
- [ ] Run capacity tests with the largest expected examination, student, subject, and audit-log volumes.
- [ ] Configure the optional Gemini import assistant only if that feature will be enabled in production, and document its data-handling policy.

## Corrections made during this audit

- Reduced direct import uploads from 10 MB to a Vercel-safe 4 MB and centralized the file limit across client, action, parser, tests, and documentation.
- Pinned Node.js to `22.x` for repeatable local/Vercel builds.
- Removed two obsolete empty API routes that were appearing in the production route manifest.
- Corrected the root README's stale Next.js/React versions and completed-feature status.
- Restored the privacy-preserving in-memory public-result handoff and removed student-result persistence from `sessionStorage`.
- Restored accessible result rendering, status/table semantics, no-JavaScript fallback, and print/PDF controls.
- Made public-search request validation strict, rejected unknown properties and ambiguous dual-identifier searches, and rejected unsafe control characters.
- Fixed untrusted error-code handling so inherited JavaScript property names cannot be accepted as API error codes.
- Consolidated the public-search rate limiter around the hardened Upstash production implementation and removed an unused database/memory limiter, migration, and types.
- Corrected the environment template to document all production limiter, proxy, and security settings.
- Aligned both publication validation paths so a required subject and complete required grades are mandatory before publication; the live publish action revalidates this rule.
- Hardened recursive audit-payload NIC masking and added a read-only historical audit that reports counts only.
- Replaced the brittle native-CDP error browser harness with the existing Playwright/Edge test path and made result browser selectors accessibility-based and transition-safe.
- Updated vulnerable production dependencies (`next`, `sharp`, and `source-map-js`) and added the missing `playwright-core` test dependency.

## Verification completed

- `npm run lint` — pass
- `npm run type-check` — pass
- `npm run test:logic` — pass
- `npm run test:integration:safety` — pass
- `npm run load:validate` — pass (native k6 check skipped because k6 is not installed)
- `npm run test:db` — pass against the currently linked project
- `npm run audit:privacy` — pass; 49 configured audit rows checked and 0 unmasked NIC fields found
- `npx supabase migration list --linked` — pass; local and remote are `001` through `005`
- `npm audit --omit=dev --audit-level=moderate` — 0 vulnerabilities
- `npm run build` — pass with Next.js 15.5.27
- Production HTTP/header/error-path smoke tests — pass with live configured Supabase and Upstash credentials
- Local production browser suites — result navigation/responsive behavior, print/A4 PDF, CSP/security, 404, and global-error recovery pass in Edge
