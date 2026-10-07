# Security headers and input handling

Phase 13.2 extends the existing Next.js 15 App Router, middleware, schemas and server actions. Database schemas and authorization rules are unchanged. The public API still accepts `{ examinationId, indexNumber?, nicNumber? }`, with index taking priority if both are supplied; it does not use the illustrative `{ type, value }` format. Unknown request fields are rejected. Phase 13.1 rate limiting remains before database access and counts invalid input, including incorrect content types.

## Response headers

The existing middleware covers document requests, every admin path and every API path. It does not consume bodies. Only admin paths perform the existing session refresh/redirect checks. Static scripts, styles, images, fonts and import templates do not need per-request nonces; Next's static asset handling remains intact. Admin/API paths match even when they contain file extensions.

| Header | Value / policy |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `Content-Security-Policy` | Per-response script nonce; directives below |
| `Cache-Control` | `private, no-store` on nonce-bearing pages and APIs; the search route retains its existing no-store/no-cache response policy |
| `X-Robots-Tag` | `noindex, nofollow, noarchive` for `/admin`, `/results`, `/api` and descendants |
| `Strict-Transport-Security` | Production HTTPS deployments only: one year; optional subdomains; never preload |

Security headers also cover admin server-action responses and authentication redirects. They do not remove rate-limit headers or session cookies. The framework's `X-Powered-By` header is disabled. No-index is an indexing preference, not access control: protected layouts/actions still verify the admin profile.

### CSP and rendering

The production policy is:

```text
default-src 'self'; base-uri 'self'; object-src 'none';
frame-ancestors 'none'; frame-src 'none'; form-action 'self';
img-src 'self' data: blob:; font-src 'self' data:;
style-src 'self' 'unsafe-inline';
script-src 'self' 'nonce-<fresh random value>' 'strict-dynamic';
script-src-attr 'none'; connect-src 'self' <configured Supabase HTTPS origin>
```

Middleware generates 128 random bits for each nonce and overwrites caller-supplied nonce/CSP request headers. Next receives the request CSP to nonce its scripts; the root layout reads the nonce for the existing fixed theme initializer. No user input enters that initializer. There is no new raw-HTML rendering.

The [Next.js nonce strategy](https://nextjs.org/docs/15/app/guides/content-security-policy) requires dynamic rendering: document HTML is rendered per request and cannot be shared through static generation or a CDN page cache. Static assets and existing data caches remain available. The tradeoff is additional server rendering work; do not enable static export, ISR for document HTML, or a cache that reuses nonce-bearing pages without revisiting this strategy.

Inline styles remain allowed for React style properties, the theme initializer and background effects. Production scripts allow neither `unsafe-inline` nor `unsafe-eval`, and no wildcard/external script origins are approved. Zod uses its interpreter (`jitless`) so validation does not probe runtime code generation and trigger CSP violations. There are no external fonts, analytics scripts or current Realtime WebSocket dependencies. The exact Supabase origin comes from `NEXT_PUBLIC_SUPABASE_URL`; credentials, paths and query parameters are never CSP sources.

Only local `NODE_ENV=development` outside Vercel permits script evaluation for Next dev tooling and a WebSocket at the local request origin for HMR. Vercel never receives those exceptions. Preview toolbars, future analytics, embeds, OAuth popups, external images or Realtime subscriptions require a deliberate policy review; they are not broadly allowlisted now. Test with extensions disabled when investigating injected browser scripts.

### HSTS and environment

No new mandatory environment variables are introduced. Existing Supabase and production rate-limit variables remain required for their features.

- `NODE_ENV=production` plus `VERCEL=1`: HTTPS hosting is assumed and HSTS is sent.
- Other production hosts: set `SECURITY_HTTPS_ONLY=true` only after the ingress enforces HTTPS for the entire site.
- `SECURITY_HSTS_INCLUDE_SUBDOMAINS=true`: optional, only after every subdomain is HTTPS-ready. It has no effect unless HSTS is otherwise enabled.
- Local development and ordinary local `next start` without the HTTPS opt-in send no HSTS. Caller-controlled forwarding headers cannot enable it. No preload directive is used.

## Validation and normalization

Pure utilities are shared with previews where useful; trusted server actions and route handlers always run their schemas again. There is no global body sanitizer or middleware body rewriting.

- Plain text uses Unicode NFC, trims surrounding whitespace and collapses repeated Unicode spaces on single-line fields. Sinhala, Tamil, English, combining marks and ordinary punctuation remain text. Stored values are not HTML-encoded.
- C0/C1 controls, line breaks and Unicode line separators are rejected on single-line fields before trimming. Markup delimiters `<` and `>` are rejected. Nothing is stripped to turn a dangerous identifier into a valid one.
- The existing examination result notice deliberately remains multiline plain text, up to 1000 characters; markup and other controls are rejected.
- Student/school/center/organization/examination names are capped at 200 characters; subjects at 100 and subject codes at 10. Existing minimum lengths remain. Raw normalization inputs also have bounded overhead.
- Index numbers remain uppercase ASCII letters/digits, maximum 50. NICs remain either nine digits plus V/X or twelve digits, canonical uppercase, maximum 12. Leading zeros are preserved. Public NIC values are masked; rate-limit keys use HMAC. Authorized admin editing/import still needs the original NIC and is not a public endpoint.
- Grades normalize case and accept only A, B, C, S, W, AB. Null/blank handling follows each existing grade workflow. Status transitions and UUID checks remain server controlled.
- Authentication passwords, tokens, secrets and database-generated fields are not normalized. Login forms are size checked without changing password bytes.

The same field policies cover student, subject and examination forms; search; grade entry/review; import preview and final submission; import header mappings and AI suggestions. Student list filters are length/format bounded before the existing escaped, fixed-column PostgREST filter is built. Queries use typed equality/inclusion methods; no table or column name comes from user input. The Supabase service client now has an explicit `server-only` import barrier. Existing admin authorization and publication checks remain in place.

Publish/unpublish actions accept validated IDs and use server-owned statuses. Audit metadata is generated server-side from validated values, recursively masks `nic_number`, and is rendered as React text. Existing safe admin redirect allowlisting is retained; no new user-controlled navigation URL is introduced. React continues to escape all user text.

## Request and import limits

| Boundary | Limit |
| --- | --- |
| Search JSON | 8 KiB, two-second body-read deadline, `application/json` (charset parameter accepted) |
| Small admin/login forms | 16 KiB total UTF-8 keys/values; file entries rejected |
| Server-action transport | Existing 11 MiB framework envelope, necessary for multipart imports |
| Import upload / parser input | 10 MiB, `.csv` or `.xlsx`; actual content parsed and validated |
| XLSX expansion | 32 MiB actual total uncompressed bytes, at most 2000 archive entries |
| Spreadsheet | 1000 data rows, 250 columns, 1024 characters per raw cell; narrower field limits still apply |
| Header mapping JSON | 64 KiB text, at most 100 mappings with 200-character fields |
| Grade/import submission | Existing 1000 changes/rows and 100 subject entries per submitted import row |

The 16 KiB form check runs after framework parsing; 11 MiB remains the hard transport envelope for server actions. Hosting platform request limits can be lower. In particular, verify Vercel's deployed body limit before promising 10 MiB uploads; this step preserves the existing import architecture rather than introducing storage-backed uploads.

Before ExcelJS loads XLSX, archive contents are decompressed with an actual output cap. Encrypted archives, ZIP64, unsupported compression, macros, embedded objects, external-link parts, duplicate members, unsafe paths and XML entity declarations are rejected. Formula cells (including cached results) and hyperlink cells are rejected. CSV is decoded as UTF-8 and bounded before parsing. Formula-like cells beginning with `=`, `+`, `-` or `@` are rejected in imports, including ignored columns. This spreadsheet-specific rule does not remove punctuation from ordinary names in forms. Template subject headers are escaped as literal CSV cells when needed.

Import previews and final actions share field validation. Final submission cannot bypass preview checks. Required columns, duplicate rows, supported grades, examination locks and subject ownership remain enforced. Errors identify a field/row or category without echoing NICs, identifiers, invalid grades, database messages or stack traces. No real records are changed by deterministic tests.

Unsupported search methods return 405 and `Allow: POST`; invalid JSON/content types/oversized bodies retain the existing generic 400 format after rate checks. A quota denial still takes precedence as generic 429. Framework-generated transport failures may use Next's response format rather than the route's JSON envelope.

## Verification and remaining work

```powershell
npm.cmd run test:security
npm.cmd run test:logic
npm.cmd run type-check
npm.cmd run lint
npm.cmd run build
```

For browser checks, start the production build locally, then use another terminal with Microsoft Edge and `playwright-core` installed:

```powershell
npm.cmd run start -- --port 3003
# In another terminal:
$env:TEST_BASE_URL='http://127.0.0.1:3003'
$env:PLAYWRIGHT_MODULE='C:/path/to/node_modules/playwright-core'
npm.cmd run test:security:browser
```

The browser check uses fixture result responses to isolate CSP/navigation from production limiter credentials. It checks actual document/API headers, protected redirects, nonce freshness, blocked untrusted scripts and unexpected CSP events. Use the separate [live rate-limit check](RATE-LIMITING.md) to exercise real searches and 429/reset behavior. A development run of the security browser check requires `TEST_DEVELOPMENT=true`.

Run CSP checks without injected debugging tools. In this workstation's development environment, Console Ninja injects connections to a separate localhost WebSocket port; those are intentionally blocked and produce development-only CSP events. The application and its same-origin HMR connection do not need that debugger endpoint. The production browser check does not have those violations.

See [the verification report](STEP-13.2-VERIFICATION.md) for checks actually performed and remaining deployment/admin checks. Future infrastructure work includes real Upstash multi-instance verification, deployed HTTPS/proxy/header inspection, upload platform limits, abuse monitoring and log retention. Existing stored data is not rewritten; React escaping remains essential for historical values. CSP is an additional defense and does not replace authorization, validation, patching or safe rendering.
