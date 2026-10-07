# Phase 13, Step 13.2 verification

Implemented on 2026-10-06 using the repository's actual Next.js 15 App Router. No database migration, dependency addition, new API architecture or authentication replacement was needed.

## Implementation

The existing middleware now adds nonce-based CSP, clickjacking protection, nosniff, referrer/permissions policies, COOP/CORP, no-store and sensitive-route no-index headers. HSTS is conditional on production HTTPS configuration. The root layout passes the nonce to the existing fixed theme initializer; Next uses the same nonce for hydration. Unexpected admin session failures fail closed with a generic 500 and security headers.

Shared field utilities preserve Unicode and punctuation while rejecting markup, controls, single-line newlines, overlong values and invalid identifiers/grades. Student, examination, subject, grade/review, search, import and AI-assisted import flows validate on the server. Small forms are bounded, import cells/formulas and actual ZIP expansion are checked, and final import submission cannot bypass text validation. Phase 13.1 checks remain ahead of database access, including for invalid content types.

## Files changed

| Area | Files |
| --- | --- |
| Headers/rendering | `src/middleware.ts`, `src/app/layout.tsx`, `next.config.mjs`, new `src/lib/security/headers.ts` |
| Shared input policy | New `src/lib/security/input.ts`, `src/lib/security/zod.ts`, `src/lib/security/import-file.ts` |
| Schemas | `src/lib/validations/{student,subject,examination,grade,import,search,public-result}.ts` |
| Search | `src/app/api/results/search/route.ts`, `src/lib/public-search.ts` |
| Admin actions | `src/lib/actions/{auth,students,subjects,examinations,grades,review,import,import-ai,publication}.ts` (publication only initializes CSP-compatible Zod) |
| Data/import/privacy | `src/lib/data/students.ts`, `src/lib/import-parser.ts`, `src/lib/import-validator.ts`, `src/lib/import-template.ts`, `src/lib/ai/import-assistant.ts`, `src/lib/supabase/server.ts` |
| Tests | New `scripts/test-security.cjs`, `scripts/test-security-browser.cjs`; updated `scripts/test-auth-session.cjs`, `scripts/test-rate-limit-live.cjs`, `package.json` |
| Documentation | `.env.local.example`, app/root READMEs, new `SECURITY.md`, this report |

## Checks executed

Passed:

- `npm.cmd run test:logic`: full existing suite plus security checks; database/Auth/Redis/provider operations mocked.
- `npm.cmd run test:security`: response policies, production/development differences, nonce uniqueness/forwarding, incoming nonce overwrite, HSTS gating, Unicode/markup/control/length handling, grade/identifier rules, request failures, protected mutation input checks and ZIP/formula rejection.
- Targeted import and session regression scripts after final input/session adjustments.
- `npm.cmd run type-check`, `npm.cmd run lint`, `npm.cmd run build`.
- `npm.cmd run test:security:browser`: production build in headless Microsoft Edge.
- `npm.cmd run test:rate-limit:live`: actual HTTP searches against existing published data plus Edge result navigation, with IP quota 6/10 seconds and identifier quota 2/10 seconds.

Security tests reject both a declared oversized XLSX archive and one whose uncompressed size is forged smaller, so the check exercises the actual decompression cap. Normal CSV/XLSX fixtures and multilingual rows still pass. Existing tests cover admin authorization, examination locks, publication, audit behavior, success/not-found/not-published responses, NIC masking, rate-limit privacy and provider failures.

## Browser and HTTP verification

| Check | Result |
| --- | --- |
| Home, result fallback, not-found and not-published pages | Load and render with expected actual HTTP headers |
| Production hydration and client navigation | Pass, with no unexpected CSP violations or page errors |
| CSP enforcement | Fresh nonces across requests; an inline script injected into an HTML response without a nonce is blocked |
| Fonts/background/layout behavior | Local fonts load; normal page rendering and existing result action remain available |
| Login page and anonymous protected route | Login form loads; password bytes unchanged; protected route redirects to login with no-store/no-index |
| Health and unsupported search methods | Actual headers present; unsupported method returns 405 |
| Result success and error navigation under production CSP | Pass using browser-intercepted result fixtures; masking and Print / Save as PDF action verified |
| Real index and NIC searches | Pass using development memory limiter; same safe public result payload |
| Real identifier/IP quotas | Generic 429, security headers, Retry-After, remaining/reset headers and no-store preserved |
| Invalid requests and spoofed forwarding headers | Invalid requests consume quota; untrusted headers do not bypass the local bucket |
| Expiry and browser feedback | Search succeeds after reset; blocked retry shows existing generic feedback |
| Local HSTS | Absent on HTTP; production HTTPS/subdomain conditions covered deterministically |

No database records were changed by live checks. Authenticated admin create/edit/grade/import/publish actions were verified with deterministic action tests, not live browser writes: no dedicated test-admin credentials were supplied. The actual print dialog was not opened in this security step.

The installed Zod initially emitted a CSP event while probing `Function()`. Its supported interpreter configuration now avoids that probe without enabling production `unsafe-eval`. Direct Zod imports retain tree shaking: the final home-page first-load JavaScript remains about 141 kB, with about 153 kB for results. Dynamic nonce-bearing HTML does require per-request rendering; this tradeoff is documented.

An additional development CSP check exposed Console Ninja's injected connection to a separate localhost WebSocket port. That debugger connection remains intentionally blocked and generates development-only CSP events. Real development searches/limiting pass; the production browser run has no such violations. Disable injected debuggers for a clean development CSP check.

## Environment, assumptions and follow-up

No new required variables. `NEXT_PUBLIC_SUPABASE_URL` supplies the approved connection origin. Optional `SECURITY_HTTPS_ONLY=true` enables HSTS on non-Vercel production HTTPS hosts; `SECURITY_HSTS_INCLUDE_SUBDOMAINS=true` requires all subdomains to be HTTPS-ready. Vercel production builds assume managed HTTPS. No preload is enabled.

The CSP allows inline styles for existing React/theme/background behavior, but production script evaluation and arbitrary inline scripts remain blocked. Nonce-bearing HTML must not be cached/reused across requests. Existing third-party-free script/font/image usage and password-based admin authentication informed the policy. Review additions such as analytics, external images, embeds, OAuth popups or Supabase Realtime before enabling them.

Before release, verify authenticated admin workflows in the browser with a dedicated test account, deployed HTTPS/proxy/header behavior, hosting upload limits and real Upstash shared quotas/outages. Live Upstash credentials were unavailable; ordinary tests mock Redis. Future phases can add operational abuse monitoring, dependency/hosting review and log retention controls. The code does not rewrite historical records or claim to replace RLS, authentication, React escaping or infrastructure security.

See [SECURITY.md](SECURITY.md) for exact directives, field/body limits and repeatable commands, and [RATE-LIMITING.md](RATE-LIMITING.md) for the unchanged production limiter setup.
