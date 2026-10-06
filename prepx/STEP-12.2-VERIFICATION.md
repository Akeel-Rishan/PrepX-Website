# Phase 12, Step 12.2 — Print / Save as PDF

Implemented and verified on 6 October 2026. This report supersedes the earlier two-button/colored-print implementation.

## Implementation

- Replaced “Print Result” and “Download PDF” with one secondary **Print / Save as PDF** action, using the existing shared `Button` component. Its click handler calls `window.print()` directly. Keyboard focus, a 44px minimum target, accessible visible name and a linked explanation are included.
- The explanation accurately describes the browser dialog and its “Save as PDF” destination. There is no direct-download claim, timer or PDF service.
- Reworked the existing global print CSS for A4 portrait with 14mm margins, white paper, dark text, bordered cells, monochrome grade badges and a clear status panel. No forced color adjustment or background graphics are required.
- Print hides navigation, links, buttons, helpers, the screen summary, decorative backgrounds, particles and orbital effects. Animations and transitions stop while printing. Screen result styling remains unchanged outside the action area.
- The print header shows PrepX and the result year, the actual API examination name/year, “Organized by UGSM,” the result title and the existing Colombo print timestamp. The existing result notice remains. The footer now contains the portal name only.
- Student details and status remain together. Long grade tables can flow across pages, individual rows avoid splitting, and column headers repeat. The outer document can split rather than forcing oversized results off the page.
- The public result contract, API, database, server status rules and in-memory handoff are unchanged. No result storage, extra student fields, runtime libraries or server PDF generation were added.
- A no-JavaScript notice replaces the permanent loading message when scripting is disabled.

## Files changed

1. `src/app/globals.css`
2. `src/app/(public)/results/_components/print-actions.tsx`
3. `src/app/(public)/results/_components/print-header.tsx`
4. `src/app/(public)/results/page.tsx`
5. `scripts/test-result-display.cjs`
6. `scripts/test-result-display-browser.cjs`
7. `scripts/test-result-print-browser.cjs`
8. `STEP-12.2-VERIFICATION.md`

## Checks executed

Passed:
- `npm.cmd run type-check`
- `npm.cmd run lint`
- `npm.cmd run test:logic` (the full existing suite, including result component/privacy tests)
- `npm.cmd run test:results:display`
- `npm.cmd run build` (rerun after final print fixes; includes lint/type checks)
- `npm.cmd run test:results:browser`
- `node scripts/test-result-print-browser.cjs` (rerun after final print fixes)
- `git diff --check`

Browser tests used a local production build, headless Microsoft Edge and the existing external playwright-core installation. The home page read the existing published examination; edge-case result responses were intercepted with deterministic test fixtures. No database writes were performed.

### Required print tests

| Test | Result |
| --- | --- |
| 1. Button on valid result | Passed |
| 2. No button on not-found/not-published | Passed; also absent in loading, empty and generic error states |
| 3. Calls `window.print()` | Passed through click and keyboard Enter with a print spy |
| 4. Accessible name | Passed; visible name and associated explanatory text |
| 5. Full NIC never rendered/printed | Passed: unmasked payload rejection, sanitized DOM and extracted PDF text |
| 6. Marks/totals/averages/ranks absent | Passed: injected private-field sentinels absent from rendered/printed content |
| 7. All supported grades visible | Passed: A/B/C/S/W/AB and meanings remain visible in monochrome |
| 8. Overall status visible | Passed for all four server statuses |
| 9. Optional center | Passed with and without a center |
| 10. Null/missing grades | Passed: em dash and “Not available,” without an empty badge border |
| 11. Existing result behavior | Passed: handoff, no persistence, duplicate-submit guard, errors and refresh/back behavior |

Additional browser checks passed at 320, 375, 768 and 1280px, in light and dark modes. Tests cover focus, touch target size, no overflow, restoration of screen styles after print media, hidden controls/decorations, stopped animation, no hydration errors and the no-JavaScript fallback.

### Generated PDF verification

With background graphics disabled:
- Light and dark themes each generated **one A4 page** for eight subjects, including an optional center and missing grades.
- PDF page dimensions were verified against A4 (approximately 595.28 × 841.89 points).
- Extracted text retained the exact masked NIC, student details, all grade meanings, status and organizer. Full NIC/private-field sentinels, buttons and helper text were absent.
- A 60-subject fixture generated four pages. Every subject appeared exactly once; table headers repeated on each table page; status and footer appeared at the end.
- Actual PDF pages were rasterized and visually inspected: margins, borders, headings, complete grade labels, em dashes, student details and status were readable without clipping. A continuation page was inspected for repeated headings and clean row breaks.

PDF readers/renderers (`pypdf` and `pypdfium2`) were installed only under the OS temporary directory for verification. They are not application dependencies and are not used to generate application PDFs. Test PDFs/screenshots are under `%TEMP%\prepx-print-verification`.

To regenerate browser artifacts, point `PLAYWRIGHT_MODULE` to playwright-core, `TEST_BASE_URL` to the running local app, and optionally `PREPX_PRINT_ARTIFACTS` to a test-output directory, then run `node scripts/test-result-print-browser.cjs`.

## Manual verification results and remaining checklist

Visual inspection of actual generated PDF pages: **passed**.
Native interactive browser print dialog, destination selection, Save button and Ctrl+P/Cmd+P interaction: **not manually exercised**. Headless PDF generation and the print-call spy verify different parts of that flow and do not replace these manual steps.

Remaining native-dialog check:
1. Search for a valid published result, then click **Print / Save as PDF**.
2. Confirm the native dialog opens; select **Save as PDF**, A4 and default scale. Disable background graphics to confirm monochrome readability. Browser-generated headers/footers can be disabled for a clean document.
3. Verify the masked NIC, student details, optional center, grades and overall status; confirm there are no controls, navigation or decorations.
4. Save and open the PDF; compare it to the preview.
5. Close the dialog and confirm the mobile page is unchanged. Also exercise Ctrl+P/Cmd+P.
6. Confirm not-found and not-published pages have no print action (already covered by automated tests).

## Assumptions and later work

- The repository uses Next.js 15.5.26 App Router, so its existing conventions were retained.
- “UGSM” is the organizer supplied in this request. The examination name/year remain server-provided rather than hard-coded.
- Phase 12.1's result handoff is client-only and memory-only. A full result cannot be loaded with JavaScript disabled before navigation without changing that architecture. This step provides an honest no-JavaScript fallback; full no-JavaScript lookup/rendering would require a separate handoff design.
- No server PDF generation or additional PDF feature is needed for this step. Native-dialog manual confirmation remains as described above.
