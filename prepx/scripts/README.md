# Unit tests

Run `npm test` from `prepx` (`npm.cmd test` in Windows PowerShell). It runs the existing `test:logic` chain using Node's `assert/strict` and the existing TypeScript module loader; no new framework or dependencies. The wrapper removes deployment/provider settings from child processes and preloads a network guard. Accidental real fetch/HTTP/socket access fails. Individual tests may replace external transports with in-memory fakes. No `.env` file or real student dataset is loaded by the suite.

`npm run test:validators` runs the four Phase 15.1 groups directly:

- `test-validators.cjs`: field schemas, normalization, UUIDs, exact length limits, malformed types, multilingual/NFC text, markup/control/formula rejection, FormData UTF-8 limits, search and masking helpers.
- `test-grade-logic.cjs`: exact six grades/meanings, nullable removal, exhaustive two-required/one-optional grade combinations, status precedence, configurable requirements and public/admin parity.
- `test-import-publication-rules.cjs`: duplicate identifiers, first occurrence, partial summaries, warnings versus errors, headers, publication thresholds/rounding, coverage and inconsistent records.
- `test-public-result-rules.cjs`: calls the route directly with in-memory Request objects, mocked Supabase/limiter and real status logic; tests normalized lookup, publication gates and public allowlists. No HTTP request is sent.

Existing grade/import/publication action tests additionally cover batch limits, last duplicate update wins, normalization/removal, invalid/missing examination references and all state transitions. Test NICs added in this phase use zero-filled format-only strings, never real student identifiers. Publication timestamps are fixed in the new pure tests.

Business rules deliberately preserved: mixed AB/passing required grades pass; all required AB grades mean Absent; missing required grades win over W; optional W does not fail a result; no required subjects with any recorded grade means Passed. Publication warns through `ceil(studentCount * 0.1)` incomplete students and blocks above that threshold. Import missing required grades are warnings; duplicate file identifiers are errors; existing database identifiers generate update warnings. Readiness of an already-published exam is separate from permission to publish it again.

`test:db`, `*:live` and `*:browser` are opt-in operational checks, excluded from `npm test`. Build is a separate Next.js check and may load local build configuration; it is not part of the offline unit suite.
