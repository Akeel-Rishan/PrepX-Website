# PrepX production pre-launch checklist

Checklist date: 2026-10-12
Release candidate: `0.1.0`  
Current recommendation: **GO ONLY AFTER BLOCKERS ARE RESOLVED**

This is the release record for PrepX. It covers what the repository and automated checks prove, and deliberately leaves production, browser, operational, and organization-owned checks open. It does not authorize a deployment by itself.

## How to use this checklist

- `[x] VERIFIED` means evidence exists in source, migrations, a named test, or the recorded command output.
- `[ ] MANUAL CHECK REQUIRED` means a person must verify it in the intended Vercel/Supabase environment.
- `[ ] BLOCKED` means production release must wait for the stated prerequisite or decision.
- `[ ] NOT APPLICABLE` is used only where the current product deliberately has no such feature.
- **Required**, **Recommended**, and **Not applicable** state release priority.
- Never paste credentials, full NIC values, cookies, tokens, or student records into this document.

Release owners should enter names/links in the fields near the end, initial every manual item they perform, and attach private evidence where necessary.

## Current blocking gates

- [ ] **BLOCKED — Required:** Complete a Vercel Preview deployment with staging-only Supabase and Upstash resources, then run the post-deployment checklist. **Owner:** Technical release owner. **Needed:** Preview URL and dated test record.
- [ ] **BLOCKED — Required:** Run the real integration suite against the isolated local Docker Supabase stack. **Owner:** Developer. **Needed:** Docker, `npm run test:integration:setup`, then `npm run test:integration`; do not substitute a hosted database.
- [ ] **BLOCKED — Required:** Run k6 smoke and normal-load profiles against an explicitly approved staging/performance target with fictional published data. **Owner:** Performance tester. **Needed:** native k6, private `.env.load`, target approval, saved summaries.
- [ ] **BLOCKED — Required:** Verify production Supabase backups and perform/document a safe restore rehearsal. **Owner:** Supabase project owner. **Needed:** backup configuration evidence and restoration record.
- [ ] **BLOCKED — Required:** Assign production, Vercel, Supabase, DNS, incident, and examination-period contacts. **Owner:** UGSM release approver.
- [ ] **BLOCKED — Required:** Complete browser accessibility, responsive, print/PDF, multilingual, and production security-header checks. **Owner:** QA/release owner.
- [ ] **BLOCKED — Required:** Approve data-retention/privacy wording and decide whether a public privacy notice and terms page are legally or organizationally required. **Owner:** UGSM data owner.

## 1. Product and functionality

- [x] **VERIFIED — Required:** Login action validates credentials, rejects non-admin users, retries only transient Auth failures, returns generic errors, and uses a safe internal redirect. **Evidence:** `scripts/test-auth-actions.cjs`, `src/lib/actions/auth.ts`.
- [ ] **MANUAL CHECK REQUIRED — Required:** Sign in with the designated staging admin through the deployed login page and confirm session persistence. **Owner:** QA.
- [x] **VERIFIED — Required:** Logout calls Supabase `signOut()` and redirects to `/admin/login`. **Evidence:** `src/lib/actions/auth.ts`; auth action/session tests.
- [ ] **MANUAL CHECK REQUIRED — Required:** Verify deployed logout removes access to a previously protected page, including with Back/Refresh. **Owner:** QA.
- [x] **VERIFIED — Required:** Middleware and the protected layout reject missing, invalid, non-admin, stale, and revoked sessions for `/admin/*`. **Evidence:** `src/middleware.ts`, protected layout, `scripts/test-auth-session.cjs`.
- [x] **VERIFIED — Required:** Dashboard aggregation, year isolation, cycle state, quick actions, and recent examinations have implemented paths and deterministic coverage. **Evidence:** `src/lib/data/dashboard.ts`, `scripts/test-dashboard.cjs`.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm the deployed dashboard loads, displays intended production data, and has no browser console errors. **Owner:** QA.
- [x] **VERIFIED — Required:** Examination create, edit, archive, restore, validation, publish, and unpublish actions enforce authorization, state rules, concurrency guards, auditing, rollback attempts, and cache refresh. **Evidence:** examination/publication action tests and publication validator tests.
- [ ] **MANUAL CHECK REQUIRED — Required:** Complete the entire examination lifecycle in Preview using a fictional examination. **Owner:** QA/admin.
- [x] **VERIFIED — Required:** Student create, edit, permanent delete, search, school/examination filters, bounded pagination, validation, duplicate mapping, and audit paths exist. **Evidence:** student actions/data modules and `scripts/test-student-actions.cjs`.
- [ ] **NOT APPLICABLE — Not applicable:** Student archival is not a product feature; authorized permanent deletion is the implemented alternative and is blocked for published examinations.
- [ ] **MANUAL CHECK REQUIRED — Required:** Exercise student creation, editing, deletion, search, pagination, and all filters in Preview. **Owner:** QA/admin.
- [x] **VERIFIED — Required:** Subject create, edit, reorder, activate/deactivate, delete, and ordered retrieval paths exist with exam scoping, optimistic concurrency, and audits. **Evidence:** subject action/data modules.
- [ ] **MANUAL CHECK REQUIRED — Required:** Exercise all subject operations in Preview, including a subject that already has grades. **Owner:** QA/admin.
- [x] **VERIFIED — Required:** Grade entry accepts only `A`, `B`, `C`, `S`, `W`, and `AB` in UI, validation, import RPC, and database constraint. **Evidence:** grade tests and migrations `001`/`005`.
- [x] **VERIFIED — Required:** Missing required grades and incomplete/corrupt records are detected; any missing required grade blocks publication. **Evidence:** publication, grade-logic, and public-result tests.
- [x] **VERIFIED — Required:** Import implements file selection, bounded CSV/XLSX parsing, validation, preview, per-row errors, confirmation, atomic persistence, and an `IMPORT_COMPLETED` audit record. **Evidence:** import tests and migration `005_atomic_import_results.sql`.
- [ ] **MANUAL CHECK REQUIRED — Required:** Run the complete Preview import UI with fictional valid and invalid files and visually inspect row errors and summary counts. **Owner:** QA/admin.
- [x] **VERIFIED — Required:** Server-side publication validation blocks missing required subjects, every missing required grade, structural corruption, and other configured blocking conditions; publish action revalidates immediately before the status transition. **Evidence:** publication validator/action tests.
- [x] **VERIFIED — Required:** Public search supports exactly one normalized index number or NIC and has deterministic success/error coverage. **Evidence:** result-search, public-search, validator, and integration definitions.
- [x] **VERIFIED — Required:** Draft, ready, archived, missing, and unpublished examinations/results cannot produce a public result; not-found and not-published remain distinct. **Evidence:** public search/result rule tests.
- [x] **VERIFIED — Required:** Public output is allowlisted to approved identity/examination fields, masked NIC, grades, and derived status. Full NIC, marks, totals, averages, ranks, database errors, and internal fields are excluded. **Evidence:** `src/lib/public-result.ts` and public result tests.
- [x] **VERIFIED — Required:** Print layout and browser Print/Save-as-PDF control exist with A4-focused CSS and all six grades. **Evidence:** print components/styles and deterministic display/print assertions.
- [ ] **MANUAL CHECK REQUIRED — Required:** Open native Print and save a multi-page A4 PDF in supported desktop/mobile browsers; visually approve margins, page breaks, monochrome output, and text. **Owner:** QA/content owner.
- [x] **VERIFIED — Required:** Custom not-found, route error, global error, result-state, and safe API error paths exist and deterministic error tests pass.
- [x] **VERIFIED — Required:** `GET /api/health` returns only `status`, `service`, and `timestamp`, uses no-store/security headers, rejects unsupported methods, and does not print configuration. **Evidence:** health tests and deployment audit.
- [ ] **MANUAL CHECK REQUIRED — Required:** Verify the deployed health endpoint returns 200 and the exact safe contract. **Owner:** Technical release owner.

## 2. Data integrity and database

- [ ] **BLOCKED — Required:** Apply migrations `001`–`005` to a fresh isolated local test database and complete the real integration suite. Linked-project history matches, but that does not replace a clean-database test. **Owner:** Developer.
- [x] **VERIFIED — Required:** Linked local/remote migration history is exactly `001`–`005`, and all six configured tables plus `import_exam_results` are reachable. **Evidence:** `npx supabase migration list --linked`, `npm run test:db` on 2026-10-12.
- [x] **VERIFIED — Required:** Migrations define primary keys, foreign keys, status/year/grade checks, result/examination consistency trigger, unique student index/NIC, unique subject name/code, unique student/subject grade, and query indexes.
- [ ] **BLOCKED — Required:** Prove foreign-key, uniqueness, grade checks, cross-exam trigger, and RLS against real PostgreSQL through `npm run test:integration`. Deterministic tests alone are not sufficient. **Owner:** Developer.
- [x] **VERIFIED — Required:** Publication eligibility is calculated server-side and checked again in the publish action.
- [x] **VERIFIED — Required:** Duplicate index numbers, NICs, subject headers, and grade records are rejected or intentionally upserted only according to the documented import contract.
- [x] **VERIFIED — Required:** Import confirmation is one PostgreSQL function transaction; student/grade writes and audit insertion commit or roll back together. Execute is revoked from public/anon/authenticated and granted to `service_role`.
- [x] **VERIFIED — Required:** Required administrative mutations attempt audit creation; publication/examination/review paths include compensating rollback/concurrency handling where needed.
- [x] **VERIFIED — Required:** RLS is enabled for all six tables and policies restrict public reads to published examinations/active subjects while admin access requires `is_admin()`.
- [ ] **BLOCKED — Required:** Execute the real RLS integration group against the isolated stack and inspect hosted production RLS/policies after migration. **Owner:** Developer/Supabase owner.
- [x] **VERIFIED — Required:** Service-role creation is confined to a `server-only` Supabase module and trusted server code; post-build browser scans found no server secret names or values.
- [x] **VERIFIED — Required:** No install/build/start hook runs seeds, resets, migration pushes, or destructive database commands; integration cleanup is marker-scoped and refuses hosted databases.
- [ ] **BLOCKED — Required:** Confirm automated production Supabase backups are enabled and retention matches UGSM requirements. **Owner:** Supabase owner.
- [ ] **BLOCKED — Required:** Rehearse a restore to a separate recovery project/branch, validate row counts/auth/configuration, record RTO/RPO and evidence, and never overwrite Production for the rehearsal. **Owner:** Supabase owner.
- [ ] **BLOCKED — Required:** Approve and document retention periods for student records, audit logs, Vercel logs, Upstash fingerprints, backups, and deletion requests. **Owner:** UGSM data owner.

## 3. Authentication and authorization

- [ ] **MANUAL CHECK REQUIRED — Required:** Create named production administrators directly in Supabase Auth using unique accounts, strong passwords/MFA where available, and matching approved `admin_profiles`; disable public signup. **Owner:** Supabase owner.
- [ ] **MANUAL CHECK REQUIRED — Required:** Verify the Supabase production Site URL and any intentionally required redirect allowlist entries. Current password login has no OAuth callback. **Owner:** Supabase owner.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm secure session cookies, refresh, expiry, revocation, login, and logout on the final HTTPS domain. **Owner:** QA/security owner.
- [ ] **NOT APPLICABLE — Not applicable:** The current application has one administrator role, not multiple administrator permission tiers or tenants. Every approved admin has the same application data scope.
- [x] **VERIFIED — Required:** Server actions call the admin authorization guard; anonymous and non-admin paths fail closed in deterministic tests.
- [x] **VERIFIED — Required:** Public users have no supported admin API and cannot invoke protected actions successfully without a signed admin session/profile.
- [x] **VERIFIED — Required:** No credentials are hard-coded or tracked; environment/static audits pass and `.env*` private files are ignored.
- [x] **VERIFIED — Required:** The service-role/secret key is server-only and absent from browser bundles.
- [x] **VERIFIED — Required:** Password/session errors are generic and do not expose Supabase/provider details.

## 4. Security

- [x] **VERIFIED — Required:** Middleware generates per-request CSP nonces and applies CSP, HSTS gating, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, referrer policy, cross-origin isolation headers, cache policy, and noindex where applicable. **Evidence:** security tests.
- [ ] **MANUAL CHECK REQUIRED — Required:** Inspect these headers on Production HTML, API, admin redirects, errors, and result responses. Confirm all required scripts/styles/features work under CSP. **Owner:** QA/security owner.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm HTTPS redirect and HSTS on the canonical production domain. Include subdomains only if every subdomain is permanently HTTPS-only. **Owner:** DNS/Vercel owner.
- [x] **VERIFIED — Required:** Admin, auth, health, and result/search responses use private/no-store policies; admin/error/result routes use `X-Robots-Tag` where intended.
- [x] **VERIFIED — Required:** Search, action, import, UUID, text, identifier, and grade inputs are contextually validated; control characters, markup, formula/hyperlink payloads, unsafe archives, and ambiguous searches are rejected.
- [x] **VERIFIED — Required:** Database access uses Supabase query builders/RPC parameters rather than string-built SQL from request input.
- [x] **VERIFIED — Required:** Public search and limiter logs use fixed messages or provider codes and do not log raw NIC/index values, IPs, cookies, tokens, keys, request bodies, or provider responses in tested paths. Audit payloads recursively mask NIC-key variants; `npm run audit:privacy` inspected all 49 configured audit rows on 2026-10-12 and found zero unmasked NIC fields without printing row contents.
- [x] **VERIFIED — Required:** API/action failures return generic messages without stack traces, SQL text, Supabase detail, credentials, or environment values in deterministic tests.
- [x] **VERIFIED — Required:** Public search has independent HMAC-derived identifier/IP limits, production Upstash enforcement, bounded timeouts, generic 429s, and fail-closed configuration/provider behavior by default.
- [ ] **BLOCKED — Required:** Verify rate limits with real production-mode Upstash across multiple Preview instances, including timeout/outage behavior and a safe quota/reset test. **Owner:** Technical release owner.
- [x] **VERIFIED — Required:** No cross-origin client is supported; routes do not emit permissive `Access-Control-Allow-Origin` headers, so browser use remains same-origin.
- [x] **VERIFIED — Required:** State changes use authenticated Next.js Server Actions with framework origin checks plus server-side admin authorization; no cookie-authenticated state-changing public REST endpoint exists.
- [x] **VERIFIED — Required:** `npm audit --omit=dev --audit-level=moderate` reports zero production dependency vulnerabilities.
- [x] **VERIFIED — Recommended:** Tailwind CSS 3 was migrated to 4.3.3 and the original nine-item Tailwind development-toolchain audit chain was removed. Type-check, lint, unit/security tests, production build, responsive result browser tests, CSP tests, and A4 print tests pass after migration.
- [ ] **DEFERRED — Recommended:** Monitor the new upstream `braces` advisory in Next.js's development-only ESLint stack. Full `npm audit` reports five entries derived from this one transitive package, but `npm audit --omit=dev` remains clean and no patched `braces` release exists as of 2026-10-12. Do not use npm's suggested incompatible Next.js 14 downgrade or a forced audit fix.

## 5. Environment and deployment

- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm Vercel is connected to `https://github.com/Akeel-Rishan/PrepX-Website.git`, the controlled production branch, and the intended team/project. **Owner:** Vercel owner.
- [ ] **BLOCKED — Required:** Configure and verify canonical production domain, DNS ownership, HTTPS, redirects, and certificate issuance. **Owner:** Domain/Vercel owner.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm Development, Preview, and Production use separately scoped variables/resources. **Owner:** Vercel owner.
- [x] **VERIFIED — Required:** `.env.example` contains non-secret placeholder values only; private environment/load/test/Vercel files are ignored and deployment audit passes.
- [x] **VERIFIED — Required:** Public variables are limited to Supabase public URL/publishable key and application name/URL; secret/provider/HMAC/AI variables are server-only.
- [x] **VERIFIED — Required:** Local configured Supabase URL matches the currently linked project without printing identifiers, and linked migrations match. This does not prove the Vercel Production scope is correct.
- [ ] **MANUAL CHECK REQUIRED — Required:** Compare the Vercel Production Supabase project reference and keys with the approved production project. **Owner:** Supabase/Vercel owners.
- [ ] **MANUAL CHECK REQUIRED — Required:** Configure production Upstash URL/token and a distinct 32+ character `RATE_LIMIT_HASH_SECRET`; never reuse Preview values. **Owner:** Vercel owner.
- [x] **VERIFIED — Required:** Missing/placeholder/insecure production variables, memory limiting, fail-open mode, and invalid Vercel proxy/HTTPS overrides fail production validation without printing values.
- [x] **VERIFIED — Required:** Runtime persistence uses Supabase/Upstash only; there are no workers, cron jobs, WebSockets, long-running processes, or local-filesystem persistence requirements.
- [x] **VERIFIED — Required:** Repository settings specify Root Directory `prepx`, Next.js defaults, Node `22.x`, npm `10.9.4`, `npm ci`, `npm run build`, and default output; no `vercel.json` is necessary.
- [x] **VERIFIED — Required:** Production build completes with 20 expected app/API routes and middleware.
- [ ] **MANUAL CHECK REQUIRED — Required:** Apply/confirm migrations before enabling Production traffic and record the production migration output. **Owner:** Supabase owner.
- [ ] **MANUAL CHECK REQUIRED — Required:** Inspect Preview and Production build/function logs for secrets, student identifiers, provider bodies, and unexpected errors. **Owner:** Technical release owner.
- [ ] **BLOCKED — Required:** Establish a known-good Vercel deployment and assign an operator who understands Instant Rollback and its database/environment limitations. **Owner:** Vercel/release owner.

## 6. Testing and quality gates

- [x] **VERIFIED — Required:** `npm test` — PASS on 2026-10-12; logic, validation, privacy, publication, rate-limit, header, import, error, and API contracts passed.
- [ ] **BLOCKED — Required:** `npm run test:integration` — NOT RUN; it failed closed because Docker/local Supabase and `.env.test` are absent. No database was contacted.
- [x] **VERIFIED — Required:** `npm run test:integration:safety` — PASS; hosted/default URLs and unsafe transport are rejected.
- [x] **VERIFIED — Required:** `npm run lint` — PASS.
- [x] **VERIFIED — Required:** `npm run typecheck` — PASS.
- [x] **VERIFIED — Required:** `npm run build` — PASS with production environment validation.
- [x] **VERIFIED — Recommended:** Local production Edge result/navigation, responsive, print/A4-PDF, CSP/security, 404, and global-error browser smoke suites — PASS on 2026-10-12. Native Save-as-PDF dialog and deployed-environment checks remain manual.
- [x] **VERIFIED — Required:** `npm run load:validate` — PASS offline; profiles, guards, schemas, privacy checks, thresholds, metrics, and summaries validated without HTTP traffic.
- [ ] **BLOCKED — Required:** `npm run load:smoke` — not run; native k6, `.env.load`, approved target, and fictional published fixture are absent.
- [ ] **BLOCKED — Required:** `npm run load:normal` — not run for the same reasons; run only after smoke passes in the approved staging/performance environment.
- [x] **VERIFIED — Required:** No critical/high production dependency vulnerability or known failing deterministic test remains.
- [x] **VERIFIED — Required:** No ignored/skipped flaky application test was found; external/browser/load prerequisites are documented rather than silently skipped.
- [x] **VERIFIED — Required:** Repository test/seed/load fixtures are clearly fictional and use zero-filled format-only identifiers.
- [x] **VERIFIED — Required:** Integration and load guards refuse accidental hosted/production targets unless narrowly and explicitly approved; normal tests do not use Production.
- [x] **VERIFIED — Required:** Public/API response schemas, publication/privacy rules, rate limiting, security headers, errors, and masking have deterministic coverage.

## 7. Performance and reliability

- [x] **VERIFIED — Recommended:** Production build reports approximately 142 kB first-load JS for `/` and 153 kB for `/results`; public reads are dynamic and the homepage uses a cookie-free client.
- [ ] **MANUAL CHECK REQUIRED — Required:** Measure production-like public home Core Web Vitals and establish an accepted baseline. **Owner:** Performance/QA owner.
- [ ] **BLOCKED — Required:** Demonstrate result-search p95 under 1000 ms and p99 under 2000 ms in approved staging. These are initial experiment budgets, not an agreed production SLO. **Owner:** Product/technical owners.
- [ ] **MANUAL CHECK REQUIRED — Required:** Review Vercel function duration/logs under smoke and normal load and confirm no timeout or platform-limit breach. **Owner:** Technical owner.
- [ ] **MANUAL CHECK REQUIRED — Required:** Inspect Supabase query performance/index usage with production-like fictional volume. **Owner:** Supabase owner.
- [x] **VERIFIED — Required:** Lookup, status, ordering, pagination, subject, result, and audit indexes required by current query paths are present in migrations.
- [ ] **BLOCKED — Recommended:** 500-user stress profile exists but has not run; execute only in an isolated approved performance environment after normal load succeeds.
- [ ] **BLOCKED — Required:** Establish and meet an agreed error-rate threshold. Initial load definitions use zero search errors and <=1% optional health errors, but no staging baseline is recorded.
- [x] **VERIFIED — Required:** Development memory rate-limit storage is bounded/non-sliding and production cannot select it; no unbounded application cache or persistent worker was found.
- [x] **VERIFIED — Required:** Upstash calls use bounded timeout/no retry and default fail-closed handling; database/query failures return safe errors.
- [x] **VERIFIED — Required:** `/api/health` supplies a liveness/configuration endpoint without provider probes or secrets.
- [ ] **BLOCKED — Required:** Configure monitoring, alerts, on-call/response ownership, thresholds, and log retention. **Owner:** Operations owner.

## 8. Accessibility and responsive behavior

- [x] **VERIFIED — Recommended:** Source includes form labels, semantic tables/statuses, live regions, visible focus classes, keyboard-capable controls, modal dialog semantics, reduced-motion CSS, responsive layouts, and non-color text labels.
- [ ] **MANUAL CHECK REQUIRED — Required:** Complete keyboard-only navigation for public search/results and every admin workflow; confirm logical order and no traps. **Owner:** Accessibility tester.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm visible focus at 200% zoom and in light/dark themes. **Owner:** Accessibility tester.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm every deployed form field has an accessible name and every error is programmatically associated/announced. **Owner:** Accessibility tester.
- [ ] **MANUAL CHECK REQUIRED — Required:** Test modal initial focus, containment, Escape/close, and focus return. **Owner:** Accessibility tester.
- [ ] **MANUAL CHECK REQUIRED — Required:** Measure text, component, focus, and status color contrast. **Owner:** Accessibility tester.
- [ ] **MANUAL CHECK REQUIRED — Required:** Test screen-reader announcements for loading, validation, search, import, save, publication, and error states. **Owner:** Accessibility tester.
- [ ] **MANUAL CHECK REQUIRED — Required:** Test supported mobile, tablet, desktop, zoom, and orientation sizes with no clipped controls or important horizontal overflow. **Owner:** QA.
- [ ] **MANUAL CHECK REQUIRED — Required:** Approve A4 print/PDF output, including multi-page grades. **Owner:** QA/content owner.
- [ ] **MANUAL CHECK REQUIRED — Recommended:** Test operating-system reduced-motion mode and confirm essential state changes remain understandable. **Owner:** QA.
- [ ] **MANUAL CHECK REQUIRED — Required:** Test Sinhala, Tamil, and English names/schools/messages with approved content and fonts; never use real student information. **Owner:** UGSM content/QA owner.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm grade/status/error meaning never depends on color alone. **Owner:** Accessibility tester.

## 9. Privacy and content

- [ ] **BLOCKED — Required:** Determine legal/UGSM privacy-notice requirements and publish approved wording if required; no dedicated privacy notice currently exists. **Owner:** UGSM data/legal owner.
- [x] **VERIFIED — Required:** Public results are minimized to the explicit allowlist and held in memory for navigation rather than persisted in browser storage.
- [x] **VERIFIED — Required:** Full NIC is never part of the public response/display; only a masked suffix can be returned.
- [x] **VERIFIED — Required:** Tracked development, test, seed, and load fixtures are explicitly fictional; staging must use the same rule.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm every Preview/staging record is fictional before granting testers access. **Owner:** Staging data owner.
- [x] **VERIFIED — Required:** Application admin access requires a valid Supabase session plus an `admin_profiles` row.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm `admin_profiles` contains only currently authorized UGSM staff and establish periodic/access-termination review. **Owner:** UGSM/Supabase owner.
- [ ] **BLOCKED — Required:** Approve production organization name, examination name/year/subjects/deadlines, result notice, school contact instructions, and public support contact. Current pages provide general school/coordinator guidance but no verified support details. **Owner:** UGSM content owner.
- [ ] **BLOCKED — Required:** Decide and approve terms, maintenance messaging, correction/appeal instructions, and support escalation wording. **Owner:** UGSM content/legal owner.
- [x] **VERIFIED — Required:** Enumeration resistance includes IP and identifier quotas, generic not-found handling, HMAC-only limiter keys, and no existence check before limiting.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm production quotas/monitoring balance enumeration resistance with legitimate shared-school traffic. **Owner:** Product/security owner.

## 10. Operational readiness and runbook

### Ownership record

| Responsibility | Required owner/contact | Status | Notes/evidence |
| --- | --- | --- | --- |
| Production/release owner | ____________________ | **BLOCKED** | Name and reachable examination-period contact required |
| Technical/on-call contact | ____________________ | **BLOCKED** | Primary and backup required |
| Supabase project owner | ____________________ | **BLOCKED** | Dashboard access and backup authority required |
| Vercel project owner | ____________________ | **BLOCKED** | Deploy/rollback authority required |
| Domain/DNS owner | ____________________ | **BLOCKED** | Registrar/DNS access path required |
| UGSM admin/content contact | ____________________ | **BLOCKED** | Publication/unpublication authority required |

### Operating procedures

- [ ] **MANUAL CHECK REQUIRED — Required:** **Inspect logs:** open the Vercel project’s deployment/function logs and Supabase Logs Explorer using least-privilege accounts; filter by timestamp/request stage, never paste sensitive bodies into tickets, and follow the approved retention/redaction policy. **Owner:** Technical owner.
- [ ] **MANUAL CHECK REQUIRED — Required:** **Check health:** request `GET https://<production-origin>/api/health`; expect 200 JSON with only `status`, `service`, `timestamp` and no-store/security headers. A 503 indicates invalid required production configuration, not a full dependency probe. **Owner:** On-call.
- [ ] **MANUAL CHECK REQUIRED — Required:** **Failed deployment:** do not promote; preserve logs, classify build/config/application/database cause, correct in a branch, rerun gates, create a new Preview, and notify the release owner. Never work around `prebuild` environment validation. **Owner:** Vercel/technical owner.
- [ ] **MANUAL CHECK REQUIRED — Required:** **Emergency public-search disable:** first unpublish the active examination through the protected Publication page and verify public lookup returns not-published. If admin access is unavailable, the authorized Supabase owner may change that examination from `PUBLISHED` to `DRAFT` under the incident procedure, record an audit/incident note, and verify. For endpoint-wide abuse, use Vercel controls/maintenance response under change approval; do not enable fail-open rate limiting. **Owner:** UGSM admin/incident lead.
- [ ] **MANUAL CHECK REQUIRED — Required:** **Unpublish:** open Admin → Publication, select the examination, choose Unpublish, confirm, verify audit log, then test both index and NIC public lookup. **Owner:** Authorized UGSM admin.
- [ ] **MANUAL CHECK REQUIRED — Required:** **Rotate secrets:** create replacement, update only the correct Vercel scope, redeploy/verify, then revoke old credential; treat HMAC rotation as new rate-limit buckets. Follow `docs/deployment/vercel.md`. **Owner:** Provider/Vercel owners.
- [ ] **BLOCKED — Required:** **Restore database:** document the exact Supabase plan-supported backup/PITR process; restore to an isolated recovery target, validate migrations/row counts/Auth/application checks, obtain data-owner approval, then plan any production cutover. Record RPO/RTO and never test by overwriting Production. **Owner:** Supabase/data owner.
- [ ] **BLOCKED — Required:** **Contact administrators:** record primary/backup phone or approved channel, availability window, escalation order, and authority to publish/unpublish during the result period. **Owner:** UGSM release owner.
- [ ] **BLOCKED — Required:** **Incident response:** define severity, incident lead, containment, preservation of private evidence, student/privacy notification decision, provider escalation, recovery validation, stakeholder updates, and post-incident review. **Owner:** Incident owner.
- [ ] **MANUAL CHECK REQUIRED — Required:** **Rollback:** select the last known-good Vercel deployment and use Instant Rollback for application regressions; confirm health/auth/search afterward. Rollback does not reverse database migrations and may reuse old build-time variables, so database/secret incidents need a separate recovery/new build. **Owner:** Vercel owner.
- [ ] **BLOCKED — Recommended:** **Planned maintenance:** approve a window, user message, change owner, backup checkpoint, deployment/migration order, verification steps, abort criteria, rollback plan, and completion notice. **Owner:** Release/operations owner.

## 11. Post-deployment verification checklist

Complete first on Preview, then repeat on Production immediately after promotion. Use only an approved fictional published result for verification.

- [ ] **MANUAL CHECK REQUIRED — Required:** Open the canonical home page over HTTPS; confirm correct domain/content and no console/network errors. **Owner/initials:** __________ **Time:** __________
- [ ] **MANUAL CHECK REQUIRED — Required:** Check `/api/health` for 200 and the safe three-field JSON contract. **Owner/initials:** __________
- [ ] **MANUAL CHECK REQUIRED — Required:** Log in as an approved admin and confirm the dashboard. **Owner/initials:** __________
- [ ] **MANUAL CHECK REQUIRED — Required:** In a private/anonymous browser, open an admin-only page and confirm redirect/rejection; after logout, refresh a protected page. **Owner/initials:** __________
- [ ] **MANUAL CHECK REQUIRED — Required:** Search one approved fictional published result by index and NIC; confirm masked/allowlisted output. **Owner/initials:** __________
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm a fictional draft/unpublished examination is hidden and distinct from not-found. **Owner/initials:** __________
- [ ] **MANUAL CHECK REQUIRED — Required:** Open Print and save/inspect an A4 PDF. **Owner/initials:** __________
- [ ] **MANUAL CHECK REQUIRED — Required:** Inspect CSP, HSTS, frame, MIME, referrer, cache, and robots headers on representative routes. **Owner/initials:** __________
- [ ] **MANUAL CHECK REQUIRED — Required:** Perform a small approved rate-limit test; confirm generic 429, retry/reset headers, recovery, and no unintended lockout. **Owner/initials:** __________
- [ ] **MANUAL CHECK REQUIRED — Required:** Inspect Vercel and Supabase logs for errors and latency. **Owner/initials:** __________
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm responses/logs contain no full NIC, raw student identifier, IP, cookies, tokens, API keys, provider bodies, SQL details, or stack traces. **Owner/initials:** __________

## 12. Final release gate

| Field | Value/status |
| --- | --- |
| Release version | `0.1.0` candidate; final tag/commit: ____________________ |
| Planned release date | ____________________ |
| Technical verification performed by | **BLOCKED:** ____________________ |
| Release approved by | **BLOCKED:** ____________________ |
| Open risks | Real integration, deployed E2E/security/accessibility, Upstash, load, backup/restore, operations/content/privacy gates above |
| Deferred recommended items | Upstream ESLint/`braces` advisory monitoring; 500-user stress only after baseline/approval |
| Rollback decision/owner | **BLOCKED:** ____________________ |
| Final go/no-go decision | **GO ONLY AFTER BLOCKERS ARE RESOLVED** |
| Production deployment timestamp | Not deployed: ____________________ |
| Post-launch verification status | Not started: ____________________ |

### Sign-off

- [ ] **Required:** Every Required blocker above is resolved or has a written, named, risk-accepted exception.
- [ ] **Required:** Technical verifier signs: ____________________ Date/time: ____________________
- [ ] **Required:** UGSM release approver signs: ____________________ Date/time: ____________________
- [ ] **Required:** Final decision recorded as `GO` or `NO-GO`: ____________________

Do not change the recommendation to **GO** until the Preview, integration, production-provider, backup/restore, ownership, manual browser, accessibility, content/privacy, and post-deployment gates have evidence.
