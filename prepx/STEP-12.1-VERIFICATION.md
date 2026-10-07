# Phase 12, Step 12.1 — Public result display

Implemented and verified on 6 October 2026.

## Result and privacy behavior

The public result page renders the existing `PublicStudentResult` contract: student name, index, masked NIC, school, examination/year, optional center, subject-grade meanings and the server-returned overall status. It adds a navy summary, published indicator, semantic student details/table/status sections, light/dark treatments and narrow-screen layouts. Existing public header, footer, theme controls, background effects and browser print/PDF support remain.

The previous sessionStorage handoff has been replaced with a public-layout React provider. The successful POST response is validated, unexpected fields are stripped, and the result is held only in memory across client navigation. No lookup/result query parameters or persistent result storage are used. Legacy `prepx_result` keys are removed without reading their contents. Starting another search, leaving the result route or leaving the page clears the result. Refreshing, opening a new tab, or directly visiting `/results` offers a new search.

A value in `maskedNic` must actually be masked; full NIC values fail validation. Null/missing grades become “Not available.” Unknown grades/statuses and malformed payloads show a generic search error. The UI does not calculate result status. The sole response contract subtraction is `grades[].subjectId`, removed from the API and public GradeEntry type to avoid disclosing internal database IDs. Public subject codes and display order remain unchanged.

Not-found and not-published responses use the existing generic routes. Publication is still checked on the server before student lookup. Other errors remain generic and retryable. Duplicate submissions are blocked synchronously and pending requests are aborted on unmount.

## Files changed

Application:
- `src/app/(public)/results/page.tsx`
- `src/app/(public)/results/_components/result-details.tsx` (new reusable grade badge, table and status card)
- `src/app/(public)/results/_components/print-actions.tsx` (keyboard focus and hint contrast)
- `src/app/(public)/_components/search-form.tsx`
- `src/app/(public)/layout.tsx`
- `src/components/public/result-provider.tsx` (new in-memory handoff)
- `src/lib/validations/public-result.ts` (new public response validation)
- `src/app/api/results/search/route.ts` (remove internal subject IDs only)
- `src/types/index.ts`
- `src/app/globals.css` (preserve print styling for semantic row headers/new headings)

Tests and documentation:
- `package.json` (test commands)
- `scripts/fixtures/public-result.cjs` (deterministic test-only data based on the existing dashboard seed)
- `scripts/test-result-display.cjs`
- `scripts/test-result-display-browser.cjs`
- `scripts/test-result-search.cjs`
- `scripts/test-result-search-browser.cjs`
- `scripts/test-result-print-browser.cjs`
- `STEP-12.1-VERIFICATION.md`
- `STEP-12.2-VERIFICATION.md` (note superseding its old storage description)

## Checks executed

All passed:
- `npm.cmd run type-check`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run test:logic` (existing full logic suite)
- `node scripts/test-result-display.cjs` (also included in test:logic going forward)
- `npm.cmd run test:results:browser` (new display browser suite plus print regression suite)
- `node scripts/test-result-search-browser.cjs` (live search and navigation)
- `npm.cmd run test:results:live` (read-only live endpoint checks)
- `git diff --check`

The component tests cover valid results, optional centers, masked NICs, all six grades, all four server statuses with identical grades, missing/null grades, empty grade lists, malformed payloads, forbidden-field exclusion, loading, empty handoff, semantic tables/status and both feedback routes.

Edge browser checks cover in-memory handoff, no persisted result, legacy cleanup, duplicate submissions, refresh/back behavior, error routes, retry availability, 320/375/768/1280 widths in light/dark themes, table roles and keyboard focus. Light desktop and dark mobile screenshots were visually inspected. Browser edge cases use intercepted test responses; live tests separately exercised the actual API with existing published data. No database writes or seed changes were performed. The initial sandboxed server could not reach Supabase; the checks passed using a network-enabled local production server on port 3001.

Print regression tests passed for header/timestamp, action visibility, PDF tip timing, grade colors, table borders, footer/notice and a one-page eight-subject A4 PDF in both themes.

## Assumptions and Phase 12.2

- The repository actually uses Next.js 15.5.26 App Router; its established architecture was retained.
- `StudentResult` is a database row type here; `PublicStudentResult` is the correct public contract.
- Refresh requires a new search because persistent storage is explicitly prohibited. No result-retrieval endpoint or cookie-based session was introduced.
- The displayed examination name/year come from the server rather than a hard-coded examination title.
- Phase 12.2 print/PDF implementation already exists and remains functional. Native print-dialog interaction, Ctrl+P/Cmd+P and manually saving the browser PDF still require manual verification. No server-side PDF generation was added.
