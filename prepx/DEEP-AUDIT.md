# Correctness and loading audit — 2026-09-30

## Scope

Inventoried 149 TypeScript/TSX source files and 860 function-like AST nodes
(including inline callbacks). TypeScript and lint cover the source tree. Manual
review concentrated on authentication, public search, import parsing/validation,
admin mutations, publication rules, data queries/caches, pagination, navigation,
and grade/review UI state. This is not a claim that every callback has exhaustive
behavioral test coverage or that the application is free of defects.

Previous Step 11.2 and stale-session changes were preserved. The table below
describes this audit's additional changes.

## Findings fixed

| Finding | Correction |
| --- | --- |
| ExcelJS CSV coercion removed leading zeros and converted date-like text | Explicit text mapping preserves index, NIC, school and centre values. Regression tests include leading zeros and date-shaped names. |
| Public error lookup accepted inherited object properties such as `constructor` | Only own error-code properties are accepted; unknown codes return a generic string. |
| Short malformed NIC values were returned unmasked | Values with four or fewer characters are entirely masked. |
| Malformed grade-change arrays could throw on null entries | Validate each record before property access and return a generic validation error. |
| Admin publication status disagreed with public status | Both use the pure status calculator: missing required grades take precedence, and absence depends on required subjects. |
| Sidebar treated detail pages as if they were already at the list URL | Only an exact current URL suppresses navigation. Hover/focus starts route prefetching. |
| Dependent cached views could survive mutations | Examination changes invalidate cached student views; student/subject mutations invalidate grade-related caches and counts. Student queries also declare their examination dependency. |
| AI provider exceptions could disclose provider request details in logs | Log a fixed failure category rather than the raw exception message. |
| Failed audit compensation was described as successfully cancelled | Mutation failures now state that rollback was attempted and refresh affected caches, without promising that compensation succeeded. |
| Grade query failures could appear as an empty examination and be cached | The snapshot throws on query errors; the page displays an error instead of an empty grid. Failed snapshots are not cached as successful data. |
| Non-finite/fractional grade/review pagination was not normalized | Shared helpers enforce finite integer page/page-size bounds. |
| Review could label an empty optional-only record “Complete” | The missing-subject cell now says “No grades entered.” |

## Loading changes

- Grade entry and review share a 30-second examination snapshot, invalidated by
  normal result/student/subject mutations. Pagination and search no longer fetch
  the same examination again for each new filter combination.
- Students, active subjects and grades begin loading concurrently. Grades use a
  join scoped to the examination instead of sequential requests per 100 students.
- Explicit pagination preserves records beyond Supabase's default row cap.
- Grade/review examination dropdowns fetch options instead of student counts and
  full examination rows.
- Public publication checks and result lookups remain live; no public result
  response or administrator authorization decision was put in a shared cache.

The snapshot contains only the student fields needed by grade/review pages; NICs
are excluded. For very large examinations, database aggregation and pagination
would be a further architectural step: the overview still loads an examination
into server memory. Direct SQL changes may remain cached for up to the TTL; normal
application mutations invalidate the cache immediately.

## Measurements

Local production build, Edge, configured remote Supabase project. Three samples
per scenario. Temporary benchmark administrators were deleted after each run.

### Browser navigation medians

| Page | Before | After |
| --- | ---: | ---: |
| Dashboard | 330 ms | 308 ms |
| Students | 284 ms | 279 ms |
| Examinations | 206 ms | 269 ms |
| Grade entry, selected exam | 466 ms | 476 ms |
| Review, selected exam | 412 ms | 420 ms |

These warmed measurements are mixed: they do not establish a uniform browser
speedup. Database/network variability and only three samples limit conclusions.
The first three routes use sidebar navigation; selected-exam routes use document
navigation consistently before and after. Timing ends at the page-ready element,
not its loading skeleton. First-load shared JavaScript remains about 103 kB.

### Grade data loader comparison

Read-only comparison against the pre-audit loader in Git HEAD, using the same
60-student examination. Three rounds alternate old/new order and assert exact
equality of the returned grades, pagination and completion summaries.

| Scenario | Before | After |
| --- | --- | --- |
| Cold load, median | 1,237 ms; normally 5 requests | 968 ms; normally 3 requests |
| New page | 5–6 network attempts | 0 database requests while snapshot is cached |
| New search | 5 requests | 0 database requests while snapshot is cached |

Transient retries produced a 2,807 ms new-loader outlier and extra network
attempts. Cold loading therefore still depends on remote database reliability.
The loader benchmark uses an in-memory cache stand-in to compare query work;
its sub-millisecond cached calculations are not browser navigation timings and
exclude authentication and rendering. The production browser measurements above
exercise the real Next cache.

A separate synthetic regression covers 1,005 students and 2,105 grade rows:
six paginated reads initially, with no additional reads for subsequent grade
pages/searches and review. It checks active-subject filtering, full counts,
examination scoping, pagination boundaries, failed-read recovery and masking.

Raw measurements: `node_modules/.cache/prepx-performance/audit-before.json`,
`audit-after.json`, and `grade-data-audit.json`.

## Validation

- `npm run type-check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed, including its TypeScript and lint checks.
- `npm run test:logic`: all 17 scripts passed, including new large-dataset tests.
- Additional audit/rollback regression: passed for both successful and failed compensation.
- Live public search: index/NIC lookup, normalization, publication rejection,
  validation, method restrictions, masking, no-cache and not-found checks passed.
- Headless Edge public search: loading indicator, session storage, navigation and
  inline failure passed.
- Authenticated browser checks: student detail-to-list navigation, five admin
  routes at 390px mobile width without page overflow, and no runtime errors passed.

## Reproduction and limits

Use `npm run build` followed by `npm start` to assess normal loading speed.
Development-mode first visits include route compilation. Do not build and run
the development server against the same `.next` directory concurrently.

`scripts/measure-navigation.cjs LABEL` needs Edge and playwright-core (or an
external installation specified by `PLAYWRIGHT_MODULE`), database access and a
running server. `TEST_BASE_URL` can specify its URL. It creates and deletes a
temporary administrator. `scripts/measure-grade-data.cjs` performs only reads;
its “before” reference is the repository's current Git HEAD and will change after
this audit is committed.

No production deployment, load/concurrency test, schema migration or changes to
existing examination records were performed. Future-phase result display and
distributed rate limiting remain unfinished as previously scoped. This audit
does not certify simultaneous publication/edit transactions as atomic.

The hover/focus prefetch approach follows the [Next.js prefetching guidance](https://nextjs.org/docs/app/guides/prefetching).
