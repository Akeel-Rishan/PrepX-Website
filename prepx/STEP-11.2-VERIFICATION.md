# Step 11.2: Public result search

Implemented `POST /api/results/search`, shared request validation, and pure
`calculateResultStatus` / `getResultStatusStyle` helpers. The existing result
display remains the Phase 12 placeholder.

The pipeline checks publication and finds the student before running subject and
grade queries concurrently. This is four database queries per successful lookup,
with the final two in parallel. Existing schema indexes cover their filter columns.
No database migration or data changes were needed.

Database errors and thrown exceptions return a generic 500 instead of producing
an incomplete or false passing result. All responses disable caching. Missing and
unpublished exams share the same 403 response. Index takes priority over NIC.

## Verification results

Verified on 2026-09-30. TypeScript, ESLint and the production build passed.
Live API and headless Edge checks used the production server on port 3100 and
existing database records, without database mutations.

| Test | Result and evidence |
| --- | --- |
| 1. Index lookup | PASS: live HTTP 200; automated handler test checks exact response fields, active subject filtering, missing grade as null, ordering and concurrent queries. |
| 2. NIC lookup | PASS: live NIC lookup matches index lookup; both 12-digit and old-format NICs covered by automated handler tests. |
| 3. Not found | PASS: live 404 and automated generic error assertion. |
| 4. Publication | PASS: live unpublished rejection; automated tests verify DRAFT, READY, ARCHIVED and missing exams stop before student access. |
| 5. Validation | PASS: live invalid request; automated malformed JSON, absent identifiers, wrong types, invalid NIC and invalid/missing UUID checks. |
| 6. Methods | PASS: live and automated GET, PUT and DELETE return 405. |
| 7. Normalization | PASS: live lowercase/whitespace index lookup; automated lowercase old NIC and index-over-NIC priority. |
| 8. Status | PASS: pure-function tests cover all four statuses, missing-grade precedence, AB mixed with passing grades, optional failures, and no required subjects. |
| 9. Caching | PASS: live success headers; automated success/error no-cache checks. |
| 10. Browser | PASS: Edge verifies disabled Searching button, POST without URL parameters, result in sessionStorage, navigation to /results, and inline failure without navigation. |
| 11. Privacy | PASS: live response and browser storage omit full NIC; automated response allowlist, masked old/new NICs, log capture and database-failure tests. |

The checklist example `200312345678v` is invalid: old NICs have nine digits plus
V/X; modern NICs have twelve digits without a suffix. `991234567v` is the valid
lowercase example used by the tests. Existing masking retains the original length:
`200312345678` becomes `********5678`.

## Repeatable checks

Run from `prepx/`:

```powershell
npm.cmd run test:results
npm.cmd run type-check
npm.cmd run lint
npm.cmd run build
npm.cmd start -- --port 3100
```

In another terminal:

```powershell
$env:TEST_BASE_URL = 'http://127.0.0.1:3100'
npm.cmd run test:results:live
# Requires playwright-core and Microsoft Edge. PLAYWRIGHT_MODULE may point
# to an external playwright-core installation to avoid a project dependency.
node scripts/test-result-search-browser.cjs
```

The live scripts read the configured Supabase project and require existing fixtures.
They do not print result bodies, identifiers or credentials. The logic suite uses
mock database responses, including a barrier proving both final queries start
before either resolves. It is also included in `npm run test:logic`.

For manual curl checks, replace `EXAM_UUID` with a published exam UUID and use an
existing test student's index/NIC. Run these examples in Bash:

```bash
curl -i http://localhost:3100/api/results/search
curl -i -X POST http://localhost:3100/api/results/search \
  -H 'Content-Type: application/json' \
  -d '{"examinationId":"EXAM_UUID","indexNumber":"OL2026001"}'
curl -i -X POST http://localhost:3100/api/results/search \
  -H 'Content-Type: application/json' \
  -d '{"examinationId":"EXAM_UUID","nicNumber":"200312345678"}'
```

Rate limiting remains explicitly deferred to Phase 13 as requested. The endpoint
must have that protection before public production deployment. No load test or
database query-plan benchmark was performed in this step.
