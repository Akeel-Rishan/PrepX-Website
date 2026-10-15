# PrepX production pre-launch checklist

Checklist date: 2026-10-15
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

- [ ] **BLOCKED — Required:** Complete a Vercel Preview deployment with the dedicated staging Supabase project and the approved shared-free-tier Upstash configuration, then run the post-deployment checklist. The repository has no `.vercel/project.json`, no local Vercel authentication, and no documented Preview URL. **Owner:** Technical release owner. **Needed:** Vercel login/team/project selection, separately scoped Preview variables, Preview URL, and dated test record. The shared Upstash database must use the distinct Preview and Production HMAC secrets generated on 2026-10-15.
- [ ] **BLOCKED — Required:** Run the real integration suite against the isolated local Docker Supabase stack. `.env.test` is now present, but the Docker daemon was unavailable on 2026-10-13. **Owner:** Developer. **Needed:** start Docker, run `npm run test:integration:setup`, then `npm run test:integration`; do not substitute a hosted database.
- [ ] **BLOCKED — Required:** Pass k6 smoke and normal-load profiles against an explicitly approved staging/performance target with fictional published data. Native k6 and the guarded fixture configuration are available. Two local optimized-build smoke runs on 2026-10-15 had zero functional errors and zero 429s but failed the 1000 ms p95 budget; normal load was correctly withheld. **Owner:** Performance tester. **Needed:** deployed staging target, investigation/tuning, passing smoke, then normal load and saved summaries.
- [ ] **BLOCKED — Required:** Enable/obtain a production Supabase backup and perform/document a safe restore rehearsal. The read-only CLI inventory on 2026-10-13 returned no available backups and PITR disabled; restoring Production is not an acceptable rehearsal. **Owner:** Supabase project owner. **Needed:** plan-appropriate backup/export, isolated recovery project, approved rehearsal window, and restoration record.
- [ ] **BLOCKED — Required:** Complete and approve `docs/governance/operational-ownership.md`, including named primary/backup production, Vercel, Supabase, DNS, privacy, incident, content and examination-period contacts. The register and access-verification checklist now exist; real names and acknowledgements are still required. **Owner:** UGSM release approver.
- [ ] **BLOCKED — Required:** Finish the human/deployed portions of accessibility and browser QA. Optimized local Edge automation passed responsive layouts, keyboard focus, A4 PDF generation, reduced motion, and fictional Sinhala/Tamil rendering on 2026-10-13; screen-reader, 200% zoom/contrast, native Save-as-PDF review, authenticated admin workflows, and final-domain headers remain manual. **Owner:** QA/release owner.
- [ ] **BLOCKED — Required:** Complete and approve `docs/governance/privacy-content-policy.md`. The technical privacy baseline, retention decision table, proposed public wording, Terms decision and privacy-notice decision now exist; UGSM approval is still required. **Owner:** UGSM data owner.

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
- [ ] **BLOCKED — Required:** Enable or otherwise obtain plan-appropriate production Supabase backups and make retention match UGSM requirements. **Evidence:** `supabase backups list` on 2026-10-13 reported no available backup and PITR disabled. **Owner:** Supabase owner.
- [ ] **BLOCKED — Required:** Rehearse a restore to a separate recovery project/branch, validate row counts/auth/configuration, record RTO/RPO and evidence, and never overwrite Production for the rehearsal. **Owner:** Supabase owner.
- [ ] **BLOCKED — Required:** Fill and approve the retention schedule in `docs/governance/privacy-content-policy.md` for student records, audit logs, provider logs, limiter fingerprints, backups, test data and incident evidence. **Owner:** UGSM data owner.

## 3. Authentication and authorization

- [x] **VERIFIED — Required:** The named administrator exists independently in staging and Production Supabase Auth with matching `admin_profiles`. Real password login, RLS-backed own-profile access, and global `signup_disabled` rejection passed in both projects on 2026-10-15.
- [ ] **MANUAL CHECK REQUIRED — Required:** Before Production, rotate the existing administrator credential to a strong password stored in the approved password manager and enroll MFA when the supported admin flow is approved. All generated/transitional password fields were removed from the ignored infrastructure file on 2026-10-15. **Owner:** Named administrator/Supabase owner.
- [ ] **MANUAL CHECK REQUIRED — Required:** Verify the Supabase production Site URL and any intentionally required redirect allowlist entries. Current password login has no OAuth callback. **Owner:** Supabase owner.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm secure session cookies, refresh, expiry, revocation, login, and logout on the final HTTPS domain. **Owner:** QA/security owner.
- [x] **VERIFIED — Recommended:** The configured Supabase Auth endpoint was reachable on 2026-10-13 and safely rejected one fictional credential probe without exposing provider details. This is connectivity evidence only; it does not verify the final domain, redirect allowlist, real admin authorization, or session-cookie attributes.
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
- [x] **VERIFIED — Required:** The configured live Upstash database atomically shared one random 30-second quota across 21 independent clients on 2026-10-13; exactly seven attempts were allowed, all clients shared one reset, and cleanup was requested. **Evidence:** `npm run test:rate-limit:upstash`.
- [ ] **BLOCKED — Required:** Verify the HTTP rate-limit path across multiple deployed Preview/Vercel instances, including trusted proxy headers, generic 429/recovery, and timeout/outage behavior. The live provider check above proves shared Redis atomicity but not Vercel routing. **Owner:** Technical release owner.
- [x] **VERIFIED — Required:** No cross-origin client is supported; routes do not emit permissive `Access-Control-Allow-Origin` headers, so browser use remains same-origin.
- [x] **VERIFIED — Required:** State changes use authenticated Next.js Server Actions with framework origin checks plus server-side admin authorization; no cookie-authenticated state-changing public REST endpoint exists.
- [x] **VERIFIED — Required:** `npm audit --omit=dev --audit-level=moderate` reports zero production dependency vulnerabilities.
- [x] **VERIFIED — Recommended:** Tailwind CSS 3 was migrated to 4.3.3 and the original nine-item Tailwind development-toolchain audit chain was removed. Type-check, lint, unit/security tests, production build, responsive result browser tests, CSP tests, and A4 print tests pass after migration.
- [ ] **DEFERRED — Recommended:** Monitor the new upstream `braces` advisory in Next.js's development-only ESLint stack. Full `npm audit` reports five entries derived from this one transitive package, but `npm audit --omit=dev` remains clean and no patched `braces` release exists as of 2026-10-12. Do not use npm's suggested incompatible Next.js 14 downgrade or a forced audit fix.

## 5. Environment and deployment

- [ ] **BLOCKED — Required:** Connect Vercel to `https://github.com/Akeel-Rishan/PrepX-Website.git`, the controlled production branch, and the intended team/project. No local Vercel authentication or `.vercel/project.json` was available on 2026-10-13. **Owner:** Vercel owner.
- [ ] **BLOCKED — Required:** Configure and verify canonical production domain, DNS ownership, HTTPS, redirects, and certificate issuance. **Owner:** Domain/Vercel owner.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm Development, Preview, and Production use separately scoped variables. Preview and Production use separate Supabase projects. By explicit owner decision on 2026-10-15, they share the one available free Upstash database but use different HMAC secrets; do not run staging load/abuse tests while Production is serving traffic. **Owner:** Vercel owner.
- [x] **VERIFIED — Required:** `.env.example` contains non-secret placeholder values only; private environment/load/test/Vercel files are ignored and deployment audit passes.
- [x] **VERIFIED — Required:** Public variables are limited to Supabase public URL/publishable key and application name/URL; secret/provider/HMAC/AI variables are server-only.
- [x] **VERIFIED — Required:** Separate healthy staging (`Prepx website`) and Production (`PrepX Production`) Supabase projects exist in the UGSM organization and Tokyo region. Production migrations `001`–`005` were applied and confirmed on 2026-10-15.
- [x] **VERIFIED — Required:** Global public signup is disabled on both hosted Supabase projects while the email/password provider remains enabled for existing administrators. A minimal hosted hardening configuration preserves unrelated MFA, email, storage, and pooler settings.
- [ ] **MANUAL CHECK REQUIRED — Required:** Compare the Vercel Production Supabase project reference and keys with the approved production project. **Owner:** Supabase/Vercel owners.
- [ ] **MANUAL CHECK REQUIRED — Required:** Configure the approved shared Upstash URL/token in both Vercel scopes and use the distinct private Preview and Production `RATE_LIMIT_HASH_SECRET` values generated on 2026-10-15. Both configurations returned `PONG`; the secrets are 64 and 96 characters and were not recorded in this checklist. **Owner:** Vercel owner.
- [x] **VERIFIED — Required:** Missing/placeholder/insecure production variables, memory limiting, fail-open mode, and invalid Vercel proxy/HTTPS overrides fail production validation without printing values.
- [x] **VERIFIED — Required:** Runtime persistence uses Supabase/Upstash only; there are no workers, cron jobs, WebSockets, long-running processes, or local-filesystem persistence requirements.
- [x] **VERIFIED — Required:** Repository settings specify Root Directory `prepx`, Next.js defaults, Node `22.x`, npm `10.9.4`, `npm ci`, `npm run build`, and default output; no `vercel.json` is necessary.
- [x] **VERIFIED — Required:** Production build completes with 20 expected app/API routes and middleware.
- [x] **VERIFIED — Required:** Production migrations `001`–`005` were applied without seeds and the remote migration list exactly matched on 2026-10-15. Reconfirm before enabling traffic if any migration is added. **Owner:** Supabase owner.
- [ ] **MANUAL CHECK REQUIRED — Required:** Inspect Preview and Production build/function logs for secrets, student identifiers, provider bodies, and unexpected errors. **Owner:** Technical release owner.
- [ ] **BLOCKED — Required:** Establish a known-good Vercel deployment and assign an operator who understands Instant Rollback and its database/environment limitations. **Owner:** Vercel/release owner.

## 6. Testing and quality gates

- [x] **VERIFIED — Required:** `npm test` — PASS on 2026-10-13; logic, validation, privacy, publication, rate-limit, header, import, error, and API contracts passed.
- [ ] **BLOCKED — Required:** `npm run test:integration` — NOT RUN; `.env.test` exists, but the Docker daemon/local Supabase stack is unavailable. No hosted or production database was contacted.
- [x] **VERIFIED — Required:** `npm run test:integration:safety` — PASS; hosted/default URLs and unsafe transport are rejected.
- [x] **VERIFIED — Required:** `npm run lint` — PASS.
- [x] **VERIFIED — Required:** `npm run typecheck` — PASS.
- [x] **VERIFIED — Required:** `npm run build` — PASS with production environment validation.
- [x] **VERIFIED — Recommended:** Local optimized-production Edge result/navigation, responsive, print/A4-PDF, CSP/security, anonymous-admin redirect, 404, global-error, reduced-motion, and fictional Sinhala/Tamil browser suites — PASS on 2026-10-13. Native Save-as-PDF dialog, authenticated admin pages, screen readers, and deployed-environment checks remain manual.
- [x] **VERIFIED — Required:** `npm run load:validate` — PASS offline; profiles, guards, schemas, privacy checks, thresholds, metrics, and summaries validated without HTTP traffic.
- [ ] **BLOCKED — Required:** `npm run load:smoke` — RUN TWICE against the local optimized build on 2026-10-15 with one VU for five seconds. Both runs returned valid results with zero errors, zero check failures, and zero rate limiting; search p99 passed at approximately 1.27–1.37 seconds, but p95 failed at approximately 1.26–1.36 seconds against the 1.0-second budget. Aggregate output is saved privately under `tests/load/results/`.
- [ ] **BLOCKED — Required:** `npm run load:normal` — NOT RUN because the required smoke threshold failed twice. Run only after smoke passes on the approved staging/performance target; the current private local override is a reduced one-VU/five-second profile and is not release-quality normal load.
- [x] **VERIFIED — Required:** No critical/high production dependency vulnerability or known failing deterministic test remains.
- [x] **VERIFIED — Required:** No ignored/skipped flaky application test was found; external/browser/load prerequisites are documented rather than silently skipped.
- [x] **VERIFIED — Required:** Repository test/seed/load fixtures are clearly fictional and use zero-filled format-only identifiers.
- [x] **VERIFIED — Required:** Integration and load guards refuse accidental hosted/production targets unless narrowly and explicitly approved; normal tests do not use Production.
- [x] **VERIFIED — Required:** Public/API response schemas, publication/privacy rules, rate limiting, security headers, errors, and masking have deterministic coverage.

## 7. Performance and reliability

- [x] **VERIFIED — Recommended:** Production build reports approximately 142 kB first-load JS for `/` and 153 kB for `/results`; public reads are dynamic and the homepage uses a cookie-free client.
- [ ] **MANUAL CHECK REQUIRED — Required:** Measure production-like public home Core Web Vitals and establish an accepted baseline. **Owner:** Performance/QA owner.
- [ ] **BLOCKED — Required:** Demonstrate result-search p95 under 1000 ms and p99 under 2000 ms in approved staging. Local smoke on 2026-10-15 passed p99 and correctness/error thresholds but repeatedly missed p95 at approximately 1.26–1.36 seconds. These remain initial experiment budgets, not an agreed production SLO. **Owner:** Product/technical owners.
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
- [x] **VERIFIED — Recommended:** Optimized local Edge automation confirms public-result keyboard focus, no horizontal overflow at 320/375/768/1280 px in both themes, reduced-motion animation suppression, fictional Sinhala/Tamil/English rendering, semantic result tables, and single/multi-page A4 PDF generation. **Evidence:** `npm run test:results:browser` on 2026-10-13.
- [ ] **MANUAL CHECK REQUIRED — Required:** Complete keyboard-only navigation for public search/results and every admin workflow; confirm logical order and no traps. **Owner:** Accessibility tester.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm visible focus at 200% zoom and in light/dark themes. **Owner:** Accessibility tester.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm every deployed form field has an accessible name and every error is programmatically associated/announced. **Owner:** Accessibility tester.
- [ ] **MANUAL CHECK REQUIRED — Required:** Test modal initial focus, containment, Escape/close, and focus return. **Owner:** Accessibility tester.
- [ ] **MANUAL CHECK REQUIRED — Required:** Measure text, component, focus, and status color contrast. **Owner:** Accessibility tester.
- [ ] **MANUAL CHECK REQUIRED — Required:** Test screen-reader announcements for loading, validation, search, import, save, publication, and error states. **Owner:** Accessibility tester.
- [ ] **MANUAL CHECK REQUIRED — Required:** Visually test supported mobile, tablet, desktop, 200% zoom, and orientation sizes. Automated width/overflow checks passed, but human approval is still required. **Owner:** QA.
- [ ] **MANUAL CHECK REQUIRED — Required:** Open the native Print dialog and visually approve saved A4 output, including multi-page grades. Automated Chromium PDF structure/layout checks passed. **Owner:** QA/content owner.
- [ ] **MANUAL CHECK REQUIRED — Recommended:** Confirm essential state changes remain understandable with operating-system reduced motion. Automated animation suppression passed. **Owner:** QA.
- [ ] **MANUAL CHECK REQUIRED — Required:** Have an approved Sinhala/Tamil content reviewer visually approve names, schools, and messages. Fictional multilingual browser rendering passed, but linguistic/font approval requires a human reviewer. **Owner:** UGSM content/QA owner.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm grade/status/error meaning never depends on color alone. **Owner:** Accessibility tester.

## 9. Privacy and content

- [ ] **BLOCKED — Required:** Record and approve the public privacy-notice decision in `docs/governance/privacy-content-policy.md`; if required, publish only the approved wording. **Owner:** UGSM data/legal owner.
- [x] **VERIFIED — Required:** Public results are minimized to the explicit allowlist and held in memory for navigation rather than persisted in browser storage.
- [x] **VERIFIED — Required:** Full NIC is never part of the public response/display; only a masked suffix can be returned.
- [x] **VERIFIED — Required:** Tracked development, test, seed, and load fixtures are explicitly fictional; staging must use the same rule.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm every Preview/staging record is fictional before granting testers access. **Owner:** Staging data owner.
- [x] **VERIFIED — Required:** Application admin access requires a valid Supabase session plus an `admin_profiles` row.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm `admin_profiles` contains only currently authorized UGSM staff and establish periodic/access-termination review. **Owner:** UGSM/Supabase owner.
- [ ] **BLOCKED — Required:** Approve the production examination name/year/subjects/deadlines and examination-specific notice. The organizer, support email and baseline result messages are documented in `docs/governance/privacy-content-policy.md`. **Owner:** UGSM content owner.
- [ ] **BLOCKED — Required:** Approve the Terms decision, maintenance message, correction route and support escalation baseline in `docs/governance/privacy-content-policy.md`. **Owner:** UGSM content/legal owner.
- [x] **VERIFIED — Required:** Enumeration resistance includes IP and identifier quotas, generic not-found handling, HMAC-only limiter keys, and no existence check before limiting.
- [ ] **MANUAL CHECK REQUIRED — Required:** Confirm production quotas/monitoring balance enumeration resistance with legitimate shared-school traffic. **Owner:** Product/security owner.

## 10. Operational readiness and runbook

### Ownership record

The authoritative sign-off form is `docs/governance/operational-ownership.md`. Keep sensitive phone numbers and recovery details in the referenced private UGSM contact roster, not in Git.

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
| Open risks | Real integration, Preview/deployed E2E/security/accessibility, Vercel HTTP multi-instance behavior, load, unavailable Supabase backup/restore evidence, operations/content/privacy gates above |
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
