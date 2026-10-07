# PrepX API → Supabase integration tests (Phase 15.2)

These tests use the existing Node assertion/TypeScript-loader convention. Application routes and server actions run in-process against **real local Supabase Auth, PostgREST, PostgreSQL constraints, RLS and the import RPC**. This is not a running Next.js/browser/E2E suite. No production application code, schema or authentication rules were changed.

## Safe setup

1. Install dependencies (`npm ci`) and start Docker Desktop with Linux containers. Use Node 22+ (native File, fetch and parseEnv) and the repository's declared Supabase CLI.
2. Run `npm run test:integration:setup` from `prepx` (`npm.cmd` in PowerShell).
3. The helper creates an ignored `.integration/local/supabase` work directory with project ID `prepx-integration`, API port **55321**, DB port **55322**, shadow port **55320**, and seed scripts disabled. It copies the repository migrations, starts this dedicated stack, and runs `supabase migration up --local --workdir ...`. It never runs reset, links a project, or pushes to a remote database. Inherited Supabase/PG connection settings are removed from CLI subprocesses.
4. Setup captures local status output privately and creates ignored `.env.test` only if absent. It never prints keys. If configuring manually, copy `.env.test.example` and fill its **test-only** keys with the dedicated stack's legacy ANON_KEY and SERVICE_ROLE_KEY JWTs. Do not copy `.env.local` or a hosted project's credentials. Existing `.env.test` is not overwritten.
5. Run `npm run test:integration:safety`, then `npm run test:integration`.

Safety checks require the exact URL `http://127.0.0.1:55321`, explicit `LOCAL_TEST_DATABASE_ONLY` confirmation, and legacy local JWT issuer `supabase-demo` with the correct anon/service_role roles. Hosted URLs, the normal development port, alternate hosts, credentials embedded in URLs, paths, missing configuration and modern hosted secret keys are rejected **before connection**. SDK fetches are origin-restricted, refuse redirects and have a timeout. The runner never loads `.env.local`, `.env.production` or ambient Supabase credentials. Use this port exclusively for the generated local test stack; never point it at a production tunnel/proxy. JWT metadata checks are an accidental-misconfiguration guard, not cryptographic proof of database identity.

The installed CLI's help supports the explicit local/workdir flags used here. See the [Supabase CLI reference](https://supabase.com/docs/reference/cli/supabase-migration-up) for local migration commands. Docker images may need downloading on first setup. If CLI startup fails, repair the local Docker/CLI setup; do not substitute production credentials or remove the guards.

## Commands

- `npm run test:unit`: existing offline Phase 15.1 suite; integration is excluded.
- `npm run test:integration`: five independent real-database groups.
- `npm run test:integration -- public import`: selected groups, in either order. Names: public, admin, authorization, import, security.
- `npm run test:integration:safety`: offline configuration guard tests.
- `npm run test:integration:mock`: explicitly labeled fallback reusing existing mocked route/action/auth/rate-limit/health tests, with network blocked. **Does not verify PostgreSQL, RLS, constraints, migrations or atomicity.** There is no automatic fallback or silent successful skip.
- `npm run test:integration:teardown -- <run-uuid>`: recover fixtures from one retained `.integration/runs/<run-uuid>.json` after interruption/failure. Broad deletion is not supported.

To stop the dedicated stack while retaining its data, run `npx --no-install supabase stop --workdir .integration/local`. Do not use `db reset` on your regular development directory. Setup reapplies only pending local migrations; a clean database is not required between runs.

## Fixtures, authentication and cleanup

Each group creates a unique run UUID, an admin and a non-admin at `example.invalid`, and exams labeled with an exact run-specific organization marker. Passwords are generated only in memory. Auth users are created with confirmed email so no email service is needed. Normal password sign-in obtains real signed sessions; the real `getAdminUserId` checks claims and the real admin profile query under RLS. Anonymous and non-admin tests exercise the same actions and direct RLS denial. Supabase client factories supply these real clients in place of Next cookie context; they do not grant admin status or fake database results.

Only Next cache/invalidation and redirect mechanics are adapted. Redis is replaced by the existing MemoryRateLimitStore with a fixed clock and fresh buckets. Public requests still execute the actual schema, limiter, query/publication gate, status calculation and response allowlist. Next middleware, network HTTP transport, cookie refresh, browser navigation and Next cache invalidation are outside this suite.

Fixtures use fictional names and zero-filled format-only NIC-like strings. Each group seeds itself through real server actions. Finally blocks remove only exams with the exact run marker (children cascade), audits belonging to the created admin and the created auth users. Before deletion, saved user IDs are checked against their run ownership metadata. No tables are truncated and no database is reset. Failed cleanup retains the manifest; teardown is retryable, including already-removed users. A hard kill in the tiny interval between Auth user creation and manifest write can leave a test user: inspect only `example.invalid` users with matching `prepx_test_run` metadata manually in the dedicated stack. No broad user sweeper is provided.

## Covered flows and preserved contracts

- Public search by normalized index and modern/old NIC; exact public field lists, masked NIC, status/HTTP codes, all six grades and mixed required-subject combinations, missing grades, unknown/invalid/oversized requests, draft/ready/published/unpublished/archived visibility. Same route instance verifies visibility immediately after unpublish.
- Examination create/edit/archive persisted values; student create/update/delete; duplicate index/NIC constraints; subject create/update/reorder/toggle/delete and retrieval; stored audit events.
- Grade insert/update/removal, invalid or unknown references, database uniqueness/check/foreign-key constraints and cross-examination trigger, published write lock and persisted public status.
- CSV preview through the real import parser and DB-backed subject/student validation, confirmed import persistence, duplicate/invalid row rejection, intentional existing-index upserts, and a two-row RPC failure after the first write proving no student/grade/audit partial commit remains.
- Anonymous/non-admin action denials and RLS restrictions; real admin claims/profile and access; public search needs no session.
- Fixed-clock limiter returns 429/headers after quota, fresh provider resets deterministically; captured application logs and responses are checked for identifiers/keys; health GET/method contracts.

The action's DB-backed publication validator allows incomplete grades with warnings; tests preserve that behavior. The separate pure publication report has different warning thresholds; this step does not change either policy. Imports update existing indexes by design, while duplicate rows within one submitted file are rejected. Database constraints enforce one grade per student/subject.

## Verification in this workspace

Docker is not installed/available and `.env.test` is absent. `test:integration:setup` stops at Docker preflight; `test:integration` fails closed before contacting any database. Real-database execution and its assertions remain **unverified here**. The safe mocked fallback is available, with no claim that it replaces real integration verification. Install/start Docker, run setup, then run the real suite before treating database integration as verified.

Checks completed for this change: `npm.cmd run test:unit`, `npm.cmd run test:integration:mock`, `npm.cmd run test:integration:safety`, `npm.cmd run lint`, `npm.cmd run type-check`, `npm.cmd run build`, explicit ESLint on the integration `.cjs` files (with the existing CommonJS require convention allowed), and `git diff --check` all passed. Setup and real integration were attempted and refused safely for the missing prerequisites described above. No production connection, database reset, schema change or real student-data access occurred. No unrelated application test/build failure was found.
