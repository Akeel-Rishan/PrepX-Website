# Step 5.2 verification

## Automated checks

- TypeScript: passed.
- ESLint: passed with no warnings or errors.
- Production build: passed (network access required for the existing Google Fonts import).
- Server-action and schema tests: passed (node scripts/test-student-actions.cjs).
- Edge browser flow tests: all 10 passed (node scripts/test-student-form.cjs).

Browser testing used a temporary admin and a temporary examination, students, and grades. Those fixtures were removed afterward. Immutable test audit records were retained; the existing seeded students were not edited or deleted.

| Requested test | Verified |
| --- | --- |
| 1 Create | Blank optional NIC accepted, index normalized, student persisted, redirect to populated edit page. |
| 2 Validation | Empty required fields, invalid index spaces, invalid NIC; 12-digit and old-format NIC accepted. |
| 3 Duplicate index on create | Friendly field error; other entered values retained. |
| 4 Edit | Read-only examination, saved school change, success alert auto-dismisses after five seconds. |
| 5 Duplicate index on edit | Friendly field error. |
| 6 Delete with grades | Published examination disables deletion; draft dialog warns; cancel preserves student; confirm deletes student and cascades grades, then redirects. |
| 7 Delete without grades | No grade warning; cancellation and permanent deletion both verified. |
| 8 Grade badge | One grade entry shown after adding a test grade. |
| 9 Audit | STUDENT_CREATED, STUDENT_UPDATED, STUDENT_DELETED recorded with correct student ID and masked NIC snapshots. |
| 10 Invalid ID | Invalid UUID displays the not-found page. |

Additional direct action checks verify unauthenticated and non-admin rejection, malformed IDs, examination tampering, missing students, server-side published-examination deletion rejection, both duplicate-constraint messages, and redirect behavior. A 375px browser viewport showed no document overflow.

## Required database migration

Apply supabase/migrations/002_student_nic_uniqueness.sql using the Supabase SQL Editor. The original schema only has a non-unique NIC lookup index. Until this migration is applied, duplicate NICs are not guaranteed to be rejected by the database.

The migration creates a per-examination unique index for nonblank NICs, normalizing case and surrounding whitespace. It does not delete existing data. Existing duplicate NICs cause the migration to fail for review.

The NIC constraint error mapping passed the action tests; the live NIC constraint test confirmed the migration is not yet active. After applying it, run node scripts/test-student-nic-constraint.cjs.

## Test commands

- npm run type-check
- npm run lint
- npm run build
- node scripts/test-student-actions.cjs
- node scripts/test-student-form.cjs (requires running dev server, Supabase credentials, installed Edge, and playwright-core)

Temporary browser tooling was installed without changes to package.json or package-lock.json. Install it for future runs with:
npm install --no-save --package-lock=false playwright-core

React 18 uses useFormState/useFormStatus here. The examination and form routes retain Next.js 14 prop conventions.

