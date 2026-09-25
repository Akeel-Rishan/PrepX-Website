# Step 5.1 verification

The configured Supabase database contains 60 students after running the existing dashboard seed and the new repeatable student seed. Existing records were preserved.

Validation:
- npm run type-check: passed.
- npm run lint: passed, no warnings or errors.
- npm run build: passed.
- node scripts/test-students.cjs: passed against the seeded database.

Requested checklist (automated checks are not browser visual confirmation):

| Test | Result |
| --- | --- |
| 1 Default list | Real query returns 25 of 60; rendered summary is Showing 1–25 of 60. |
| 2 Pagination | Queries return 25/25/10 distinct rows; all three summaries and URL parameter preservation pass. Out-of-range pages recover to page 3. Browser clicks remain unverified. |
| 3 Search | Name and school search queries pass; index search passes in combined filters. Browser debounce timing remains unverified. |
| 4 Examination | Query filters by examination; examination-scoped schools verified. Dropdown interaction remains unverified. |
| 5 School | Royal College filtering passes. Dropdown interaction remains unverified. |
| 6 Combined / Clear | Combined search/examination/school query passes. Clear interaction remains unverified. |
| 7 NIC | Rendered student table HTML contains no full NIC values. |
| 8 Add | Empty-state Add link verified in rendered HTML; new route handled by detail placeholder. Browser navigation remains unverified. |
| 9 Manage | Each rendered row has its student-specific Manage URL. Browser navigation remains unverified. |
| 10 Mobile | Responsive classes and horizontal table overflow implemented; visual check remains pending. |

No browser automation tool was available in this session, so tests 1–10 are not claimed as fully visually verified.

Seed alternatives: run scripts/seed-students.ts with tsx, or run supabase/seeds/students.sql in the Supabase SQL Editor. Both preserve existing students on reruns. The published 2026 examination must exist first.
