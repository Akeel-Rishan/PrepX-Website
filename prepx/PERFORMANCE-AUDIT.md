# PrepX loading and navigation investigation

Measured on 2026-09-25 against the configured Supabase project, with Edge at 1280 × 900. Changes preserve the existing Step 5.2 work.

## Findings and fixes

| Finding | Why it mattered | Change |
| --- | --- | --- |
| Inter downloaded from Google during compilation | The reported retries delayed first compilation by tens of seconds and could fail builds when offline. | Bundle the licensed Inter 4.1 WOFF2 file and use next/font/local. Tailwind uses the same font variable. |
| Remote auth.getUser calls in both middleware and the protected layout | Each call requires an Auth network round trip before the route is ready. | Use auth.getClaims to verify signed tokens with cached public keys. Keep fresh admin-profile checks in both layers and independent mutation authorization. |
| Admin authentication middleware also covered public pages and unrelated requests | Signed-in visitors paid session-processing overhead even outside the admin area. | Restrict the matcher to /admin/:path*, including admin paths with extensions. |
| Examination counts downloaded students' examination IDs | Two serial requests, unnecessary data transfer, and undercounting beyond the default row cap. | Fetch examinations and embedded students(count) together in one database query. |
| Student dropdowns invoked the full examination/count query | A dropdown only needs id, name, and year. | Add a small dedicated examination-options query. |
| School names were scanned for every student page/search request | The same mostly unchanged list was repeatedly downloaded and deduplicated. | Cache school and examination options for 60 seconds; student save/delete invalidates the lookup cache immediately. |
| Student detail was requested by both metadata and the page | Could repeat the same lookup during one server render. | Use request-scoped React cache for getStudentById. |
| No route loading boundary or click feedback | The old tab appeared stuck until server rendering completed. | Add the admin loading skeleton and immediate pending indicator in the sidebar. Modified clicks still open tabs normally. |

These changes require no new SQL migration.

## Before/after browser measurements

Medians of three warmed navigations per route on the development server. Each iteration reloads the Subjects origin page to avoid timing a previously cached client-side route. Timing ends when the destination page heading appears, not when its loading skeleton appears.

| Destination | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Dashboard | 3,619 ms | 1,897 ms | 47.6% |
| Students | 3,927 ms | 2,078 ms | 47.1% |
| Examinations | 3,452 ms | 1,844 ms | 46.6% |

This is a small local sample, not a production SLA. The before and after runs used the same machine, dataset, browser, and benchmark, but the development server restarted between them. Supabase/network latency and background system activity vary.

The project uses ES256 tokens. An isolated remote getUser call took 317–331 ms and one network request. A warmed getClaims call took 2 ms and zero network requests. The first getClaims call still fetches signing keys; the SDK handles key caching and falls back to remote verification for symmetric tokens.

Raw, non-sensitive measurements are saved under node_modules/.cache/prepx-performance/. Reproduce with node scripts/measure-navigation.cjs LABEL while the server is running.

## Production measurements

The optimized build started in 1.5 seconds. With the same benchmark and three warmed samples per route:

| Destination | Production median |
| --- | ---: |
| Dashboard | 1,228 ms |
| Students | 1,176 ms |
| Examinations | 1,140 ms |

These production results are shown separately from the development before/after comparison. They reflect the local server and configured remote database, not a deployed service guarantee.

## Validation

- Production build passed in the network-restricted environment, with no Google Fonts downloads.
- TypeScript passed.
- ESLint passed without warnings or errors.
- Student action tests passed.
- Existing student search, pagination, masking and detail tests passed.
- Embedded examination counts match independent exact database counts.
- All ten student browser flow tests passed again.
- Saving a new school immediately updates the cached school dropdown.
- Auth tests passed for signed-out users, non-admin users, forged JWTs, valid admins, and immediate admin membership revocation.
- Temporary test users, examinations, students and grades were cleaned up; immutable test audit entries remain.

## Remaining sources of latency

Development mode still compiles routes on their first visit and runs development tooling. In the after run, the first Dashboard compile took 19.1 seconds; warmed routes were much faster. This is separate from the removed Google Fonts retries. Use a production build to assess normal deployment speed.

Admin membership and live student data still require database requests. User/profile authorization is not shared in a long-lived cache. The school/options cache can briefly serve older lookup data after direct SQL changes; normal student actions invalidate it immediately.

The first uncached school-options lookup still reads schools in batches. For a much larger student dataset, a database DISTINCT query/view would further reduce that cold lookup; it was not identified as the main cause with the current 60 seeded students.

The webpack “Serializing big strings” messages are cache-performance warnings, not failed page requests. They remained during verification and should not be confused with the fixed font-download errors.

## Running the app

For editing:
npm run dev

For production-style speed testing, stop the development server first:
npm run build
npm start

Do not run next build and next dev concurrently against the same .next directory.

## References

- Next.js 14 font loading: https://nextjs.org/docs/14/app/building-your-application/optimizing/fonts
- Next.js 14 loading boundaries: https://nextjs.org/docs/14/app/building-your-application/routing/loading-ui-and-streaming
- Next.js 14 navigation and prefetching: https://nextjs.org/docs/14/app/building-your-application/routing/linking-and-navigating
- Supabase signed-claims verification: https://supabase.com/docs/reference/javascript/auth-getclaims
- Supabase embedded relation queries: https://supabase.com/docs/guides/database/joins-and-nesting
- Inter 4.1 font source and license: https://github.com/rsms/inter/tree/v4.1

