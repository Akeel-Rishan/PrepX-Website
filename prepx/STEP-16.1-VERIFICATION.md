# Phase 16, Step 16.1 Verification

Verification date: 2026-10-11

## Outcome

PrepX is configured and documented for a controlled Vercel Preview deployment. No Vercel deployment, DNS change, Supabase setting change, database mutation, or secret rotation was performed.

The repository uses Next.js 15.5.27 rather than the older Next.js 14 target named in the phase brief. The audited patched version was retained. Vercel configuration relies on framework defaults; no `vercel.json` was added.

## Configuration decisions

- Vercel Root Directory: `prepx`
- Node.js: `22.x`
- Package manager: npm 10.9.4 with `package-lock.json`
- Install: `npm ci`
- Build: `npm run build`; `prebuild` validates production environment shapes without printing values
- API runtime: Node.js for health and public result search
- Middleware: Edge-compatible; no Node-only imports or request-body handling
- Persistence: Supabase and Upstash only; no local filesystem persistence, worker, cron, or long-running process
- Uploads: 4,000,000-byte file cap inside Vercel's Function request boundary

## Security findings and corrections

- Switched the public results homepage to the cookie-free Supabase public client. Its query and RLS both restrict reads to `PUBLISHED` examinations, so anonymous rendering does not read or refresh admin session cookies.
- Added `.env.example` with non-secret placeholders and explicit public/server-only boundaries.
- Added `scripts/check-env.cjs` to reject missing production settings, placeholder values, insecure URLs, public secret-looking names, production memory limiting, fail-open production mode, and invalid Vercel proxy/HTTPS overrides.
- Added `scripts/audit-deployment.cjs` to inspect tracked/worktree environment files, credential patterns, public variable names, browser bundles, required deployment files, and the health response allowlist.
- Confirmed server-only barriers protect the Supabase secret client, Upstash, HMAC keys, import parser, data modules, and AI provider.
- Confirmed public result lookup independently requires `PUBLISHED` status and returns an allowlisted result object even though its trusted server client bypasses RLS.
- Confirmed migrations enable RLS on all six tables and grant the atomic import RPC only to `service_role`.
- Replaced realistic-looking development seed identities and school names with explicitly fictional fixtures and zero-filled format-only identifiers.
- Confirmed seed/reset commands are not part of install, build, start, or Vercel hooks.
- Confirmed health responses expose only status, service name, and timestamp.

## Verification results

- `npm ci` - pass (508 packages installed from lockfile)
- `npm run env:check` - pass
- `npm run env:check:production` - pass
- `npm run lint` - pass
- `npm run typecheck` - pass
- `npm test` - pass
- `npm run test:integration:safety` - pass
- `npm run load:validate` - pass; native k6 unavailable
- `npm run test:db` - pass against the currently linked project
- `npx supabase migration list --linked` - pass; local/remote `001` through `005`
- `npm audit --omit=dev --audit-level=moderate` - 0 production vulnerabilities
- Full `npm audit` - 5 development-only findings derived from one unpatched `braces` advisory in the Next.js ESLint toolchain
- `npm run build` - pass; 20 expected dynamic routes/pages plus middleware
- `npm run audit:deployment` after build - pass, including browser bundle scan
- `git diff --check` - pass; only line-ending conversion notices

## Known non-production findings

Tailwind CSS was migrated from 3 to 4.3.3, removing the original nine-item Tailwind development-toolchain advisory chain. Full `npm audit` now reports five development-only entries derived from one `braces` advisory in Next.js's ESLint stack. `braces` has no patched release as of 2026-10-12, and npm's suggested Next.js 14 downgrade is incompatible with the application, so this is documented for upstream monitoring rather than force-fixed. Production dependencies report zero vulnerabilities.

The native `k6` executable is not installed, so load definitions were statically validated but not executed. Full deployed browser/result/print verification still requires a fictional `PUBLISHED` staging examination.

## Manual work remaining

Follow `docs/deployment/vercel.md` to configure Vercel Preview and Production variables, Supabase Auth Site URL/redirect allowlist, custom domain and DNS, staging resources, preview smoke tests, promotion, monitoring, backups, and rollback ownership.
